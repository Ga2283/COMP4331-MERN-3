const mongoose = require('mongoose');

const collectibleSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['Cards', 'Comic books', 'Figurines', 'Misc.'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    imagePath: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Collectible', collectibleSchema);
