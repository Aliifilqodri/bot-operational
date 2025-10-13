const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');

// ==============================================
// LOCAL LOGIN - Untuk login tanpa SSO
// ==============================================
router.post('/local-login', async (req, res) => {
    const { username, password } = req.body;

    // 1️⃣ Validasi input
    if (!username || !password) {
        return res.status(400).json({ message: 'Username dan password wajib diisi.' });
    }

    try {
        // 2️⃣ Normalisasi username agar tetap konsisten
        const normalizedUsername = username.toLowerCase().replace(/\s/g, '');

        // 3️⃣ Cari user di database berdasarkan username
        const user = await User.findOne({ username: normalizedUsername });
        if (!user) {
            return res.status(401).json({ message: 'Username atau password salah.' });
        }

        // 4️⃣ Bandingkan password dengan bcrypt
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Username atau password salah.' });
        }

        // 5️⃣ Ambil nama tampilan yang sudah benar (gunakan displayName)
        // Kalau displayName tidak ada, fallback ke username
        const displayName = user.displayName || user.username;

        // 6️⃣ Buat payload JWT
        const payload = {
            userId: user._id,
            username: user.username,       // buat login system
            displayName: displayName,      // ini nama lengkap tampil di dashboard
            role: user.role
        };

        // 7️⃣ Generate token
        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET || 'default_secret',
            { expiresIn: '1d' }
        );

        // 8️⃣ Kirim hasil login ke frontend
        res.json({
            success: true,
            message: `Selamat datang, ${displayName}!`,
            token,
            user: {
                id: user._id,
                username: user.username,
                displayName: displayName,
                role: user.role
            }
        });

    } catch (err) {
        console.error('❌ Error di /local-login:', err);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

module.exports = router;
