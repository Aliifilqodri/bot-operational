// file: routes/tickets.js

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
const STATUS_LIST = ['diproses', 'on hold', 'waiting third party', 'done']; 

// === Fungsi bantu map status untuk UI ===
function mapStatusForUI(status) {
  if (!status) return "Diproses";

  const lower = status.toLowerCase();
  if (lower === 'waiting third party') return 'Menunggu Approval';
  if (lower === 'done') return 'Done';
  return status.charAt(0).toUpperCase() + status.slice(1); // diproses → Diproses, on hold → On Hold
}

// ====================== ROUTES ======================

// [GET] Semua tiket + statistik
router.get('/', authMiddleware, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const skip = (page - 1) * limit;
        const filters = {};
        if (req.query.status && req.query.status !== 'all') filters.status = req.query.status.toLowerCase();
        if (req.query.pic && req.query.pic !== 'all') filters.pic = req.query.pic;
        if (req.query.startDate) filters.createdAt = { ...filters.createdAt, $gte: new Date(req.query.startDate) };
        if (req.query.endDate) {
            const endOfDay = new Date(req.query.endDate);
            endOfDay.setHours(23, 59, 59, 999);
            filters.createdAt = { ...filters.createdAt, $lte: endOfDay };
        }

        const tickets = await Ticket.find(filters)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const ticketsWithUIStatus = tickets.map(t => ({
          ...t._doc,
          displayStatus: mapStatusForUI(t.status)
        }));

        const totalTickets = await Ticket.countDocuments(filters);
        const totalPages = Math.ceil(totalTickets / limit);

        // Statistik sederhana
        const stats = {
            totalDiproses: await Ticket.countDocuments({ status: { $in: ['diproses', 'on hold', 'waiting third party'] } }),
            totalSelesai: await Ticket.countDocuments({ status: 'done' }),
            picList: PIC_LIST,
            picData: await Promise.all(PIC_LIST.map(async pic => {
                const count = await Ticket.countDocuments({ pic: pic });
                return { pic, count };
            })),
            caseData: {}, // bisa diisi sesuai kebutuhan
            statsToday: {}, 
            statsYesterday: {}
        };

        res.json({ 
          tickets: ticketsWithUIStatus,
          totalPages,
          currentPage: page,
          stats
        });
    } catch (err) {
        console.error("❌ Error GET /api/tickets:", err);
        res.status(500).json({ message: 'Gagal memuat tiket.' });
    }
});

// [POST] Balas tiket dengan foto (Telegram)
router.post('/:id/reply', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    const { balasan } = req.body;
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) return res.status(404).json({ message: 'Ticket tidak ditemukan' });

    if (ticket.status.toLowerCase() === 'done') {
      return res.status(400).json({ message: 'Tiket sudah selesai, tidak bisa dikirim balasan lagi.' });
    }

    ticket.adminMessage = balasan;
    await ticket.save();

    const replyNotification = `💬 *Update dari Admin untuk tiket ${ticket.ticketCode}:*\n\n${balasan}`;

    if (req.file) {
      await bot.sendPhoto(ticket.chatId, req.file.buffer, {
        caption: replyNotification,
        parse_mode: "MarkdownV2",
        reply_to_message_id: ticket.messageId
      });
    } else {
      await bot.sendMessage(ticket.chatId, replyNotification, {
        parse_mode: "MarkdownV2",
        reply_to_message_id: ticket.messageId
      });
    }

    res.json({ success: true, message: 'Balasan terkirim.' });

  } catch (err) {
    console.error('Gagal mengirim balasan:', err);
    res.status(500).json({ message: 'Gagal mengirim balasan.' });
  }
});

// [PATCH] Update status tiket
router.patch('/:id/set-status', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        if (!status || !STATUS_LIST.includes(status.toLowerCase())) {
            return res.status(400).json({ message: 'Status tidak valid.' });
        }

        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Tiket tidak ditemukan.' });
        if (ticket.status.toLowerCase() === 'done') return res.status(400).json({ message: 'Tiket sudah selesai, status tidak bisa diubah lagi.' });

        ticket.status = status.toLowerCase();
        ticket.completedAt = status.toLowerCase() === 'done' ? new Date() : null;
        await ticket.save();

        const displayStatus = mapStatusForUI(ticket.status);

        const statusUpdateMessage = `ℹ️ Status tiket *${escapeMarkdownV2(ticket.ticketCode)}* diubah menjadi *${escapeMarkdownV2(displayStatus)}*\\.`; 
        try {
            await bot.sendMessage(ticket.chatId, statusUpdateMessage, { parse_mode: "MarkdownV2", reply_to_message_id: ticket.messageId });
        } catch (err) {
            console.error(`❌ Gagal kirim notifikasi status ke chatId ${ticket.chatId}:`, err.message);
        }

        res.json({ ...ticket._doc, displayStatus });
    } catch (err) {
        console.error("❌ Gagal PATCH /set-status:", err);
        res.status(500).json({ message: 'Gagal mengubah status tiket.' });
    }
});

// [PATCH] Update PIC
router.patch('/:id/set-pic', authMiddleware, async (req, res) => {
    try {
        const { pic } = req.body;
        if (!PIC_LIST.includes(pic) && pic !== 'BelumDitentukan') return res.status(400).json({ message: 'PIC tidak valid.' });

        const ticket = await Ticket.findByIdAndUpdate(req.params.id, { pic }, { new: true });
        if (!ticket) return res.status(404).json({ message: 'Tiket tidak ditemukan.' });

        res.json(ticket);
    } catch (err) {
        console.error('❌ Gagal set PIC:', err);
        res.status(500).json({ message: 'Gagal menetapkan PIC.' });
    }
});

// [PATCH] Reply tiket (text only, simpan di array replies)
router.patch('/reply/:id', authMiddleware, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if(!ticket) return res.status(404).json({ message: 'Tiket tidak ditemukan.' });

    if(ticket.status.toLowerCase() === 'done'){
      return res.status(400).json({ message: 'Tiket sudah selesai, tidak bisa dikirim balasan lagi.' });
    }

    const { replyText } = req.body;
    ticket.replies.push({ text: replyText, user: req.user.username, createdAt: new Date() });
    await ticket.save();

    res.json({ message: 'Balasan berhasil dikirim.' });
  } catch(err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server.' });
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
