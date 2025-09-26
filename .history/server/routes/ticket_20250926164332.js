const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket'); 
const excel = require('exceljs');
const multer = require('multer');

const { authMiddleware } = require('../middleware/authMiddleware'); 
const { bot, escapeMarkdownV2 } = require('../utils/telegramSetup'); 

// === CONFIG ===
const upload = multer({ storage: multer.memoryStorage() });
const PIC_LIST = ['BelumDitentukan', 'sal', 'alf', 'rdh', 'fhn', 'drl', 'raf'];
const STATUS_LIST = ['Diproses', 'On Hold', 'Waiting Third Party', 'Done'];

// ====================== ROUTES ======================

// [GET] Semua tiket + statistik
router.get('/', authMiddleware, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const skip = (page - 1) * limit;

        const filters = {};
        if (req.query.status && req.query.status !== 'all') filters.status = req.query.status;
        if (req.query.pic && req.query.pic !== 'all') filters.pic = req.query.pic;
        if (req.query.startDate) filters.createdAt = { ...filters.createdAt, $gte: new Date(req.query.startDate) };
        if (req.query.endDate) {
            const endOfDay = new Date(req.query.endDate);
            endOfDay.setHours(23, 59, 59, 999);
            filters.createdAt = { ...filters.createdAt, $lte: endOfDay };
        }

        const tickets = await Ticket.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit);
        const totalTickets = await Ticket.countDocuments(filters);
        const totalPages = Math.ceil(totalTickets / limit);

        res.json({ tickets, totalPages, currentPage: page });
    } catch (err) {
        console.error("❌ Error GET /api/tickets:", err);
        res.status(500).json({ message: 'Gagal memuat tiket.' });
    }
});

// [PATCH] Update status tiket
router.patch('/:id/set-status', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        if (!status || !STATUS_LIST.includes(status)) {
            return res.status(400).json({ message: 'Status tidak valid.' });
        }

        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Tiket tidak ditemukan.' });

        if (ticket.status === 'Done') {
            return res.status(400).json({ message: 'Tiket sudah selesai, status tidak bisa diubah lagi.' });
        }

        ticket.status = status;
        ticket.completedAt = status === 'Done' ? new Date() : null;
        await ticket.save();

        // Kirim notifikasi Telegram jika bukan Done → tetap bisa kirim
        const statusMessage = `ℹ️ Status tiket *${escapeMarkdownV2(ticket.ticketCode)}* diubah menjadi *${escapeMarkdownV2(status)}*\\.`;
        try {
            await bot.sendMessage(ticket.chatId, statusMessage, {
                parse_mode: "MarkdownV2",
                reply_to_message_id: ticket.messageId
            });
        } catch (err) {
            console.error(`❌ Gagal kirim notifikasi status ke chatId ${ticket.chatId}:`, err.message);
        }

        res.json(ticket);
    } catch (err) {
        console.error("❌ Gagal PATCH /set-status:", err);
        res.status(500).json({ message: 'Gagal mengubah status tiket.' });
    }
});

// [PATCH] Update PIC
router.patch('/:id/set-pic', authMiddleware, async (req, res) => {
    try {
        const { pic } = req.body;
        if (!PIC_LIST.includes(pic) && pic !== 'BelumDitentukan') {
            return res.status(400).json({ message: 'PIC tidak valid.' });
        }

        const ticket = await Ticket.findByIdAndUpdate(req.params.id, { pic }, { new: true });
        if (!ticket) return res.status(404).json({ message: 'Tiket tidak ditemukan.' });

        res.json(ticket);
    } catch (err) {
        console.error('❌ Gagal set PIC:', err);
        res.status(500).json({ message: 'Gagal menetapkan PIC.' });
    }
});

// [POST] Balas tiket (bisa kirim foto)
router.post('/:id/reply', authMiddleware, upload.single('photo'), async (req, res) => {
    try {
        const { balasan } = req.body;
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Tiket tidak ditemukan.' });
        if (!balasan) return res.status(400).json({ message: 'Isi balasan tidak boleh kosong.' });
        if (ticket.status === 'Done') return res.status(400).json({ message: 'Tiket sudah selesai, tidak bisa dibalas.' });

        ticket.adminMessage = balasan;
        await ticket.save();

        const replyNotification = `💬 *Update dari IT TA untuk tiket ${escapeMarkdownV2(ticket.ticketCode)}:*\n\n${escapeMarkdownV2(balasan)}`;
        if (req.file) {
            await bot.sendPhoto(ticket.chatId, req.file.buffer, { caption: replyNotification, parse_mode: "MarkdownV2", reply_to_message_id: ticket.messageId });
        } else {
            await bot.sendMessage(ticket.chatId, replyNotification, { parse_mode: "MarkdownV2", reply_to_message_id: ticket.messageId });
        }

        res.json({ success: true, message: 'Balasan terkirim.' });
    } catch (err) {
        console.error('❌ Gagal POST /reply:', err);
        res.status(500).json({ message: 'Gagal mengirim balasan.' });
    }
});

// [GET] Export Excel
router.get('/export', authMiddleware, async (req, res) => {
    try {
        const tickets = await Ticket.find().sort({ createdAt: -1 });
        const workbook = new excel.Workbook();
        const worksheet = workbook.addWorksheet('Daftar Kendala');

        worksheet.columns = [
            { header: 'Kode Tiket', key: 'ticketCode', width: 15 },
            { header: 'Status', key: 'status', width: 20 },
            { header: 'PIC', key: 'pic', width: 15 },
            { header: 'Deskripsi Kendala', key: 'text', width: 50 },
            { header: 'Pelapor', key: 'username', width: 20 },
            { header: 'Grup', key: 'groupName', width: 25 },
            { header: 'Tanggal Laporan', key: 'createdAt', width: 25 },
            { header: 'Tanggal Selesai', key: 'completedAt', width: 25 },
            { header: 'Catatan Admin', key: 'adminMessage', width: 50 }
        ];

        tickets.forEach(ticket => worksheet.addRow(ticket));

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Daftar_Kendala.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('❌ Gagal export Excel:', err);
        res.status(500).send('Gagal mengekspor data ke Excel.');
    }
});

module.exports = router;
