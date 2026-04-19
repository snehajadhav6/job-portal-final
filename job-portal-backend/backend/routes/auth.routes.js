const express = require('express');
const {
  register,
  createAdminUser,
  login,
  logout,
  getMe,
  resetPassword,
} = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { adminOnly } = require('../middleware/auth.middleware');

const router = express.Router();

const { getNotifications } = require('../controllers/notification.controller');

router.post('/register', register);
router.post('/login', login);
router.post('/reset-password', resetPassword);

router.get('/me', authMiddleware, getMe);
router.post('/logout', authMiddleware, logout);           // blacklists the token
router.get('/notifications', authMiddleware, getNotifications);

router.post('/admin/create-user', authMiddleware, adminOnly, createAdminUser);

module.exports = router;
