const pool = require('../config/db');

exports.startSession = async (req, res) => {
  try {
    const { candidateId } = req.body;
    const newSession = await pool.query(
      `INSERT INTO proctoring_sessions (candidate_id, status, integrity_score, last_heartbeat)
       SELECT $1, 'ACTIVE', 100, NOW()
       WHERE NOT EXISTS (SELECT 1 FROM proctoring_sessions WHERE candidate_id = $1 AND status = 'ACTIVE')
       RETURNING id`,
      [candidateId]
    );

    let sessionId;
    if (newSession.rows.length > 0) {
      sessionId = newSession.rows[0].id;
    } else {
      const sessionResult = await pool.query(
        "SELECT id FROM proctoring_sessions WHERE candidate_id = $1 AND status = 'ACTIVE' LIMIT 1",
        [candidateId]
      );
      sessionId = sessionResult.rows[0].id;
    }

    res.status(200).json({ message: 'Session started successfully', sessionId });
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ message: 'Server error starting session' });
  }
};

exports.heartbeat = async (req, res) => {
  try {
    const { candidateId } = req.body;

    const result = await pool.query(
      `UPDATE proctoring_sessions
       SET last_heartbeat = NOW()
       WHERE candidate_id = $1
         AND status = 'ACTIVE'
       RETURNING id`,
      [candidateId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No active session found for this candidate' });
    }

    res.status(200).json({ message: 'Heartbeat recorded' });
  } catch (error) {
    console.error('Error recording heartbeat:', error);
    res.status(500).json({ message: 'Server error recording heartbeat' });
  }
};

exports.startHeartbeatMonitor = (io) => {
  setInterval(async () => {
    try {
      const result = await pool.query(
        `UPDATE proctoring_sessions
         SET status = 'TERMINATED',
             end_time = NOW(),
             termination_reason = 'HEARTBEAT_TIMEOUT'
         WHERE status = 'ACTIVE'
           AND last_heartbeat < NOW() - INTERVAL '60 seconds'
         RETURNING id, candidate_id`
      );

      if (result.rows.length > 0) {
        console.log(`[HeartbeatMonitor] Terminated ${result.rows.length} abandoned session(s).`);
        result.rows.forEach(({ id, candidate_id }) => {
          if (io) {
            io.of('/candidate')
              .to(`candidate-${candidate_id}`)
              .emit('terminate-interview', { reason: 'HEARTBEAT_TIMEOUT' });
            io.of('/admin').emit('interview-terminated', {
              candidateId: candidate_id,
              sessionId: id,
              reason: 'HEARTBEAT_TIMEOUT'
            });
          }
        });
      }
    } catch (err) {
      console.error('[HeartbeatMonitor] Error:', err.message);
    }
  }, 60_000); // every 60 seconds
};

exports.reportViolation = async (req, res) => {
  try {
    const { sessionId, violationType, candidateId } = req.body;

    const io = req.app.get('io');

    let penalty = 0;
    if (violationType === 'TAB_SWITCH') penalty = 10;
    else if (violationType === 'FACE_NOT_DETECTED') penalty = 15;
    else if (violationType === 'CAMERA_OFF') penalty = 20;
    else if (violationType === 'MULTIPLE_FACES') penalty = 25;

    await pool.query(
      "INSERT INTO violations_log (proctoring_session_id, violation_type, integrity_reduction) VALUES ($1, $2, $3)",
      [sessionId, violationType, penalty]
    );

    const updatedSession = await pool.query(
      "UPDATE proctoring_sessions SET integrity_score = GREATEST(0, integrity_score - $1) WHERE id = $2 RETURNING integrity_score",
      [penalty, sessionId]
    );

    const newIntegrity = updatedSession.rows[0].integrity_score;

    if (io) {
      io.of('/admin').emit('violation-detected', { candidateId, sessionId, violationType, newIntegrity });
      io.of('/admin').emit('integrity-score-update', { candidateId, sessionId, integrityScore: newIntegrity });

      let warningMsg = 'Warning: A proctoring violation was detected.';
      if (violationType === 'TAB_SWITCH') warningMsg = 'Warning: Navigating away from the interview tab is a violation.';
      else if (violationType === 'FACE_NOT_DETECTED') warningMsg = 'Warning: Face not detected. Please stay in front of the camera.';
      else if (violationType === 'CAMERA_OFF') warningMsg = 'Warning: Camera is turned off. Please turn it on.';
      else if (violationType === 'MULTIPLE_FACES') warningMsg = 'Warning: Multiple faces detected. Please ensure you are alone.';
      else if (violationType === 'MOBILE_DETECTED') warningMsg = 'Warning: Mobile phone detected. Please put it away.';

      io.of('/candidate').to(`candidate-${candidateId}`).emit('receive-warning', {
        message: warningMsg
      });
    }

    const violationsResult = await pool.query(
      "SELECT COUNT(*) FROM violations_log WHERE proctoring_session_id = $1",
      [sessionId]
    );
    const totalViolations = parseInt(violationsResult.rows[0].count);

    if (totalViolations >= 3) {
      return exports.executeTermination(candidateId, sessionId, 'MAX_VIOLATIONS_EXCEEDED', io, res);
    }

    res.status(200).json({ message: 'Violation reported', integrityScore: newIntegrity });
  } catch (error) {
    console.error('Error reporting violation:', error);
    res.status(500).json({ message: 'Server error reporting violation' });
  }
};

exports.sendWarning = async (req, res) => {
  try {
    const { candidateId, sessionId } = req.body;
    const io = req.app.get('io');

    const countResult = await pool.query(
      "SELECT COUNT(*) FROM warnings_log WHERE proctoring_session_id = $1",
      [sessionId]
    );
    const existingWarnings = parseInt(countResult.rows[0].count);
    const newWarningNumber = existingWarnings + 1;

    if (newWarningNumber > 3) {
      return res.status(400).json({ message: 'Max warnings already exceeded. Terminate session.' });
    }

    await pool.query(
      "INSERT INTO warnings_log (proctoring_session_id, warning_number, message) VALUES ($1, $2, $3)",
      [sessionId, newWarningNumber, "Manual warning sent by admin"]
    );

    if (io) {
      io.of('/candidate').to(`candidate-${candidateId}`).emit('receive-warning', {
        warningNumber: newWarningNumber,
        message: `Warning ${newWarningNumber}/3: Please ensure you adhere to the interview rules. The next warning may result in termination.`
      });
      io.of('/admin').emit('warning-sent', { candidateId, sessionId, warningNumber: newWarningNumber });
    }

    if (newWarningNumber === 3) {
      return exports.executeTermination(candidateId, sessionId, 'MAX_WARNINGS_EXCEEDED', io, res);
    }

    res.status(200).json({ message: 'Warning sent', warningNumber: newWarningNumber });
  } catch (error) {
    console.error('Error sending warning:', error);
    res.status(500).json({ message: 'Server error sending warning' });
  }
};

exports.terminateInterview = async (req, res) => {
  try {
    const { candidateId, sessionId } = req.body;
    const io = req.app.get('io');
    return exports.executeTermination(candidateId, sessionId, 'ADMIN_TERMINATED', io, res);
  } catch (error) {
    console.error('Error terminating interview:', error);
    res.status(500).json({ message: 'Server error terminating interview' });
  }
};

exports.executeTermination = async (candidateId, sessionId, reason, io, res) => {
  try {
    await pool.query(
      "UPDATE proctoring_sessions SET status = 'TERMINATED', end_time = CURRENT_TIMESTAMP, termination_reason = $1 WHERE id = $2",
      [reason, sessionId]
    );

    if (io) {
      io.of('/candidate').to(`candidate-${candidateId}`).emit('terminate-interview', { reason });
      io.of('/admin').emit('interview-terminated', { candidateId, sessionId, reason });
    }

    if (res) {
      return res.status(200).json({ message: 'Interview terminated', reason });
    }
  } catch (error) {
    console.error('Termination execution error:', error);
    if (res) return res.status(500).json({ message: 'Server error during termination' });
  }
};

exports.completeSession = async (req, res) => {
  try {
    const { candidateId, sessionId } = req.body;
    const io = req.app.get('io');

    await pool.query(
      "UPDATE proctoring_sessions SET status = 'COMPLETED', end_time = CURRENT_TIMESTAMP WHERE id = $1 AND candidate_id = $2",
      [sessionId, candidateId]
    );

    if (io) {
      io.of('/admin').emit('interview-completed', { candidateId, sessionId });
    }

    res.status(200).json({ message: 'Session completed successfully' });
  } catch (error) {
    console.error('Error completing session:', error);
    res.status(500).json({ message: 'Server error completing session' });
  }
};

exports.getLiveCandidates = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT 
        isess.id as session_id,
        isess.candidate_id,
        u.name as candidate_name,
        u.email,
        u.profile_pic,
        isess.status,
        isess.integrity_score,
        isess.created_at as start_time,
        isess.last_heartbeat,
        (SELECT COUNT(*) FROM violations_log WHERE proctoring_session_id = isess.id) as violation_count,
        (SELECT COUNT(*) FROM warnings_log WHERE proctoring_session_id = isess.id) as warnings_count
      FROM proctoring_sessions isess
      JOIN users u ON isess.candidate_id = u.id
      WHERE isess.status IN ('ACTIVE', 'COMPLETED')
      ORDER BY CASE WHEN isess.status = 'ACTIVE' THEN 1 ELSE 2 END, isess.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await pool.query(
      "SELECT COUNT(*) FROM proctoring_sessions WHERE status IN ('ACTIVE', 'COMPLETED')"
    );
    const total = parseInt(countResult.rows[0].count);

    res.status(200).json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Error getting live candidates:', error);
    res.status(500).json({ message: 'Server error fetching candidates' });
  }
};

exports.getSessionSummary = async (req, res) => {
  try {
    const { candidateId } = req.params;

    const sessionRes = await pool.query(
      "SELECT * FROM proctoring_sessions WHERE candidate_id = $1 ORDER BY created_at DESC LIMIT 1",
      [candidateId]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ message: 'No session found for this candidate' });
    }

    const session = sessionRes.rows[0];

    const violations = await pool.query(
      "SELECT violation_type, count(*) as count FROM violations_log WHERE proctoring_session_id = $1 GROUP BY violation_type",
      [session.id]
    );

    const warnings = await pool.query(
      "SELECT COUNT(*) FROM warnings_log WHERE proctoring_session_id = $1",
      [session.id]
    );

    const userRes = await pool.query("SELECT name FROM users WHERE id = $1", [candidateId]);

    const resultsData = await pool.query(
      "SELECT questions_asked, questions_answered, average_score, overall_score, ai_recommendation, feedback FROM interview_results WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
      [candidateId]
    );

    const aiResult = resultsData.rows[0] || {};

    res.status(200).json({
      candidateName: userRes.rows[0]?.name,
      status: session.status,
      integrityScore: session.integrity_score,
      totalViolations: violations.rows.reduce((acc, curr) => acc + parseInt(curr.count), 0),
      violationBreakdown: violations.rows,
      warningsCount: parseInt(warnings.rows[0].count),
      terminationReason: session.termination_reason,
      startTime: session.created_at,
      endTime: session.end_time,
      duration: session.end_time ? Math.round((new Date(session.end_time) - new Date(session.created_at)) / 1000) : null,
      questionsAsked: aiResult.questions_asked,
      questionsAnswered: aiResult.questions_answered,
      averageScore: aiResult.average_score,
      overallScore: aiResult.overall_score,
      aiRecommendation: aiResult.ai_recommendation,
      summary: aiResult.feedback?.summary || aiResult.feedback?.result?.summary || ''
    });
  } catch (error) {
    console.error('Error getting session summary:', error);
    res.status(500).json({ message: 'Server error getting summary' });
  }
};
