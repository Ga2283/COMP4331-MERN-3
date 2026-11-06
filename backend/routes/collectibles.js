const express = require('express');
const Collectible = require('../models/Collectible');
const requireAuth = require('../middleware/auth');
const upload = require('../middleware/upload');
const mongoose = require('mongoose');
const allowedCategories = ['Cards', 'Comic books', 'Figurines','Misc.'];

const router = express.Router();

//Turns upload errors into this route’s JSON response.
function uploadImage(req, res, next) {
  upload.single('imageFile')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}

// GET /api/collectibles
router.get('/', requireAuth, async (req, res) => {
  try {
    const collectibles = await Collectible.find({ user: req.userId })
      .sort({ createdAt: -1 });

    return res.status(200).json({ collectibles });
  } catch (err) {
    console.error('Failed to retrieve collectibles:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/collectibles/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid collectible ID' });
    }

    const collectible = await Collectible.findOne({
      _id: id,
      user: req.userId,
    });

    if (!collectible) {
      return res.status(404).json({ error: 'Collectible not found' });
    }

    return res.status(200).json({ collectible });
  } catch (err) {
    console.error('Failed to retrieve collectible:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/collectibles
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, category, description = '', image = '' } = req.body || {};

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (typeof category !== 'string' || !allowedCategories.includes(category)) {
      return res.status(400).json({ error: 'Valid category is required' });
    }

    if (typeof description !== 'string' || typeof image !== 'string') {
      return res.status(400).json({
        error: 'Description and image must be strings',
      });
    }

    const collectible = await Collectible.create({
      user: req.userId,
      name: name.trim(),
      category,
      description: description.trim(),
      image: image.trim(),
    });

    return res.status(201).json({ collectible });
  } catch (err) {
    console.error('Failed to create collectible:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

//PATCH /api/collectibles/:id
router.patch('/:id', requireAuth, uploadImage, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid collectible ID' });
    }

    const updates = {};
    const body = req.body || {};

    if ('name' in body) {
      if (typeof body.name !== 'string' || !body.name.trim()) {
        return res.status(400).json({ error: 'Name cannot be empty' });
      }
      updates.name = body.name.trim();
    }

    if ('category' in body) {
      if (!allowedCategories.includes(body.category)) {
        return res.status(400).json({ error: 'Valid category is required' });
      }
      updates.category = body.category;
    }

    if ('description' in body) {
      if (typeof body.description !== 'string') {
        return res.status(400).json({ error: 'Description must be a string' });
      }
      updates.description = body.description.trim();
    }

    if ('image' in body) {
      if (typeof body.image !== 'string') {
        return res.status(400).json({ error: 'Image must be a string' });
      }
      updates.image = body.image.trim();
    }

    if (req.file) {
      updates.image = `/api/uploads/${req.file.filename}`;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Provide at least one field to update' });
    }

    const collectible = await Collectible.findOneAndUpdate(
      { _id: id, user: req.userId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!collectible) {
      return res.status(404).json({ error: 'Collectible not found' });
    }

    return res.status(200).json({ collectible });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }

    console.error('Failed to update collectible:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

//DELETE /api/collectibles/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid collectible ID' });
    }

    const deletedCollectible = await Collectible.findOneAndDelete({
      _id: id,
      user: req.userId,
    });

    if (!deletedCollectible) {
      return res.status(404).json({ error: 'Collectible not found' });
    }

    return res.status(200).json({
      message: 'Collectible deleted',
      collectibleId: deletedCollectible._id,
    });
  } catch (err) {
    console.error('Failed to delete collectible:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;