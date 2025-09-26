// file: server/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // Ambil token dari header Authorization
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Akses ditolak, tidak ada token.' });
  }

  try {
    // Pisahkan "Bearer " dari token
    const token = authHeader.split(' ')[1];

    // Verifikasi token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Tambahkan payload user yang sudah didekode ke object request
    req.user = decoded;

    // Lanjutkan ke route berikutnya
    next();
  } catch (err) {
    res.status(403).json({ message: 'Token tidak valid.' });
  }
};

module.exports = { authMiddleware };