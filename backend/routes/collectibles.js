const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const Collectible = require('../models/Collectible');
const requireAuth = require('../middleware/auth');

const router = express.Router();
const allowedCategories = ['Cards', 'Comic books', 'Figurines', 'Misc.'];

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Ensure this folder exists in your backend root
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Middleware to handle single file upload errors gracefully
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
    const collectibles = await Collectible.find({ user: req.userId }).sort({ createdAt: -1 });
    
    // Map imagePath to image for frontend compatibility
    const items = collectibles.map(item => {
      const obj = item.toObject();
      obj.image = obj.imagePath;
      return obj;
    });

    return res.status(200).json({ collectibles: items });
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

    const obj = collectible.toObject();
    obj.image = obj.imagePath;

    return res.status(200).json({ collectible: obj });
  } catch (err) {
    console.error('Failed to retrieve collectible:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/collectibles
router.post('/', requireAuth, uploadImage, async (req, res) => {
  try {
    const { name, category, description = '' } = req.body || {};

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (typeof category !== 'string' || !allowedCategories.includes(category)) {
      return res.status(400).json({ error: 'Valid category is required' });
    }

    let imagePath = '';
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    } else {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const newCollectible = await Collectible.create({
      name: name.trim(),
      category,
      description: description.trim(),
      imagePath: imagePath, // <--- FIXED: using imagePath instead of image
      user: req.userId,
    });

    const obj = newCollectible.toObject();
    obj.image = obj.imagePath;

    return res.status(201).json({ message: 'Collectible created', collectible: obj });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    console.error('Failed to create collectible:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/collectibles/:id
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

    if (req.file) {
      updates.imagePath = `/uploads/${req.file.filename}`; // <--- FIXED: using imagePath instead of image
    }

    const updatedCollectible = await Collectible.findOneAndUpdate(
      { _id: id, user: req.userId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedCollectible) {
      return res.status(404).json({ error: 'Collectible not found' });
    }

    const obj = updatedCollectible.toObject();
    obj.image = obj.imagePath;

    return res.status(200).json({ collectible: obj });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }

    console.error('Failed to update collectible:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/collectibles/:id
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
