require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Collectible = require('./models/Collectible');

async function seed() {
  const username = process.env.SEED_USERNAME || 'demo';
  const email = (process.env.SEED_EMAIL || 'demo@example.com').toLowerCase();
  const password = process.env.SEED_PASSWORD;
  const adminUsername = process.env.SEED_ADMIN_USERNAME || 'admin';
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || password;

  if (!password) {
    throw new Error('Set SEED_PASSWORD before running the seed service.');
  }
  if (username === adminUsername || email === adminEmail) {
    throw new Error('The seeded user and admin must have different usernames and email addresses.');
  }

  await mongoose.connect(process.env.MONGO_URI);

  // Reuse the demo account if it exists; do not touch other users.
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.findOneAndUpdate(
    { username },
    {
      $set: {
        role: 'user',
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

  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  await User.findOneAndUpdate(
    { username: adminUsername },
    {
      $set: {
        role: 'admin',
        firstName: 'Seeded',
        lastName: 'Admin',
        username: adminUsername,
        email: adminEmail,
        password: adminPasswordHash,
        isVerified: true,
        isSuspended: false,
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
      imagePath: 'https://via.placeholder.com/150',
    },
    {
      name: 'Classic Comic Issue',
      category: 'Comic books',
      description: 'A sample comic book.',
      imagePath: 'https://via.placeholder.com/150',
    },
    {
      name: 'Display Figurine',
      category: 'Figurines',
      description: 'A sample collectible figurine.',
      imagePath: 'https://via.placeholder.com/150',
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

  console.log(`Seeded user "${username}", admin "${adminUsername}", and ${demoCollectibles.length} collectibles.`);
}

seed()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
