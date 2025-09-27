const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const users = [
  { id: 1, username: 'operational', password: 'ops1234' }
];

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ message: 'Username atau password salah' });

  const token = jwt.sign({ id: user.id, username: user.username }, 'secretkey', { expiresIn: '1h' });
  res.json({ token });
});

module.exports = router;
