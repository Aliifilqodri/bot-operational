// file: server/middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'Akses ditolak, token tidak ada.' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Format token salah.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token tidak valid.' });
  }
};