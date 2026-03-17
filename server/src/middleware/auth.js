const jwt = require('jsonwebtoken');
const User = require('../models/User');

function hardcodedAuthEnabled() {
  return String(process.env.HARDCODED_AUTH || '').toLowerCase() === 'true';
}

const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.db === 'postgres' && decoded.postgresUser) {
      req.user = { ...decoded.postgresUser, isPostgres: true };
      next();
      return;
    }

    if (hardcodedAuthEnabled() && decoded.hardcoded && decoded.hardcodedUser) {
      req.user = { ...decoded.hardcodedUser, isHardcoded: true };
      next();
      return;
    }

    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = { auth, requireAdmin };
