// file: server/index.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const excel = require('exceljs');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// ===== Impor dari file-file lokal =====
const authRoutes = require('./routes/auth');
const authMiddleware = require('./middleware/auth'); // Pastikan path ini sesuai
const Ticket = require('./models/Ticket'); // Impor model Ticket
const Counter = require('./models/Counter'); // Impor model Counter untuk kode tiket

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Middleware =====
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== Koneksi MongoDB =====
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Terhubung ke MongoDB'))
  .catch(err => console.error('❌ Gagal terhubung ke MongoDB:', err));

// ===== Daftar PIC & Keywords (dari kode asli) =====
const PIC_LIST = ['BelumDitentukan','sal','alf','rdh','fhn','drl','raf'];
const CASE_KEYWORDS = {
  'WFM - Mismatch Tiket': ['wfm not found','tiket not found', 'double tiket','wfm kosong','tidak bisa terclose','wfm masih open','gadak di wfm'],
  'WFM - Tiket Nyangkut (Stuck)': ['nyangkut di finalcheck','nyangkut di backend','nyangkut di mediacare','nyangkut di slamsim','tidak bisa closed','wfm stuck backend','insera hilang'],
  'WFM - Work Order Tidak Muncul': ['work order tidak muncul','wo tidak muncul','workorder section','assignment section'],
  'WFM - Masalah Akun Pengguna': ['user terkunci','gagal login','otp tidak masuk','user not registered','reset rekan teknisi'],
  'WFM - Teknisi Tidak Ditemukan': ['technician not found','teknisi tidak ditemukan'],
  'WFM - Masalah Owner Group': ['owner grup','owner group','owner group, witel,service id , service number , dll kosong','munculkan owner'],
  'INSERA - Mismatch Tiket': ['insera tidak muncul','insera not found','not found di insera','insera gadak','gadak di insera'],
  'Mytech - Masalah Akun / Login': ['user_rsc_notactive','user_notactive','user auth failed','user_auth_locked'],
  'SAP - Revoke': ['revoke'],
  'Alista - Koreksi Data': ['delete bai','ba duplikasi','alista','salah input'],
  'Alista - Material & Reservasi': ['input material','reservasi id','reservasi double'],
  'Alista - PIC Controller': ['pic controler','pic kontroler']
};

// ===== Inisialisasi Bot Telegram =====
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
bot.on('polling_error', err => console.error('❌ Polling Error:', err.code));
console.log('🤖 Bot Telegram berjalan...');

// ===== Helper Functions =====

// Fungsi untuk mendapatkan nomor urut tiket (lebih robust)
async function getNextSequenceValue(sequenceName) {
  const sequenceDocument = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return sequenceDocument.seq;
}

// Fungsi generate kode tiket (diperbarui)
async function generateTicketCode() {
  const sequenceNumber = await getNextSequenceValue('ticketId');
  const codeNumber = sequenceNumber.toString().padStart(3, '0');
  return `OPS-${codeNumber}`;
}

// Escape MarkdownV2 (dari kode asli)
function escapeMarkdownV2(text = '') {
    // Implementasi lengkap dari kode asli Anda
    return text
    .replace(/\\/g, '\\\\')
    .replace(/\./g, '\\.')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/~/g, '\\~')
    .replace(/`/g, '\\`')
    .replace(/>/g, '\\>')
    .replace(/#/g, '\\#')
    .replace(/\+/g, '\\+')
    .replace(/-/g, '\\-')
    .replace(/=/g, '\\=')
    .replace(/\|/g, '\\|')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/!/g, '\\!');
}

// ===== Bot Listeners =====

// Listener #kendala (dari kode asli, dengan generateTicketCode baru)
bot.on('message', async msg => {
  if (msg.from.is_bot) return;

  const chatId = msg.chat.id;
  const messageId = msg.message_id;
  const usernameRaw = msg.from.username || `${msg.from.first_name || ''} ${msg.from.last_name || ''}`.trim() || "Anonim";
  const telegramUserId = msg.from.id;
  const chatType = msg.chat.type;
  const groupName = chatType === 'private' ? 'Private Chat' : msg.chat.title;
  const textRaw = msg.caption || msg.text || "";

  if (textRaw.toLowerCase().includes('#kendala')) {
    try {
      let photoUrl = null;
      if (msg.photo) {
        const bestPhoto = msg.photo[msg.photo.length - 1];
        photoUrl = await bot.getFileLink(bestPhoto.file_id);
      }

      const extractedText = textRaw.split(/#kendala/i)[1]?.trim() || (msg.photo ? "(gambar terlampir)" : "(tidak ada deskripsi)");
      const ticketCode = await generateTicketCode(); // Menggunakan fungsi baru

      const newTicket = new Ticket({
        ticketCode,
        chatId,
        messageId,
        username: usernameRaw,
        telegramUserId,
        chatType,
        groupName,
        text: extractedText,
        photoUrl,
        // Properti lain dari skema Anda akan memiliki nilai default
      });

      await newTicket.save();

      await bot.sendMessage(chatId,
        `✅ <b>Tiket Diterima!</b>\n\nTerima kasih, laporan Anda dicatat dengan kode:\n<code>${ticketCode}</code>\n\nGunakan <code>#lacak ${ticketCode}</code> untuk cek status.`,
        { parse_mode: 'HTML', reply_to_message_id: messageId }
      );

      console.log('===== NEW TICKET =====', { ticketCode, chatId, usernameRaw, extractedText, photoUrl });
    } catch (err) {
      console.error('❌ Gagal mencatat tiket:', err);
      bot.sendMessage(chatId, `❌ Terjadi kesalahan sistem saat mencatat kendala Anda.\nError: ${err.message}`, { reply_to_message_id: messageId });
    }
  }
});

// Listener tombol copy (dari kode asli)
bot.on('callback_query', async callbackQuery => {
  const msg = callbackQuery.message;
  const data = callbackQuery.data;

  if (data.startsWith('copy_')) {
    const ticketCode = data.replace('copy_', '');
    await bot.answerCallbackQuery(callbackQuery.id, { text: `${ticketCode} disalin!` });
  }
});

// Listener #lacak (dari kode asli)
bot.onText(/#lacak (.+)/, async (msg, match) => {
  try {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const code = match[1]?.toUpperCase();

    if (!code) return bot.sendMessage(chatId, '❌ Format salah. Gunakan #lacak <kode_tiket>', { reply_to_message_id: messageId });

    const ticket = await Ticket.findOne({ ticketCode: code });
    if (!ticket) return bot.sendMessage(chatId, `❌ Tiket ${code} tidak ditemukan.`, { reply_to_message_id: messageId });

    const created = ticket.createdAt;
    const createdTanggal = `${created.getDate()}/${created.getMonth()+1}/${created.getFullYear()}`;
    const createdWaktu = `${created.getHours().toString().padStart(2,'0')}.${created.getMinutes().toString().padStart(2,'0')}.${created.getSeconds().toString().padStart(2,'0')}`;

    const completed = ticket.completedAt;
    const completedTanggal = completed ? `${completed.getDate()}/${completed.getMonth()+1}/${completed.getFullYear()}` : "-";
    const completedWaktu = completed ? `${completed.getHours().toString().padStart(2,'0')}.${completed.getMinutes().toString().padStart(2,'0')}.${completed.getSeconds().toString().padStart(2,'0')}` : "-";

    const statusColored = ticket.status === 'Selesai' ? '✅ Selesai' : '🟡 Diproses';

    let statusText = `🔍 Status Tiket \`${escapeMarkdownV2(ticket.ticketCode)}\`\n`+
                     `Status: ${escapeMarkdownV2(statusColored)}\n`+
                     `Kendala: \`${escapeMarkdownV2(ticket.text)}\`\n`+
                     `Grup: ${escapeMarkdownV2(ticket.groupName)}\n`+
                     `Dilaporkan pada: ${escapeMarkdownV2(createdTanggal)}, ${escapeMarkdownV2(createdWaktu)}\n`;

    if(ticket.status === 'Selesai') {
      statusText += `Selesai pada: ${escapeMarkdownV2(completedTanggal)}, ${escapeMarkdownV2(completedWaktu)}\n`;
      if(ticket.adminMessage) statusText += `📌 Catatan dari IT TA: ${escapeMarkdownV2(ticket.adminMessage)}\n`;
    }

    await bot.sendMessage(chatId, statusText, { parse_mode: 'MarkdownV2', reply_to_message_id: messageId });

  } catch (err) {
    console.error('❌ Error #lacak listener:', err);
    bot.sendMessage(msg.chat.id, '❌ Terjadi kesalahan saat menampilkan status tiket.', { reply_to_message_id: msg.message_id });
  }
});

// ===== API Routes =====

// Rute Publik (Baru) - Untuk cek status cepat
app.get('/api/tickets/status/:ticketCode', async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ ticketCode: req.params.ticketCode.toUpperCase() });
    if (!ticket) {
      return res.status(404).json({ message: 'Tiket tidak ditemukan.' });
    }
    res.json({
      ticketCode: ticket.ticketCode,
      status: ticket.status,
      createdAt: ticket.createdAt,
      completedAt: ticket.completedAt,
      adminMessage: ticket.adminMessage
    });
  } catch (err) {
    console.error("❌ Error saat mengambil status tiket:", err);
    res.status(500).json({ message: 'Gagal memuat status tiket.' });
  }
});


// ===== Protected API Routes (Memerlukan Login) =====

// GET semua tiket + stats (dari kode asli, dengan authMiddleware)
app.get('/api/tickets', authMiddleware, async (req, res) => {
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

    // Kalkulasi Statistik (dari kode asli)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(new Date().setDate(now.getDate() - 1));
    yesterdayStart.setHours(0, 0, 0, 0);
    
    const statsResult = await Ticket.aggregate([
      { $match: filters },
      {
        $facet: {
          "statusCounts": [{ $group: { _id: "$status", count: { $sum: 1 } } }],
          "picCounts": [{ $group: { _id: { $ifNull: ["$pic", "Belum Ditentukan"] }, count: { $sum: 1 } } }],
          "dailyStats": [
            {
              $group: {
                _id: null,
                today_diproses: { $sum: { $cond: [{ $and: [{ $gte: ["$createdAt", todayStart] }, { $eq: ["$status", "Diproses"] }] }, 1, 0] } },
                today_selesai: { $sum: { $cond: [{ $and: [{ $gte: ["$createdAt", todayStart] }, { $eq: ["$status", "Selesai"] }] }, 1, 0] } },
                yesterday_diproses: { $sum: { $cond: [{ $and: [{ $gte: ["$createdAt", yesterdayStart] }, { $lt: ["$createdAt", todayStart] }, { $eq: ["$status", "Diproses"] }] }, 1, 0] } },
                yesterday_selesai: { $sum: { $cond: [{ $and: [{ $gte: ["$createdAt", yesterdayStart] }, { $lt: ["$createdAt", todayStart] }, { $eq: ["$status", "Selesai"] }] }, 1, 0] } }
              }
            }
          ]
        }
      }
    ]);

    const stats = { picList: PIC_LIST };
    stats.totalDiproses = statsResult[0].statusCounts.find(s => s._id === 'Diproses')?.count || 0;
    stats.totalSelesai = statsResult[0].statusCounts.find(s => s._id === 'Selesai')?.count || 0;
    
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

// Export Excel (dari kode asli, dengan authMiddleware)
app.get('/api/tickets/export', authMiddleware, async (req, res) => {
    try {
        const tickets = await Ticket.find().sort({ createdAt: -1 });
        const workbook = new excel.Workbook();
        const worksheet = workbook.addWorksheet('Daftar Kendala');

        worksheet.columns = [
            { header: 'Kode Tiket', key: 'ticketCode', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
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
    } catch(err){
        console.error('❌ Gagal mengekspor data:', err);
        res.status(500).send('Gagal mengekspor data ke Excel.');
    }
});

// POST balasan (dari kode asli, dengan authMiddleware)
app.post('/api/tickets/:id/reply', authMiddleware, upload.single('photo'), async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id);
        const { balasan } = req.body;

        if(!balasan || !ticket) return res.status(400).json({ message: 'Input tidak valid atau tiket tidak ditemukan.' });

        ticket.adminMessage = balasan;
        ticket.status = 'Selesai';
        ticket.completedAt = new Date();

        const successMessage = `💬 <b>Update dari IT TA untuk ${ticket.ticketCode}:</b>\n${balasan}`;

        if (req.file) {
            try {
                await bot.sendPhoto(ticket.chatId, req.file.buffer, {
                    caption: successMessage,
                    parse_mode: 'HTML',
                    reply_to_message_id: ticket.messageId
                });
            } catch(err) {
                console.error('❌ Gagal mengirim balasan dengan foto:', err.response.body);
            }
        } else {
            try {
                await bot.sendMessage(ticket.chatId, successMessage, {
                    parse_mode: 'HTML',
                    reply_to_message_id: ticket.messageId
                });
            } catch(err) {
                console.error('❌ Gagal mengirim balasan ke Telegram:', err.response.body);
            }
        }

        await ticket.save();
        res.json({ success: true, message: 'Balasan terkirim dan tiket diperbarui.' });
    } catch(err){
        console.error('❌ Gagal menyelesaikan tiket:', err);
        res.status(500).json({ message: 'Gagal memperbarui tiket.' });
    }
});

// PATCH untuk menyelesaikan tiket tanpa balasan (Baru)
app.patch('/api/tickets/:id/complete', authMiddleware, async (req, res) => {
    try {
        const ticket = await Ticket.findByIdAndUpdate(req.params.id, 
            { status: 'Selesai', completedAt: new Date() }, 
            { new: true }
        );

        if (!ticket) {
            return res.status(404).json({ message: 'Tiket tidak ditemukan.' });
        }
        
        // Kirim notifikasi senyap ke Telegram
        try {
            await bot.sendMessage(ticket.chatId, `✅ Tiket <code>${ticket.ticketCode}</code> telah diselesaikan oleh tim IT TA.`, {
                parse_mode: 'HTML',
                reply_to_message_id: ticket.messageId
            });
        } catch(err) {
            console.error('❌ Gagal mengirim notifikasi penyelesaian:', err.response.body);
        }

        res.json({ success: true, ticket });
    } catch (err) {
        console.error('❌ Gagal menyelesaikan tiket:', err);
        res.status(500).json({ message: 'Gagal memperbarui status tiket.' });
    }
});

// PATCH set PIC (dari kode asli, dengan authMiddleware)
app.patch('/api/tickets/:id/set-pic', authMiddleware, async (req, res) => {
    try {
        const { pic } = req.body;
        if(!PIC_LIST.includes(pic) && pic !== 'BelumDitentukan') {
            return res.status(400).json({ message: 'PIC tidak valid.' });
        }
        const ticket = await Ticket.findByIdAndUpdate(req.params.id, { pic }, { new: true });
        
        if (!ticket) {
            return res.status(404).json({ message: 'Tiket tidak ditemukan.' });
        }

        res.json(ticket);
    } catch(err){
        console.error('❌ Gagal set PIC:', err);
        res.status(500).json({ message: 'Gagal menetapkan PIC.' });
    }
});

// ===== Auth Routes (Wajib di bagian bawah sebelum listen) =====
app.use('/api/auth', authRoutes);

// ===== Jalankan Server =====
app.listen(PORT, () => console.log(`🚀 Server berjalan di http://localhost:${PORT}`));