// file: server/routes/tickets.js
const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const excel = require('exceljs');
const multer = require('multer');

// === CONFIG ===
const upload = multer({ storage: multer.memoryStorage() });
const PIC_LIST = ['BelumDitentukan','sal','alf','rdh','fhn','drl','raf'];
const CASE_KEYWORDS = { /* ... Salin CASE_KEYWORDS Anda di sini ... */ };

// Import bot & authMiddleware & escapeMarkdown dari context server utama
const { bot, escapeMarkdown, authMiddleware } = require('../utils/telegram'); 
// catatan: pastikan lu punya file utils/telegram.js buat export bot & escapeMarkdown

// ====================== ROUTES ======================

// [GET] /api/tickets - Mendapatkan semua tiket dengan statistik
router.get('/', async (req, res) => {
  // ... logika GET /api/tickets Anda di sini ...
});

// [POST] /api/tickets/:id/reply - Membalas dan menyelesaikan tiket
router.post('/:id/reply', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    const { balasan } = req.body;
    const ticket = await Ticket.findById(req.params.id);

    if (!balasan || !ticket) {
      return res.status(400).json({ message: 'Input tidak valid atau tiket tidak ditemukan.' });
    }

    // Jika ada file upload (foto)
    if (req.file) {
      await bot.sendPhoto(ticket.chatId, req.file.buffer, {
        caption: `💬 *Update dari Admin untuk tiket ${escapeMarkdown(ticket.ticketId)}:*\n\n${escapeMarkdown(balasan)}`,
        parse_mode: "MarkdownV2",
        reply_to_message_id: ticket.messageId
      });
    } else {
      // Jika tidak ada foto, kirim teks
      await bot.sendMessage(ticket.chatId, `💬 *Update dari Admin untuk tiket ${escapeMarkdown(ticket.ticketId)}:*\n\n${escapeMarkdown(balasan)}`, {
        parse_mode: "MarkdownV2",
        reply_to_message_id: ticket.messageId
      });
    }

    // Simpan ke database (rekam jejak)
    ticket.adminMessage = balasan;
    await ticket.save();

    res.json({ success: true, message: 'Balasan terkirim.' });
  } catch (err) {
    console.error("❌ Gagal mengirim balasan:", err);
    res.status(500).json({ message: 'Gagal mengirim balasan.' });
  }
});

// [PATCH] /api/tickets/:id/set-pic - Menetapkan PIC
router.patch('/:id/set-pic', async (req, res) => {
  // ... logika PATCH /set-pic Anda di sini ...
});

// [GET] /api/tickets/export - Ekspor ke Excel
router.get('/export', async (req, res) => {
  // ... logika GET /export Anda di sini ...
});

module.exports = router;
