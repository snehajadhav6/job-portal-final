const express = require('express');
const router = express.Router();
const proctoringController = require('../controllers/proctoring.controller');

const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');


router.post('/start-session', proctoringController.startSession);

router.post('/report-violation', proctoringController.reportViolation);


router.post('/send-warning', authMiddleware, roleMiddleware('admin', 'manager'), proctoringController.sendWarning);
router.post('/terminate-interview', authMiddleware, roleMiddleware('admin', 'manager'), proctoringController.terminateInterview);
router.get('/live-candidates', authMiddleware, roleMiddleware('admin', 'manager'), proctoringController.getLiveCandidates);
router.get('/session-summary/:candidateId', authMiddleware, roleMiddleware('admin', 'manager'), proctoringController.getSessionSummary);

module.exports = router;
