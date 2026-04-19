const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Company = require('../models/company.model');
const pool = require('../config/db');

const register = async (req, res) => {
  try {
    console.log('register called');
    let { name, email, password } = req.body;
    if (email) email = email.toLowerCase().trim();

    const role = 'client';

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ name, email, password: hashedPassword, role });

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createAdminUser = async (req, res) => {
  try {
    let { name, email, password, role } = req.body;
    if (email) email = email.toLowerCase().trim();

    const allowedRoles = ['admin', 'manager'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        message: `Invalid role. This endpoint only creates: ${allowedRoles.join(', ')}.`
      });
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'A user with that email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = await User.create({ name, email, password: hashedPassword, role });

    if (role === 'manager') {
      await Company.create({ name: `${name}'s Company`, email, manager_id: userId });
    }

    res.status(201).json({ message: `${role} account created successfully`, userId });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const login = async (req, res) => {
  try {
    let { email, password } = req.body; // Ignore requested role
    if (email) email = email.toLowerCase().trim();

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        message: 'Your account has been suspended. Please contact support.'
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile_pic: user.profile_pic,
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const logout = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(400).json({ message: 'No token provided' });
    }

    const decoded = jwt.decode(token);
    const expiresAt = decoded && decoded.exp
      ? new Date(decoded.exp * 1000)   // exp is Unix seconds → ms
      : new Date(Date.now() + 24 * 60 * 60 * 1000); // fallback: +24 h

    await pool.query(
      'INSERT INTO token_blacklist (token, expires_at) VALUES ($1, $2)',
      [token, expiresAt]
    );

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    let { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and new password are required' });
    }

    email = email.toLowerCase().trim();

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updated = await User.updatePassword(email, hashedPassword);

    if (updated) {
      res.json({ message: 'Password updated successfully' });
    } else {
      res.status(500).json({ message: 'Failed to update password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { register, createAdminUser, login, logout, getMe, resetPassword };
