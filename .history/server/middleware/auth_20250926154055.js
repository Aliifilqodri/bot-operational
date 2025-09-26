const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // 1. Ambil header Authorization
  const authHeader = req.headers.authorization;

  // 2. Cek jika header tidak ada atau formatnya salah
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(403).json({ message: 'Akses ditolak. Token tidak disediakan.' });
  }

  // 3. Ekstrak token dari header (hapus "Bearer ")
  const token = authHeader.split(' ')[1];

  try {
    // 4. Verifikasi token menggunakan secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 5. Lampirkan payload token ke object request
    req.user = decoded; 
    
    // 6. Lanjutkan ke route berikutnya
    next();
  } catch (err) {
    // 7. Jika token tidak valid (kadaluwarsa, salah, dll.)
    res.status(403).json({ message: 'Token tidak valid.' });
  }
};

module.exports = { authMiddleware };