const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

async function register(req, res, next) {
  try {
    const { full_name, email, password, role } = req.body;

    // 1. Validation
    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }
    if (!email || !email.trim() || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }
    const cleanRole = (role || 'RECIPIENT').toUpperCase();
    if (!['PROVIDER', 'RECIPIENT'].includes(cleanRole)) {
      return res.status(400).json({ success: false, message: 'Role must be either PROVIDER or RECIPIENT.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 2. Check for duplicate email
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please log in.'
      });
    }

    // 3. Hash password securely
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Insert user
    const [result] = await pool.query(
      'INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [full_name.trim(), cleanEmail, passwordHash, cleanRole]
    );

    const newUserId = result.insertId;

    // 5. Generate JWT token
    const token = jwt.sign(
      { id: newUserId, email: cleanEmail, role: cleanRole },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      message: 'Account registered successfully!',
      data: {
        token,
        user: {
          id: newUserId,
          full_name: full_name.trim(),
          email: cleanEmail,
          role: cleanRole
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are both required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Fetch user by email
    const [rows] = await pool.query(
      'SELECT id, full_name, email, password_hash, role, created_at FROM users WHERE email = ?',
      [cleanEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const user = rows[0];

    // 2. Compare password hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // 3. Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful!',
      data: {
        token,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          created_at: user.created_at
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res) {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.'
  });
}

async function getMe(req, res) {
  res.status(200).json({
    success: true,
    data: req.user
  });
}

module.exports = { register, login, logout, getMe };
