const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '') || req.query.token;
  if (!token) {
    console.log('authenticateToken: No token provided', {
      headers: req.headers,
      query: req.query,
    });
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('authenticateToken: Token verification failed:', err.message, { token });
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = { authenticateToken };