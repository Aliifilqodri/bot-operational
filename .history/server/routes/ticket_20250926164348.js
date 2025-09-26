// file: server/routes/tickets.js
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
const CASE_KEYWORDS = {
    'WFM - Mismatch Tiket': ['wfm not found', 'tiket not found', 'double tiket', 'wfm kosong', 'tidak bisa terclose', 'wfm masih open', 'gadak di wfm'],
    'WFM - Tiket Nyangkut (Stuck)': ['nyangkut di finalcheck', 'nyangkut di backend', 'nyangkut di mediacare', 'nyangkut di slamsim', 'tidak bisa closed', 'wfm stuck backend', 'insera hilang'],
    'WFM - Work Order Tidak Muncul': ['work order tidak muncul', 'wo tidak muncul', 'workorder section', 'assignment section'],
    'WFM - Masalah Akun Pengguna': ['user terkunci', 'gagal login', 'otp tidak masuk', 'user not registered', 'reset rekan teknisi'],
    'WFM - Teknisi Tidak Ditemukan': ['technician not found', 'teknisi tidak ditemukan'],
    'WFM - Masalah Owner Group': ['owner grup', 'owner group', 'owner group, witel,service id , service number , dll kosong', 'munculkan owner'],
    'INSERA - Mismatch Tiket': ['insera tidak muncul', 'insera not found', 'not found di insera', 'insera gadak', 'gadak di insera'],
    'Mytech - Masalah Akun / Login': ['user_rsc_notactive', 'user_notactive', 'user auth failed', 'user_auth_locked'],
    'SAP - Revoke': ['revoke'],
    'Alista - Koreksi Data': ['delete bai', 'ba duplikasi', 'alista', 'salah input'],
    'Alista - Material & Reservasi': ['input material', 'reservasi id', 'reservasi double'],
    'Alista - PIC Controller': ['pic controler', 'pic kontroler']
};

// ====================== ROUTES ======================

// [GET] /api/tickets - Mendapatkan semua tiket dengan statistik
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
        const allFilteredTickets = await Ticket.find(filters);

        // ===== KALKULASI STATISTIK =====
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterdayStart = new Date(new Date().setDate(now.getDate() - 1));
        yesterdayStart.setHours(0, 0, 0, 0);
        
        const statsResult = await Ticket.aggregate([
          { $match: filters },
          {
            $facet: {
              "statusCounts": [
                { $group: { _id: "$status", count: { $sum: 1 } } }
              ],
              "picCounts": [
                { $group: { _id: { $ifNull: ["$pic", "Belum Ditentukan"] }, count: { $sum: 1 } } }
              ],
              "dailyStats": [
                {
                  $group: {
                    _id: null,
                    today_diproses: { $sum: { $cond: [{ $and: [{ $gte: ["$createdAt", todayStart] }, { $ne: ["$status", "Done"] }] }, 1, 0] } },
                    today_selesai: { $sum: { $cond: [{ $and: [{ $gte: ["$createdAt", todayStart] }, { $eq: ["$status", "Done"] }] }, 1, 0] } },
                    yesterday_diproses: { $sum: { $cond: [{ $and: [{ $gte: ["$createdAt", yesterdayStart] }, { $lt: ["$createdAt", todayStart] }, { $ne: ["$status", "Done"] }] }, 1, 0] } },
                    yesterday_selesai: { $sum: { $cond: [{ $and: [{ $gte: ["$createdAt", yesterdayStart] }, { $lt: ["$createdAt", todayStart] }, { $eq: ["$status", "Done"] }] }, 1, 0] } }
                  }
                }
              ]
            }
          }
        ]);
    
        const stats = { picList: PIC_LIST, statusList: STATUS_LIST };
        stats.statusCounts = {};
        STATUS_LIST.forEach(s => {
            stats.statusCounts[s] = statsResult[0].statusCounts.find(sc => sc._id === s)?.count || 0;
        });

        const picData = {};
        statsResult[0].picCounts.forEach(p => { picData[p._id] = p.count; });
        stats.picData = picData;
        
        const dailyData = statsResult[0].dailyStats[0] || {};
        stats.statsToday = { diproses: dailyData.today_diproses || 0, selesai: dailyData.today_selesai || 0 };
        stats.statsYesterday = { diproses: dailyData.yesterday_diproses || 0, selesai: dailyData.yesterday_selesai || 0 };
    
        const caseData = {};
        allFilteredTickets.forEach(ticket => {
          const textLower = (ticket.text || "").toLowerCase();
          let matched = false;
          for (const [category, keywords] of Object.entries(CASE_KEYWORDS)) {
            if (keywords.some(k => textLower.includes(k))) {
              caseData[category] = (caseData[category] || 0) + 1;
              matched = true;
              break;
            }
          }
          if (!matched) caseData['Lainnya'] = (caseData['Lainnya'] || 0) + 1;
        });
        stats.caseData = caseData;
    
        res.json({ tickets, totalPages, currentPage: page, stats });

    } catch (err) {
        console.error("❌ Error saat mengambil data tiket:", err);
        res.status(500).json({ message: 'Gagal memuat statistik.' });
    }
});

// [POST] /api/tickets/:id/reply
router.post('/:id/reply', authMiddleware, upload.single('photo'), async (req, res) => {
    try {
        const { balasan } = req.body;
        const ticket = await Ticket.findById(req.params.id);

        if (!balasan || !ticket) {
            return res.status(400).json({ message: 'Input tidak valid atau tiket tidak ditemukan.' });
        }

        ticket.adminMessage = balasan;
        await ticket.save();

        const replyNotification = `💬 *Update dari IT TA untuk tiket ${escapeMarkdownV2(ticket.ticketCode)}:*\n\n${escapeMarkdownV2(balasan)}`;
        
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
        console.error('❌ Gagal mengirim balasan:', err);
        res.status(500).json({ message: 'Gagal mengirim balasan.' });
    }
});

// [PATCH] /api/tickets/:id/set-status
router.patch('/:id/set-status', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        if (!status || !STATUS_LIST.includes(status)) {
            return res.status(400).json({ message: 'Status tidak valid.' });
        }

        const updateData = { status };
        if (status === 'Done') {
            updateData.completedAt = new Date();
        } else {
            updateData.completedAt = null;
        }

        const ticket = await Ticket.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!ticket) return res.status(404).json({ message: 'Tiket tidak ditemukan.' });

        const statusUpdateMessage = `ℹ️ Status tiket *${escapeMarkdownV2(ticket.ticketCode)}* diubah menjadi *${escapeMarkdownV2(status)}*\\.`;        
        try {
            await bot.sendMessage(ticket.chatId, statusUpdateMessage, {
                parse_mode: "MarkdownV2",
                reply_to_message_id: ticket.messageId
            });
        } catch (telegramError) {
            console.error(`❌ Gagal mengirim notifikasi status ke chatId ${ticket.chatId}:`, telegramError.message);
        }

        res.json(ticket);
    } catch (err) {
        console.error("❌ Gagal mengubah status:", err);
        res.status(500).json({ message: 'Gagal mengubah status.' });
    }
});

// [PUT] /api/tickets/:id/status (tambahan baru, versi simple)
router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatus = ['diproses', 'on hold', 'waiting third party', 'done'];

    if (!validStatus.includes(status.toLowerCase())) {
      return res.status(400).json({ message: 'Status tidak valid' });
    }

    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket tidak ditemukan' });
    }

    res.json({ message: 'Status berhasil diubah', ticket });
  } catch (err) {
    console.error('Error ubah status:', err);
    res.status(500).json({ message: 'Gagal mengubah status' });
  }
});

// [PATCH] /api/tickets/:id/set-pic
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

// [GET] /api/tickets/export
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
        console.error('❌ Gagal mengekspor data:', err);
        res.status(500).send('Gagal mengekspor data ke Excel.');
    }
});

module.exports = router;
