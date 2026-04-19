const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const authMiddleware = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    try {
      const { rows } = await pool.query(
        'SELECT id FROM token_blacklist WHERE token = $1 LIMIT 1',
        [token]
      );
      if (rows.length > 0) {
        return res.status(401).json({ message: 'Token has been invalidated. Please log in again.' });
      }
    } catch (dbErr) {
      if (dbErr.code === '42P01') {
        console.warn('[authMiddleware] token_blacklist table not found — skipping blacklist check. Run the migration to enable logout invalidation.');
      } else {
        console.error('[authMiddleware] Blacklist query error:', dbErr.message);
      }
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token.' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden. Admins only.' });
  }
  next();
};

module.exports = authMiddleware;
module.exports.adminOnly = adminOnly;