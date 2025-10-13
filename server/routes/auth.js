const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const axios = require('axios');

// --- KONFIGURASI ---
// Mengambil URL SSO dari file .env.
// .filter(Boolean) akan menghapus entri yang kosong jika salah satu URL tidak di-set.
const SSO_URLS = [
    process.env.SSO_URL_PRIMARY,
    process.env.SSO_URL_SECONDARY
].filter(Boolean);

const JWT_SECRET = process.env.JWT_SECRET;

// Pemeriksaan krusial saat aplikasi pertama kali berjalan.
if (SSO_URLS.length === 0 || !JWT_SECRET) {
    console.error("FATAL ERROR: URL SSO atau JWT_SECRET tidak ditemukan di file .env");
    process.exit(1);
}

// --- ROUTE HANDLER ---
router.post('/sso-login', async (req, res) => {
    const { username, password } = req.body;
    console.log(`[AUTH] Menerima permintaan login untuk user: "${username}"`);

    // 1. Validasi Input Dasar
    if (!username || !password) {
        return res.status(400).json({ message: 'Username dan password wajib diisi.' });
    }

    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    // 2. Logika Failover: Mencoba setiap URL SSO secara berurutan
    for (const ssoUrl of SSO_URLS) {
        try {
            console.log(`[AUTH] Mencoba menghubungai Server SSO di: ${ssoUrl}`);
            
            const ssoResponse = await axios.post(ssoUrl, formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 5000 // Timeout 5 detik untuk setiap percobaan
            });
            
            console.log(`[AUTH] Respons dari ${ssoUrl}:`, ssoResponse.data);

            // KONDISI A: Login BERHASIL
            // Server merespons dan otentikasi sukses.
            if (ssoResponse.data && ssoResponse.data.auth === 'Yes') {
                console.log(`[AUTH] SSO Berhasil di ${ssoUrl} untuk user: "${username}".`);
                
                const payload = {
                    id: username,
                    username: ssoResponse.data.nama || username
                };
                
                const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

                // Langsung kirim token dan HENTIKAN eksekusi dengan `return`.
                return res.json({ token });
            } 
            // KONDISI B: Login GAGAL (cth: password salah)
            // Server merespons, tapi otentikasi ditolak.
            else {
                const errorMessage = ssoResponse.data.message || 'Username atau password SSO salah.';
                console.warn(`[AUTH] Otentikasi Gagal di ${ssoUrl}. Pesan: ${errorMessage}`);

                // Langsung kirim pesan error dan HENTIKAN eksekusi.
                // Tidak perlu mencoba server lain jika password sudah pasti salah.
                return res.status(401).json({ message: errorMessage });
            }
        } catch (error) {
            // KONDISI C: SERVER GAGAL DIHUBUNGI (timeout, down, dll.)
            // `catch` hanya akan aktif jika ada masalah jaringan/koneksi.
            console.error(`[AUTH] GAGAL terhubung ke ${ssoUrl}. Error: ${error.message}`);
            // Di sini TIDAK ada `return` agar loop bisa LANJUT ke URL berikutnya.
        }
    }
    
    // 3. Penanganan Error Final
    // Baris ini hanya akan tercapai jika SEMUA URL di dalam loop gagal dihubungi.
    console.error(`[AUTH] Semua server SSO (${SSO_URLS.join(', ')}) gagal dihubungi.`);
    return res.status(500).json({
        message: 'Semua server otentikasi tidak dapat dihubungi. Pastikan Anda terhubung ke jaringan kantor/VPN.'
    });
});

module.exports = router;