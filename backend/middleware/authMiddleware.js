const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_for_foodrescue_lite_12345';

async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in to continue.'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session. Please log in again.'
      });
    }

    const [rows] = await pool.query(
      'SELECT id, full_name, email, role, created_at FROM users WHERE id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User account not found.'
      });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access forbidden. This action requires one of the following roles: ${allowedRoles.join(', ')}.`
      });
    }

    next();
  };
}

module.exports = { authenticateToken, authorizeRoles, JWT_SECRET };
