const express = require('express');
const requireAuth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Collectible = require('../models/Collectible');
const fs = require('fs/promises');
const path = require('path');

const router = express.Router();

router.use(requireAuth, requireAdmin);

//DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (id === req.userId.toString()) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const targetUser = await User.findById(id).select('_id role isSuspended');

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.role === 'admin' && !targetUser.isSuspended) {
      const anotherActiveAdmin = await User.exists({
        role: 'admin',
        isSuspended: false,
        _id: { $ne: id },
      });

      if (!anotherActiveAdmin) {
        return res.status(409).json({ error: 'Cannot delete the last active admin' });
      }
    }

    const collectibles = await Collectible.find({ user: id }).select('imagePath');

    const uploadsDirectory = path.join(__dirname, '..', 'uploads');

    const imageFiles = collectibles
    .map((item) => item.imagePath)
    // Only remove files managed by this app, not external image URLs.
    .filter((imagePath) =>
        typeof imagePath === 'string' && imagePath.startsWith('/uploads/')
    )
    // Keep the file inside the uploads directory.
    .map((imagePath) =>
        path.join(uploadsDirectory, path.posix.basename(imagePath))
    );

    const collectiblesResult = await Collectible.deleteMany({ user: id });
    await User.deleteOne({ _id: id });

    // Try to remove each file after the database records are deleted.
    const cleanupResults = await Promise.allSettled(
    [...new Set(imageFiles)].map((filePath) => fs.unlink(filePath))
    );

    for (const result of cleanupResults) {
    if (result.status === 'rejected' && result.reason.code !== 'ENOENT') {
        console.error('Could not remove an uploaded image:', result.reason);
    }
    }

    return res.status(200).json({
      message: 'User deleted',
      userId: id,
      collectiblesDeleted: collectiblesResult.deletedCount,
      imageFilesRemoved: cleanupResults.filter(
        (result) => result.status === 'fulfilled'
      ).length,
    });
  } catch (err) {
    console.error('Failed to delete user:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/admin/users/:id/password
router.patch('/users/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (
      typeof newPassword !== 'string' ||
      newPassword.length < 8 ||
      Buffer.byteLength(newPassword, 'utf8') > 72
    ) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters and no more than 72 bytes',
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const result = await User.updateOne(
      { _id: id },
      {
        $set: { password: hashedPassword },
        $inc: { tokenVersion: 1 },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      message: 'Password changed; the user must log in again',
      userId: id,
    });
  } catch (err) {
    console.error('Failed to change user password:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});


// PATCH /api/admin/users/:id/suspension
router.patch('/users/:id/suspension', async (req, res) => {
  try {
    const { id } = req.params;
    const { suspended } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (typeof suspended !== 'boolean') {
      return res.status(400).json({
        error: 'suspended must be true or false',
      });
    }

    if (suspended && id === req.userId.toString()) {
      return res.status(400).json({ error: 'You cannot suspend your own account' });
    }

    const targetUser = await User.findById(id).select('_id role isSuspended');

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.isSuspended === suspended) {
      return res.status(200).json({
        message: suspended ? 'User is already suspended' : 'User is already active',
        userId: id,
        isSuspended: suspended,
      });
    }

    if (suspended && targetUser.role === 'admin' && !targetUser.isSuspended) {
      const anotherActiveAdmin = await User.exists({
        role: 'admin',
        isSuspended: false,
        _id: { $ne: id },
      });

      if (!anotherActiveAdmin) {
        return res.status(409).json({ error: 'Cannot suspend the last active admin' });
      }
    }

    const result = await User.updateOne(
      { _id: id },
      {
        $set: { isSuspended: suspended },
        $inc: { tokenVersion: 1 },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      message: suspended ? 'User suspended' : 'User unsuspended',
      userId: id,
      isSuspended: suspended,
    });
  } catch (err) {
    console.error('Failed to change user suspension:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // This endpoint only promotes; it cannot change roles to arbitrary values.
    if (role !== 'admin') {
      return res.status(400).json({ error: 'Role must be admin' });
    }

    const targetUser = await User.findById(id)
      .select('_id username role isVerified isSuspended');

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.role === 'admin') {
      return res.status(200).json({
        message: 'User is already an admin',
        userId: id,
        role: 'admin',
      });
    }

    if (!targetUser.isVerified || targetUser.isSuspended) {
      return res.status(409).json({
        error: 'Only verified, active users can be promoted',
      });
    }

    const result = await User.updateOne(
      {
        _id: id,
        role: 'user',
        isVerified: true,
        isSuspended: false,
      },
      {
        $set: { role: 'admin' },
        $inc: { tokenVersion: 1 },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(409).json({ error: 'User status changed; try again' });
    }

    return res.status(200).json({
      message: 'User promoted to admin; they must log in again',
      userId: id,
      role: 'admin',
    });
  } catch (err) {
    console.error('Failed to promote user:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
