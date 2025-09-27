// server/routes/auth.js

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Tambahkan user sebanyak yang Anda butuhkan di sini
const users = [
  { id: 1, username: 'operational', password: 'ops1234' },
  { id: 2, username: 'admin', password: 'admin1234' },
  { id: 3, username: 'ops', password: 'super123' },
  { id: 4, username: 'deryl', password: 'derylkeren' }
  // Anda bisa tambahkan lebih banyak user di bawah ini
];

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // Logika ini tidak perlu diubah, karena .find() akan mencari di seluruh array
  const user = users.find(u => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ message: 'Username atau password salah' });
  }

  // Gunakan secret key dari environment variable untuk keamanan
  const secretKey = process.env.JWT_SECRET || 'secretkey';
  
  const token = jwt.sign(
    { id: user.id, username: user.username }, 
    secretKey, 
    { expiresIn: '1h' } // Token berlaku selama 1 jam
  );
  
  res.json({ token });
});

module.exports = router;