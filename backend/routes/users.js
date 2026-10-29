const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const { sendVerificationEmail } = require('../utils/sendEmail');

const router = express.Router();

// POST /api/users/register
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, username, password } = req.body;
    if (!firstName || !lastName || !email || !username || !password)
      return res.status(400).json({ error: 'All fields are required' });

    const exists = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
    if (exists) return res.status(409).json({ error: 'Email or username already taken' });

    const hashed = await bcrypt.hash(password, 10);
    const verifyToken = crypto.randomBytes(32).toString('hex');

    const user = await User.create({
      firstName, lastName, email, username,
      password: hashed,
      verifyToken,
      verifyTokenExpires: Date.now() + 24 * 60 * 60 * 1000, // 24h
    });

    // email failure shouldn't block registration
    try {
      await sendVerificationEmail(user.email, verifyToken);
    } catch (e) {
      console.error('Email failed:', e.message);
    }

    res.status(201).json({ message: 'Registered. Check your email to verify.', userId: user._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/verify/:token
// keep above /:id or "verify" gets treated as an id
router.get('/verify/:token', async (req, res) => {
  try {
    const user = await User.findOne({
      verifyToken: req.params.token,
      verifyTokenExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).send('Invalid or expired link');

    user.isVerified = true;
    user.verifyToken = undefined;
    user.verifyTokenExpires = undefined;
    await user.save();

    res.send('Email verified! You can log in now.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// POST /api/users/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    // same message for bad username or password
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: 'Invalid username or password' });

    // comment out for testing if email isn't set up
    if (!user.isVerified) return res.status(403).json({ error: 'Verify your email first' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    // strip sensitive fields before returning
    const { password: _, verifyToken, verifyTokenExpires, ...userData } = user.toObject();
    res.status(200).json({ token, user: userData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ error: 'Invalid user ID' });

    const user = await User.findById(req.params.id).select('-password -verifyToken -verifyTokenExpires');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
