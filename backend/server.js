require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // <--- 1. Require path

const app = express();
app.use(cors());
app.use(express.json());

// <--- 2. Serve uploaded images publicly
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  res.status(databaseReady ? 200 : 503).json({
    status: databaseReady ? 'ok' : 'starting',
    database: databaseReady ? 'connected' : 'disconnected',
  });
});

app.use('/api/users', require('./routes/users'));
app.use('/api/collectibles', require('./routes/collectibles'));
app.use('/api/admin', require('./routes/admin'));

app.post('/api/test-create', async (req, res) => {
  try {
    const testUser = await User.create({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      username: 'testuser123',
      password: 'fakepasswordhash'
    });
    res.status(201).json({ success: true, testUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`API running on port ${PORT}`));
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.log('Retrying database connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

connectDB();

module.exports = app;
