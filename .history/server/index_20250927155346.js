require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const excel = require('exceljs');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const PQueue = require('p-queue').default;

// Import routes auth
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Middleware =====
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== Koneksi MongoDB (Update tanpa warning) =====
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/operationalserver')
  .then(() => console.log('✅ MongoDB connected!'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ===== Schema & Model =====
const ticketSchema = new mongoose.Schema({
  ticketCode: { type: String, required: true, unique: true },
  chatId: { type: Number, required: true },
  messageId: { type: Number, required: true },
  username: { type: String, default: "Anonim" },
  telegramUserId: { type: Number, required: true },
  chatType: { type: String, default: 'private' },
  groupName: { type: String, default: 'Private Chat' },
  text: { type: String, required: true },
  status: {
    type: String,
    default: 'Diproses',
    enum: ['Diproses', 'On Hold', 'Menunggu Approval', 'Done']
  },
  adminMessage: { type: String, default: "" },
  pic: { type: String, default: 'BelumDitentukan' },
  photoUrl: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null }
});
const Ticket = mongoose.model('Ticket', ticketSchema);


bot.on('new_chat_members', (msg) => {
  const chatId = msg.chat.id;

  msg.new_chat_members.forEach(member => {
    if (member.username === process.env.BOT_USERNAME) {
      const introText = `
👋 Halo semuanya! Saya adalah **Bot Operasional** 🚀  

Berikut fitur yang bisa dipakai di grup ini:
- 📝 Kirim laporan kendala dengan **#kendala [deskripsi]**  
- 🔍 Cek status laporan dengan **#lacak [kode tiket]**  
- ⚡ Sistem anti-spam: tunggu 5 detik sebelum kirim laporan berikutnya  
- 📊 Semua kendala akan diproses tim kami secara otomatis

> Jadilah keren, hemat waktu, semua kendala langsung tercatat rapi.  
Terima kasih sudah menambahkan saya ke grup ini 🙏
      `;

      bot.sendMessage(chatId, introText, { parse_mode: 'Markdown' });
    }
  });
});

// ===== Daftar PIC & Status =====
const PIC_LIST = ['BelumDitentukan', 'sal', 'alf', 'rdh', 'fhn', 'drl', 'raf'];
const STATUS_LIST = ['Diproses', 'On Hold', 'Menunggu Approval', 'Done'];

// ===== Keywords untuk klasifikasi kasus =====
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

// ===== Telegram Bot + Queue =====
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  polling: { interval: 500, autoStart: true }
});
bot.on('polling_error', err => console.error('❌ Polling Error:', err && err.code));
console.log('🤖 Bot Telegram berjalan...');

// Global queue to protect Telegram API from bursts
const queue = new PQueue({ interval: 1000, intervalCap: 20 }); // max ~20 actions per second

// helper to add tiny jitter inside queue to smooth spikes
function queuedCall(fn) {
  return queue.add(() => {
    const jitter = Math.floor(Math.random() * 200); // 0-200ms jitter
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        fn().then(resolve).catch(reject);
      }, jitter);
    });
  });
}

function sendMessage(chatId, text, options = {}) {
  return queuedCall(() => bot.sendMessage(chatId, text, options));
}
function sendPhoto(chatId, photo, options = {}) {
  return queuedCall(() => bot.sendPhoto(chatId, photo, options));
}

// ===== Rate Limit Per User (5 detik) =====
const userCooldown = new Map(); // userId -> lastTimestamp
const COOLDOWN_MS = 5000; // 5 seconds

function canSendTicket(userId) {
  const now = Date.now();
  const last = userCooldown.get(userId) || 0;
  if (now - last < COOLDOWN_MS) return false;
  userCooldown.set(userId, now);
  return true;
}

// ===== Fungsi generate kode tiket =====
async function generateTicketCode() {
  const count = await Ticket.countDocuments();
  const codeNumber = (count + 1).toString().padStart(3, '0');
  return `OPS-${codeNumber}`;
}

// ===== Escape MarkdownV2 =====
function escapeMarkdownV2(text = '') {
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

// ===== Bot Listener #kendala =====
bot.on('message', async msg => {
  if (msg.from.is_bot) return;

  const chatId = msg.chat.id;
  const messageId = msg.message_id;
  const usernameRaw = msg.from.username || `${msg.from.first_name || ''} ${msg.from.last_name || ''}`.trim() || "Anonim";
  const telegramUserId = msg.from.id;
  const chatType = msg.chat.type;
  const groupName = chatType === 'private' ? 'Private Chat' : msg.chat.title;
  const textRaw = (msg.caption || msg.text || "").toString();

  if (textRaw.toLowerCase().includes('#kendala')) {
    // rate-limit per user
    if (!canSendTicket(telegramUserId)) {
      return sendMessage(chatId, '⚠️ Tunggu 5 detik sebelum mengirim kendala lagi ya.', { reply_to_message_id: messageId });
    }

    try {
      let photoUrl = null;
      if (msg.photo) {
        const bestPhoto = msg.photo[msg.photo.length - 1];
        try {
          photoUrl = await bot.getFileLink(bestPhoto.file_id);
        } catch (e) {
          console.warn('⚠️ Gagal ambil file link:', e && e.message);
        }
      }

      const extractedText = textRaw.split(/#kendala/i)[1]?.trim() || (msg.photo ? "(gambar terlampir)" : "(tidak ada deskripsi)");
      const ticketCode = await generateTicketCode();

      const newTicket = new Ticket({
        ticketCode,
        chatId,
        messageId,
        username: usernameRaw,
        telegramUserId,
        chatType,
        groupName,
        text: extractedText,
        photoUrl
      });

      await newTicket.save();

      await sendMessage(chatId,
        `✅ <b>Tiket Diterima!</b>\n\nTerima kasih, laporan Anda dicatat dengan kode:\n<code>${ticketCode}</code>\n\nGunakan <code>#lacak ${ticketCode}</code> untuk cek status.`,
        { parse_mode: 'HTML', reply_to_message_id: messageId }
      );

      console.log('===== NEW TICKET =====', { ticketCode, chatId, usernameRaw, extractedText, photoUrl });
    } catch (err) {
      console.error('❌ Gagal mencatat tiket:', err);
      await sendMessage(chatId, `❌ Terjadi kesalahan sistem saat mencatat kendala Anda.\nError: ${err.message}`, { reply_to_message_id: messageId });
    }
  }
});

// ===== Listener tombol copy (callback) =====
bot.on('callback_query', async callbackQuery => {
  const msg = callbackQuery.message;
  const data = callbackQuery.data;

  if (data && data.startsWith('copy_')) {
    const ticketCode = data.replace('copy_', '');
    // answerCallbackQuery is lightweight and not counted as sendMessage; still safe
    try {
      await bot.answerCallbackQuery(callbackQuery.id, { text: `${ticketCode} disalin!` });
    } catch (e) {
      console.warn('⚠️ answerCallbackQuery failed:', e && e.message);
    }
  }
});

// ===== Listener #lacak =====
bot.onText(/#lacak (.+)/, async (msg, match) => {
  try {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const code = match[1]?.toUpperCase();

    if (!code) return sendMessage(chatId, '❌ Format salah. Gunakan #lacak <kode_tiket>', { reply_to_message_id: messageId });

    const ticket = await Ticket.findOne({ ticketCode: code });
    if (!ticket) return sendMessage(chatId, `❌ Tiket ${code} tidak ditemukan.`, { reply_to_message_id: messageId });

    const created = ticket.createdAt;
    const createdTanggal = `${created.getDate()}/${created.getMonth()+1}/${created.getFullYear()}`;
    const createdWaktu = `${created.getHours().toString().padStart(2,'0')}.${created.getMinutes().toString().padStart(2,'0')}.${created.getSeconds().toString().padStart(2,'0')}`;

    const completed = ticket.completedAt;
    const completedTanggal = completed ? `${completed.getDate()}/${completed.getMonth()+1}/${completed.getFullYear()}` : "-";
    const completedWaktu = completed ? `${completed.getHours().toString().padStart(2,'0')}.${completed.getMinutes().toString().padStart(2,'0')}.${completed.getSeconds().toString().padStart(2,'0')}` : "-";

    const statusMessage = ticket.status === 'Done' ? `✅ ${ticket.status}` : `🟡 ${ticket.status}`;

    let statusText = `🔍 Status Tiket \`${escapeMarkdownV2(ticket.ticketCode)}\`\n` +
      `Status: ${escapeMarkdownV2(statusMessage)}\n` +
      `Kendala: \`${escapeMarkdownV2(ticket.text)}\`\n` +
      `Grup: ${escapeMarkdownV2(ticket.groupName)}\n` +
      `Dilaporkan pada: ${escapeMarkdownV2(createdTanggal)}, ${escapeMarkdownV2(createdWaktu)}\n`;

    if (ticket.status === 'Done') {
      statusText += `Selesai pada: ${escapeMarkdownV2(completedTanggal)}, ${escapeMarkdownV2(completedWaktu)}\n`;
      if (ticket.adminMessage) statusText += `📌 Catatan dari IT TA: ${escapeMarkdownV2(ticket.adminMessage)}\n`;
    }

    await sendMessage(chatId, statusText, { parse_mode: 'MarkdownV2', reply_to_message_id: messageId });

  } catch (err) {
    console.error('❌ Error #lacak listener:', err);
    await sendMessage(msg.chat.id, '❌ Terjadi kesalahan saat menampilkan status tiket.', { reply_to_message_id: msg.message_id });
  }
});

// ===== API Routes =====

// GET semua tiket + stats
app.get('/api/tickets', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const filters = {};

    // --- PERUBAHAN PADA FILTER STATUS ---
    if (req.query.status && req.query.status !== 'all') {
      // Cek apakah query status mengandung koma (,)
      if (req.query.status.includes(',')) {
        // Jika ya, pecah string menjadi array, lalu gunakan operator $in
        filters.status = { $in: req.query.status.split(',') };
      } else {
        // Jika tidak, perlakukan seperti biasa
        filters.status = req.query.status;
      }
    }
    // --- AKHIR PERUBAHAN ---

    if (req.query.pic && req.query.pic !== 'all') filters.pic = req.query.pic;
    if (req.query.startDate) filters.createdAt = { ...filters.createdAt, $gte: new Date(req.query.startDate) };
    if (req.query.endDate) {
      const endOfDay = new Date(req.query.endDate);
      endOfDay.setHours(23, 59, 59, 999);
      filters.createdAt = { ...filters.createdAt, $lte: endOfDay };
    }

    // ===== Penambahan Filter Pencarian Umum =====
    if (req.query.search) {
      const searchRegex = { $regex: req.query.search, $options: 'i' }; // 'i' = case-insensitive
      filters.$or = [
        { ticketCode: searchRegex },
        { text: searchRegex },
        { username: searchRegex },
        { groupName: searchRegex }
      ];
    }
    // ===========================================

    const tickets = await Ticket.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit);
    const totalTickets = await Ticket.countDocuments(filters);
    const totalPages = Math.ceil(totalTickets / limit);
    const allFilteredTickets = await Ticket.find(filters);

    // ===== Statistik =====
    const initialStats = {
      totalDiproses: 0,
      totalSelesai: 0,
      picData: {},
      caseData: {},
      statsToday: { diproses: 0, selesai: 0 },
      statsYesterday: { diproses: 0, selesai: 0 },
      picList: PIC_LIST
    };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(new Date().setDate(now.getDate() - 1));
    yesterdayStart.setHours(0, 0, 0, 0);

    const finalStats = allFilteredTickets.reduce((acc, ticket) => {
      if (ticket.status === 'Done') acc.totalSelesai++;
      else acc.totalDiproses++;

      const picKey = ticket.pic || 'BelumDitentukan';
      acc.picData[picKey] = (acc.picData[picKey] || 0) + 1;

      const textLower = (ticket.text || '').toLowerCase();
      let matched = false;
      for (const [category, keywords] of Object.entries(CASE_KEYWORDS)) {
        if (keywords.some(k => textLower.includes(k))) {
          acc.caseData[category] = (acc.caseData[category] || 0) + 1;
          matched = true;
          break;
        }
      }
      if (!matched) acc.caseData['Lainnya'] = (acc.caseData['Lainnya'] || 0) + 1;

      const ticketDate = new Date(ticket.createdAt);
      if (ticketDate >= todayStart) {
        if (ticket.status === 'Done') acc.statsToday.selesai++;
        else acc.statsToday.diproses++;
      } else if (ticketDate >= yesterdayStart && ticketDate < todayStart) {
        if (ticket.status === 'Done') acc.statsYesterday.selesai++;
        else acc.statsYesterday.diproses++;
      }

      return acc;
    }, initialStats);

    res.json({ tickets, totalPages, currentPage: page, stats: finalStats });
  } catch (err) {
    console.error('❌ Error saat mengambil data tiket:', err);
    res.status(500).json({ message: 'Gagal memuat tiket.' });
  }
});

// POST balasan (dengan optional foto)
app.post('/api/tickets/:id/reply', upload.single('photo'), async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    const { balasan } = req.body;

    if (!balasan || !ticket) return res.status(400).json({ message: 'Input tidak valid atau tiket tidak ditemukan.' });

    ticket.adminMessage = balasan;
    ticket.status = 'Done';
    ticket.completedAt = new Date();

    if (req.file) {
      try {
        await sendPhoto(ticket.chatId, req.file.buffer, {
          caption: `💬 <b>Update dari IT TA:</b>\n${balasan}`,
          parse_mode: 'HTML',
          reply_to_message_id: ticket.messageId
        });
      } catch (err) {
        console.error('❌ Gagal mengirim balasan dengan foto:', err);
      }
    } else {
      try {
        await sendMessage(ticket.chatId, `💬 <b>Update dari IT TA:</b>\n${balasan}`, {
          parse_mode: 'HTML',
          reply_to_message_id: ticket.messageId
        });
      } catch (err) {
        console.error('❌ Gagal mengirim balasan ke Telegram:', err);
      }
    }

    await ticket.save();
    res.json({ success: true, message: 'Balasan terkirim dan tiket diperbarui.' });
  } catch (err) {
    console.error('❌ Gagal menyelesaikan tiket:', err);
    res.status(500).json({ message: 'Gagal memperbarui tiket.' });
  }
});

// PATCH set PIC
app.patch('/api/tickets/:id/set-pic', async (req, res) => {
  try {
    const { pic } = req.body;
    if (!PIC_LIST.includes(pic) && pic !== 'BelumDitentukan') return res.status(400).json({ message: 'PIC tidak valid.' });

    const ticket = await Ticket.findByIdAndUpdate(req.params.id, { pic }, { new: true });
    res.json(ticket);
  } catch (err) {
    console.error('❌ Gagal set PIC:', err);
    res.status(500).json({ message: 'Gagal menetapkan PIC.' });
  }
});

// PATCH update status tiket
app.patch('/api/tickets/:id/set-status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!STATUS_LIST.includes(status)) return res.status(400).json({ message: 'Status tidak valid.' });

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Tiket tidak ditemukan.' });

    ticket.status = status;
    ticket.completedAt = status === 'Done' ? new Date() : null;
    await ticket.save();

    try {
      await sendMessage(ticket.chatId, `Status tiket <code>${ticket.ticketCode}</code> diperbarui menjadi: ${status}`, {
        parse_mode: 'HTML',
        reply_to_message_id: ticket.messageId
      });
    } catch (err) {
      console.error('Gagal kirim notifikasi Telegram:', err);
    }

    res.json(ticket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memperbarui status tiket.' });
  }
});

// Export Excel
app.get('/api/tickets/export', async (req, res) => {
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
  } catch (err) {
    console.error('❌ Gagal mengekspor data:', err);
    res.status(500).send('Gagal mengekspor data ke Excel.');
  }
});

// ===== Auth Routes =====
app.use('/api/auth', authRoutes);

// ===== Jalankan Server =====
app.listen(PORT, () => console.log(`🚀 Server berjalan di http://localhost:${PORT}`));
