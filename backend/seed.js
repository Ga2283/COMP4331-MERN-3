require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Collectible = require('./models/Collectible');

async function seed() {
  const username = process.env.SEED_USERNAME || 'demo';
  const email = (process.env.SEED_EMAIL || 'demo@example.com').toLowerCase();
  const password = process.env.SEED_PASSWORD;

  if (!password) {
    throw new Error('Set SEED_PASSWORD before running the seed service.');
  }

  await mongoose.connect(process.env.MONGO_URI);

  // Reuse the demo account if it exists; do not touch other users.
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.findOneAndUpdate(
    { username },
    {
      $set: {
        firstName: 'Demo',
        lastName: 'User',
        username,
        email,
        password: passwordHash,
        isVerified: true,
        verifyToken: undefined,
        verifyTokenExpires: undefined,
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  const demoCollectibles = [
    {
      name: 'Vintage Trading Card',
      category: 'Cards',
      description: 'A sample collectible card.',
    },
    {
      name: 'Classic Comic Issue',
      category: 'Comic books',
      description: 'A sample comic book.',
    },
    {
      name: 'Display Figurine',
      category: 'Figurines',
      description: 'A sample collectible figurine.',
    },
  ];

  // Replace only this demo user's sample collectibles each time the seed runs.
  await Collectible.deleteMany({
    user: user._id,
    name: { $in: demoCollectibles.map((item) => item.name) },
  });

  await Collectible.insertMany(
    demoCollectibles.map((item) => ({ ...item, user: user._id }))
  );

  console.log(`Seeded demo account "${username}" and ${demoCollectibles.length} collectibles.`);
}

seed()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });