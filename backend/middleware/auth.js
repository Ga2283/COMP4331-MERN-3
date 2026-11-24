const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function requireAuth(req, res, next) {
  const authorization = req.get('Authorization');

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  let payload;
  try {
    const token = authorization.slice('Bearer '.length);
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }


  try {
    const user = await User.findById(payload.userId)
      .select('_id role isSuspended tokenVersion');

    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ error: 'Account suspended' });
    }

    if (payload.tokenVersion !== (user.tokenVersion ?? 0)) {
      return res.status(401).json({ error: 'Please log in again' });
    }

    req.userId = user._id;
    req.authUser = user;
    return next();
  } catch (err) {
    console.error('Authentication lookup failed:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

function requireAdmin(req, res, next) {
  if (req.authUser?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  return next();
}

module.exports = requireAuth;
module.exports.requireAdmin = requireAdmin;