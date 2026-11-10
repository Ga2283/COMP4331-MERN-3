const express = require('express');
const router = express.Router();
const Collectible = require('../models/Collectible');
const User = require('../models/User');
const requireAuth = require('../middleware/auth'); // Import your JWT middleware

// Protect all collectible routes with JWT auth
router.use(requireAuth);

// GET logged-in user's collectibles
router.get('/', async (req, res) => {
  try {
    const userId = req.userId; // <--- Uses req.userId from JWT payload
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const query = { user: userId };
    if (req.query.category && req.query.category !== 'All') {
      query.category = req.query.category;
    }
    if (req.query.search) {
      query.name = { $regex: req.query.search, $options: 'i' };
    }

    const items = await Collectible.find(query).skip(skip).limit(limit).sort({ createdAt: -1 });
    const total = await Collectible.countDocuments(query);

    res.json({ items, total, hasMore: skip + items.length < total });
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching items' });
  }
});

// POST new collectible item
router.post('/', async (req, res) => {
  try {
    const { name, category, description, image } = req.body;
    const newItem = new Collectible({
      user: req.userId, // <--- Uses req.userId from JWT payload
      name,
      category,
      description,
      image,
    });
    await newItem.save();
    res.status(201).json(newItem);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create item' });
  }
});

// GET current user profile info
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('firstName lastName'); // <--- Uses req.userId
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
