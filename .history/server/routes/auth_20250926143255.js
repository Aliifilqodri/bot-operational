// file: server/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // pastikan file ini ada (User.js)

const router = express.Router();

// ============================
// DUMMY USER (fallback testing)
// ============================
const users = [
  { id: 1, username: 'admin', password: '12345' } // password plain untuk testing
];

// ============================
// REGISTER (MongoDB)
// ============================
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    // cek user sudah ada atau belum
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username sudah digunakan' });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // simpan user baru
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    res.json({ message: 'Registrasi berhasil', user: { id: newUser._id, username: newUser.username } });
  } catch (err) {
    console.error('Error register:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================
// LOGIN (MongoDB / fallback ke dummy user)
// ============================
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // cek di MongoDB
    const user = await User.findOne({ username });
    if (user) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Password salah' });
      }

      const token = jwt.sign({ id: user._id, username: user.username }, 'secretkey', { expiresIn: '1h' });
      return res.json({ token });
    }

    // fallback ke dummy user
    const dummy = users.find(u => u.username === username && u.password === password);
    if (!dummy) {
      return res.status(401).json({ message: 'Username atau password salah' });
    }

    const token = jwt.sign({ id: dummy.id, username: dummy.username }, 'secretkey', { expiresIn: '1h' });
    res.json({ token });

  } catch (err) {
    console.error('Error login:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
