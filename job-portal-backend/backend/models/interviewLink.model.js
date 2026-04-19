const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class InterviewLink {
  /**
   * Invalidates all unused (active) interview links for the given user,
   * then creates a fresh one. This prevents duplicate valid links.
   */
  static async createForUser(userId) {
    await pool.query(
      `UPDATE interview_links
       SET is_used = TRUE
       WHERE user_id = $1
         AND is_used = FALSE`,
      [userId]
    );

    for (let attempt = 0; attempt < 3; attempt++) {
      const token = uuidv4();
      try {
        const { rows } = await pool.query(
          `INSERT INTO interview_links (token, user_id, expires_at)
           VALUES ($1, $2, NOW() + INTERVAL '1 day')
           RETURNING token, user_id, is_used, expires_at, created_at`,
          [token, userId]
        );
        return rows[0];
      } catch (err) {
        if (err && err.code === '23505' && attempt < 2) continue;
        throw err;
      }
    }
    throw new Error('Unable to generate unique interview token');
  }

  static async getLatestForUser(userId) {
    const { rows } = await pool.query(
      `SELECT *
       FROM interview_links
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  }

  static async markUsed(token) {
    await pool.query(
      `UPDATE interview_links
       SET is_used = TRUE
       WHERE token = $1`,
      [token]
    );
  }

  static async findValidByToken(token) {
    const { rows } = await pool.query(
      `SELECT *
       FROM interview_links
       WHERE token = $1
         AND is_used = FALSE
         AND (expires_at IS NULL OR expires_at > NOW())
       LIMIT 1`,
      [token]
    );
    return rows[0] || null;
  }
}

module.exports = InterviewLink;
