require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const excel = require('exceljs');
const multer = require('multer');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const PQueue = require('p-queue').default;

// Import routes auth (Asumsi file ini ada)
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({ storage: multer.memoryStorage() });

// ====================================================================
// ===== BAGIAN 1: MIDDLEWARE & KONEKSI DATABASE
// ====================================================================

// ===== Middleware =====
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== Koneksi MongoDB [FIXED: Menghapus opsi deprecated] =====
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/operationalserver')
  .then(() => console.log('✅ MongoDB connected!'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ===== Schema & Model =====
const ticketSchema = new mongoose.Schema({
  ticketCode: { type: String, required: true, unique: true },
  platform: { type: String, enum: ['Telegram', 'WhatsApp'], default: 'Telegram' },
  chatId: { type: String, required: true },
  messageId: { type: String, required: true },
  username: { type: String, default: "Anonim" },
  telegramUserId: { type: String, required: true }, // Digunakan untuk Telegram ID atau WhatsApp Phone Number
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
  photoUrl: { type: String, default: null }, // Akan diisi placeholder jika ada media WA
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null }
});
const Ticket = mongoose.model('Ticket', ticketSchema);

// ===== Daftar PIC & Status (Dibiarkan sama) =====
const PIC_LIST = ['BelumDitentukan', 'sal', 'alf', 'rdh', 'fhn', 'drl', 'raf'];
const STATUS_LIST = ['Diproses', 'On Hold', 'Menunggu Approval', 'Done'];

// ===== Keywords untuk klasifikasi kasus (Dibiarkan sama) =====
const CASE_KEYWORDS = {
  'WFM - Mismatch Tiket': ['wfm not found', 'tiket not found', 'double tiket', 'wfm kosong', 'tidak bisa terclose', 'wfm masih open', 'gadak di wfm'],
  'WFM - Tiket Nyangkut (Stuck)': ['nyangkut di finalcheck', 'nyangkut di backend', 'nyangkut di mediacare', 'nyangkut di slamsim', 'tidak bisa closed', 'wfm stuck backend', 'insera hilang', 'tidak bisa push scc'],
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

// ====================================================================
// ===== BAGIAN 2: LOGIKA & INISIALISASI BOT
// ====================================================================

// ===== Telegram Bot + Queue (Dibiarkan sama) =====
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  polling: { interval: 500, autoStart: true }
});
bot.on('polling_error', err => console.error('❌ Polling Error:', err && err.code));
console.log('🤖 Bot Telegram berjalan...');

const queue = new PQueue({ interval: 1000, intervalCap: 20 });

function queuedCall(fn) {
  return queue.add(() => {
    const jitter = Math.floor(Math.random() * 200);
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

// ===== INISIALISASI BOT WHATSAPP [Diperbaiki Konfigurasi Puppeteer] =====
let waClientReady = false;

const waClient = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--no-default-browser-check',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--single-process',
      '--no-zygote'
    ],
  }
});

waClient.on('qr', qr => {
  console.log('📱 Scan QR Code WhatsApp ini dengan ponsel Anda:');
  qrcode.generate(qr, { small: true });
});

waClient.on('ready', () => {
  console.log('✅ WhatsApp Client siap!');
  waClientReady = true;
});

waClient.on('auth_failure', (msg) => {
    console.error('❌ Auth failure WhatsApp:', msg);
    waClientReady = false;
});

waClient.on('disconnected', (reason) => {
    console.log('❌ WhatsApp disconnected:', reason);
    waClientReady = false;
});

waClient.on('change_state', (state) => {
    console.log('🔄 WhatsApp state changed:', state);
});

waClient.initialize().catch(err => {
    console.error("❌ Gagal inisialisasi WA Client:", err.message);
});

// ===== Rate Limit Per User (Dibiarkan sama) =====
const userCooldown = new Map();
const COOLDOWN_MS = 5000;

function canSendTicket(userId) {
  const now = Date.now();
  const last = userCooldown.get(userId) || 0;
  if (now - last < COOLDOWN_MS) return false;
  userCooldown.set(userId, now);
  return true;
}

// ===== Fungsi generate kode tiket [PERUBAHAN DI SINI] =====
async function generateTicketCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let isUnique = false;
  let randomCode = '';

  // Terus buat kode baru sampai menemukan yang unik
  while (!isUnique) {
    let result = '';
    for (let i = 0; i < 3; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    randomCode = `OPS-${result}`;
    
    // Cek ke database apakah kode sudah ada
    const existingTicket = await Ticket.findOne({ ticketCode: randomCode });
    if (!existingTicket) {
      isUnique = true;
    }
  }
  return randomCode;
}

// ===== Escape MarkdownV2 [FIXED REGEX] =====
function escapeMarkdownV2(text = '') {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\//g, '\\/')
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

// ====================================================================
// ===== BAGIAN 3: BOT LISTENERS
// ====================================================================

// ===== Bot Listener #kendala (Telegram) - Dibiarkan sama =====
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
        platform: 'Telegram',
        chatId: chatId.toString(),
        messageId: messageId.toString(),
        username: usernameRaw,
        telegramUserId: telegramUserId.toString(),
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
      console.log('===== NEW TICKET (Telegram) =====', { ticketCode, chatId, usernameRaw });
    } catch (err) {
      console.error('❌ Gagal mencatat tiket Telegram:', err);
      await sendMessage(chatId, `❌ Terjadi kesalahan sistem saat mencatat kendala Anda.\nError: ${err.message}`, { reply_to_message_id: messageId });
    }
  }
});

// ===== Bot Listener #kendala (WhatsApp) [MENGGUNAKAN msg.reply] - Diperbarui untuk menyimpan ID bersih DAN media placeholder =====
waClient.on('message', async msg => {
    const text = msg.body;

    if (!waClientReady) {
        return;
    }

    if (text && text.toLowerCase() === 'ping') {
        // Reply untuk ping
        return msg.reply('🏓 Pong dari WhatsApp!');
    }

    if (text && text.toLowerCase().includes('#kendala')) {
        try {
            const chatId = msg.from;
            // Dapatkan nomor telepon yang bersih (misalnya, menghapus '@c.us')
            const phoneNumberId = chatId.replace(/@c\.us$/, '');

            if (!canSendTicket(chatId)) {
                return msg.reply('⚠️ Tunggu 5 detik sebelum mengirim kendala lagi ya.');
            }

            const contact = await msg.getContact();
            const usernameRaw = contact.pushname || msg.from;

            const extractedText = text.split(/#kendala/i)[1]?.trim() || "(tidak ada deskripsi)";
            const ticketCode = await generateTicketCode();

            // === LOGIKA PENANGANAN MEDIA WHATSAPP BARU ===
            let photoUrl = null;
            // Cek apakah pesan memiliki media (foto, dokumen, video, kecuali stiker/gif)
            if (msg.hasMedia && msg.type !== 'sticker' && msg.type !== 'gif') {
                // Gunakan placeholder untuk mengaktifkan ikon pin di dashboard
                photoUrl = "MEDIA_ATTACHED_VIEW_IN_WA"; 
            }
            // ===========================================

            const chat = await msg.getChat();
            const newTicket = new Ticket({
                ticketCode,
                platform: 'WhatsApp',
                chatId: chatId,
                messageId: msg.id && msg.id._serialized ? msg.id._serialized : String(Date.now()),
                username: usernameRaw,
                telegramUserId: phoneNumberId, // Menyimpan Nomor Telepon Bersih
                groupName: chat.isGroup ? chat.name : 'Private Chat',
                text: extractedText,
                photoUrl: photoUrl // <-- SIMPAN PLACEHOLDER INI
            });
            await newTicket.save();

            // Menggunakan msg.reply() untuk membalas pesan user
            await msg.reply(`✅ *Tiket Diterima!*
\nTerima kasih, laporan Anda telah kami catat dengan nomor pelacakan:
*${ticketCode}*
\nGunakan \`#lacak ${ticketCode}\` untuk melihat status tiket Anda.`);

            console.log(`===== NEW TICKET (WhatsApp) ===== ${ticketCode} dibuat oleh ${usernameRaw}`);
        } catch (err) {
            console.error("❌ Gagal mencatat tiket WA:", err);
            if (waClientReady) {
                await waClient.sendMessage(msg.from, "❌ Terjadi kesalahan sistem saat mencatat kendala Anda.");
            }
        }
    }
});


// ===== Listener tombol copy (callback) - Telegram (Dibiarkan sama) =====
bot.on('callback_query', async callbackQuery => {
  const msg = callbackQuery.message;
  const data = callbackQuery.data;

  if (data && data.startsWith('copy_')) {
    const ticketCode = data.replace('copy_', '');
    try {
      await bot.answerCallbackQuery(callbackQuery.id, { text: `${ticketCode} disalin!` });
    } catch (e) {
      console.warn('⚠️ answerCallbackQuery failed:', e && e.message);
    }
  }
});

// ===== Listener #lacak (Telegram) - Dibiarkan sama =====
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
    } else if (ticket.adminMessage) {
        statusText += `📌 Catatan dari IT TA: ${escapeMarkdownV2(ticket.adminMessage)}\n`;
    }

    await sendMessage(chatId, statusText, { parse_mode: 'MarkdownV2', reply_to_message_id: messageId });

  } catch (err) {
    console.error('❌ Error #lacak listener:', err);
    await sendMessage(msg.chat.id, '❌ Terjadi kesalahan saat menampilkan status tiket.', { reply_to_message_id: msg.message_id });
  }
});

// ===== Listener #lacak (WhatsApp) [MENGGUNAKAN msg.reply] - DIPERBAIKI =====
waClient.on('message', async msg => {
    if (msg.body && msg.body.toLowerCase().startsWith('#lacak ')) {
        try {
            const chatId = msg.from;
            const code = msg.body.split(' ')[1]?.toUpperCase();

            if (!code) return msg.reply('❌ Format salah. Gunakan #lacak <kode_tiket>');

            const ticket = await Ticket.findOne({ ticketCode: code });
            if (!ticket) return msg.reply(`❌ Tiket ${code} tidak ditemukan.`);

            // BARIS DIPERBAIKI: Dapatkan ID pengguna (Nomor telepon bersih)
            const reporterId = ticket.telegramUserId;

            let statusText = `*🔍 Status Tiket ${ticket.ticketCode}*\n\n` +
                `*Status:* ${ticket.status}\n` +
                `*Kendala:* ${ticket.text}\n` +
                `*Grup:* ${ticket.groupName}\n` +
                `*Dilaporkan pada:* ${ticket.createdAt.toLocaleString('id-ID')}\n`;

            if (ticket.status === 'Done') {
                statusText += `*Selesai pada:* ${ticket.completedAt.toLocaleString('id-ID')}\n`;
                if (ticket.adminMessage) statusText += `\n*📌 Catatan dari IT TA:*\n${ticket.adminMessage}`;
            } else if (ticket.adminMessage) {
                 statusText += `\n*📌 Catatan dari IT TA:*\n${ticket.adminMessage}`;
            }

            // MENGGANTI waClient.sendMessage() menjadi msg.reply()
            await msg.reply(statusText);
        } catch (err) {
            console.error('❌ Error #lacak listener (WA):', err);
            if (waClientReady) {
                await waClient.sendMessage(msg.from, '❌ Terjadi kesalahan saat menampilkan status tiket.');
            }
        }
    }
});

// ====================================================================
// ===== BAGIAN 4: API ROUTES
// ====================================================================

// GET semua tiket + stats
app.get('/api/tickets', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const filters = {};

    if (req.query.status && req.query.status !== 'all') {
      const statuses = req.query.status.split(',');
      filters.status = { $in: statuses };
    }

    if (req.query.pic && req.query.pic !== 'all') filters.pic = req.query.pic;
    if (req.query.startDate) filters.createdAt = { ...filters.createdAt, $gte: new Date(req.query.startDate) };
    if (req.query.endDate) {
      const endOfDay = new Date(req.query.endDate);
      endOfDay.setHours(23, 59, 59, 999);
      filters.createdAt = { ...filters.createdAt, $lte: endOfDay };
    }

    if (req.query.search) {
      const searchRegex = { $regex: req.query.search, $options: 'i' };
      filters.$or = [
        { ticketCode: searchRegex },
        { text: searchRegex },
        { username: searchRegex },
        { groupName: searchRegex }
      ];
    }

    const tickets = await Ticket.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit);
    const totalTickets = await Ticket.countDocuments(filters);
    const totalPages = Math.ceil(totalTickets / limit);
    const allFilteredTickets = await Ticket.find(filters);

    const initialStats = {
      totalDiproses: 0,
      totalSelesai: 0,
      picData: {},
      caseData: {},
      platformData: {},
      statsToday: { diproses: 0, selesai: 0 },
      statsYesterday: { diproses: 0, selesai: 0 },
      picList: PIC_LIST
    };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(new Date().setDate(now.getDate() - 1));
    yesterdayStart.setHours(0, 0, 0, 0);

    const finalStats = allFilteredTickets.reduce((acc, ticket) => {
      // Total Diproses dan Selesai
      if (ticket.status === 'Done') acc.totalSelesai++;
      else acc.totalDiproses++;

      // LOGIKA PLATFORM
      const platformKey = ticket.platform || 'Unknown';
      acc.platformData[platformKey] = (acc.platformData[platformKey] || 0) + 1;

      // Logika PIC
      const picKey = ticket.pic || 'BelumDitentukan';
      acc.picData[picKey] = (acc.picData[picKey] || 0) + 1;

      // Logika Case Data
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

      // Logika Statistik Harian
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

// POST balasan dengan foto untuk Telegram & WhatsApp
app.post('/api/tickets/:id/reply', upload.single('photo'), async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    const { balasan } = req.body;

    if (!balasan || !ticket) return res.status(400).json({ message: 'Input tidak valid atau tiket tidak ditemukan.' });

    ticket.adminMessage = balasan;
    ticket.status = 'Done';
    ticket.completedAt = new Date();

    if (ticket.platform === 'Telegram') {
        const replyNotification = `💬 <b>Update dari IT TA untuk tiket ${ticket.ticketCode}:</b>\n\n${balasan}`;
        try {
            if (req.file) {
                await sendPhoto(ticket.chatId, req.file.buffer, {
                    caption: replyNotification,
                    parse_mode: 'HTML',
                    reply_to_message_id: ticket.messageId
                });
            } else {
                await sendMessage(ticket.chatId, replyNotification, {
                    parse_mode: 'HTML',
                    reply_to_message_id: ticket.messageId
                });
            }
        } catch (err) {
            console.error('❌ Gagal mengirim balasan ke Telegram:', err.message);
        }
    } else if (ticket.platform === 'WhatsApp') {
        const replyNotification = `💬 Update dari Admin untuk tiket ${ticket.ticketCode}:\n\n${balasan}`;
        try {
            if (!waClientReady) throw new Error("WhatsApp Client not ready.");

            // Balasan akan menggunakan reply ke pesan awal pengguna
            if (req.file) {
                const media = new MessageMedia(
                    req.file.mimetype,
                    req.file.buffer.toString('base64'),
                    req.file.originalname || 'image.jpg'
                );
                await waClient.sendMessage(ticket.chatId, media, {
                    caption: replyNotification,
                    quotedMessageId: ticket.messageId
                });
            } else {
                await waClient.sendMessage(ticket.chatId, replyNotification, {
                    quotedMessageId: ticket.messageId
                });
            }
        } catch (err) {
            console.error('❌ Gagal mengirim balasan ke WhatsApp:', err.message);
        }
    }

    await ticket.save();
    res.json({ success: true, message: 'Balasan terkirim dan tiket diperbarui.' });
  } catch (err) {
    console.error('❌ Gagal menyelesaikan tiket:', err);
    res.status(500).json({ message: 'Gagal memperbarui tiket.' });
  }
});


// PATCH set PIC (Dibiarkan sama)
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

// PATCH update status tiket (Diperbarui untuk notifikasi dan adminMessage)
app.patch('/api/tickets/:id/set-status', async (req, res) => {
    try {
        const { status, adminMessage } = req.body; // <-- Ambil adminMessage dari body
        if (!STATUS_LIST.includes(status)) return res.status(400).json({ message: 'Status tidak valid.' });

        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Tiket tidak ditemukan.' });

        const oldStatus = ticket.status; // Simpan status lama
        ticket.status = status;

        // Update adminMessage jika ada
        if (adminMessage) {
            ticket.adminMessage = adminMessage;
        }
        // Set completedAt hanya jika status diubah menjadi Done
        ticket.completedAt = status === 'Done' ? new Date() : null;

        await ticket.save();

        // --- Notifikasi ke User Telegram ---
        if (ticket.platform === 'Telegram') {
            try {
                let notificationText;

                if (status === 'On Hold') {
                    // Kasus 1: Status diubah menjadi On Hold
                    const reason = ticket.adminMessage || "Tiket anda sedang kami Proses.";
                    notificationText = `⚠️ <b>Tiket ${ticket.ticketCode} Di-'On Hold'</b>
\nStatus tiket Anda diubah menjadi: <b>${status}</b>.
\n<b>Update IT TA:</b> 
${reason}
\nKami akan segera memberikan update jika ada perkembangan.`;

                } else if (status === 'Done') {
                    // Kasus 2: Status diubah menjadi Done
                    notificationText = `✅ <b>Tiket ${ticket.ticketCode} Selesai!</b>
\nStatus tiket Anda diubah menjadi: <b>${status}</b>.
\nTerima kasih atas laporannya.`;
                    if (ticket.adminMessage) {
                         notificationText += `\n\n<b>Catatan dari IT TA:</b>\n${ticket.adminMessage}`;
                    }

                } else if (status !== oldStatus) {
                    // Kasus 3: Status lain yang berubah
                    notificationText = `🔄 Status tiket <code>${ticket.ticketCode}</code> diperbarui menjadi: <b>${status}</b>`;
                    if (ticket.adminMessage) {
                        notificationText += `\n\n<b>Catatan dari IT TA:</b>\n${ticket.adminMessage}`;
                    }
                }

                if (notificationText) {
                    await sendMessage(ticket.chatId, notificationText, {
                        parse_mode: 'HTML',
                        reply_to_message_id: ticket.messageId
                    });
                }

            } catch (err) {
                console.error('Gagal kirim notifikasi Telegram:', err);
            }
        }

        // --- Notifikasi ke User WhatsApp (REPLY) ---
        if (ticket.platform === 'WhatsApp' && waClientReady) {
            try {
                let notificationText;

                if (status === 'On Hold') {
                    const reason = ticket.adminMessage || "Tiket anda sedang kami Proses.";
                    notificationText = `⚠️ *Tiket ${ticket.ticketCode} Di-'On Hold'*
\nStatus tiket Anda diubah menjadi: *${status}*.
\n*Update IT TA:*
${reason}
\nKami akan segera memberikan update jika ada perkembangan.`;
                } else if (status === 'Done') {
                    notificationText = `✅ *Tiket ${ticket.ticketCode} Selesai!*
\nStatus tiket Anda diubah menjadi: *${status}*.
\nTerima kasih atas laporannya.`;
                    if (ticket.adminMessage) {
                         notificationText += `\n\n*Catatan dari IT TA:*\n${ticket.adminMessage}`;
                    }
                } else if (status !== oldStatus) {
                    notificationText = `🔄 Status tiket ${ticket.ticketCode} diperbarui menjadi: *${status}*`;
                    if (ticket.adminMessage) {
                        notificationText += `\n\n*Catatan dari IT TA:*\n${ticket.adminMessage}`;
                    }
                }

                if (notificationText) {
                    // KIRIM SEBAGAI BALASAN (REPLY)
                    await waClient.sendMessage(ticket.chatId, notificationText, {
                        quotedMessageId: ticket.messageId // <-- BARIS KRITIS
                    });
                }

            } catch (err) {
                console.error('❌ Gagal kirim notifikasi WhatsApp:', err.message);
            }
        }


        res.json(ticket);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Gagal memperbarui status tiket.' });
    }
});

// Export Excel [MODIFIED FINAL]
app.get('/api/tickets/export', async (req, res) => {
  try {
    const tickets = await Ticket.find().sort({ createdAt: -1 });
    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Daftar Kendala');

    // === DEFINISI KOLOM FINAL ===
    worksheet.columns = [
      { header: 'Kode Tiket', key: 'ticketCode', width: 15 },
      { header: 'Platform', key: 'platform', width: 12 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'PIC', key: 'pic', width: 15 },
      { header: 'Pelapor (Username/Nama)', key: 'username', width: 25 }, // Diubah untuk lebih umum
      { header: 'ID Pelapor (Nomor HP/TG ID)', key: 'reporterId', width: 30 }, // Diubah untuk spesifik ID
      { header: 'Grup/Chat', key: 'groupName', width: 25 },
      { header: 'Deskripsi Kendala', key: 'text', width: 50 },
      { header: 'Tanggal Laporan', key: 'createdAt', width: 25 },
      { header: 'Tanggal Selesai', key: 'completedAt', width: 25 },
      { header: 'Catatan Admin', key: 'adminMessage', width: 50 }
    ];

    // === MENGISI DATA BARIS ===
    tickets.forEach(ticket => {
        let reporterIdDisplay;
        
        // Logika untuk menampilkan ID spesifik per platform
        if (ticket.platform === 'WhatsApp') {
            // Untuk WhatsApp, tampilkan Nomor HP (sudah disimpan di telegramUserId)
            reporterIdDisplay = `HP: ${ticket.telegramUserId}`;
        } else if (ticket.platform === 'Telegram') {
            // Untuk Telegram, tampilkan Username dan ID
            reporterIdDisplay = `TG ID: ${ticket.telegramUserId} (User: ${ticket.username})`;
        } else {
            reporterIdDisplay = ticket.telegramUserId;
        }

        const rowData = {
            ticketCode: ticket.ticketCode,
            platform: ticket.platform,
            status: ticket.status,
            pic: ticket.pic,
            username: ticket.username,
            reporterId: reporterIdDisplay, 
            groupName: ticket.groupName,
            text: ticket.text,
            createdAt: ticket.createdAt.toLocaleString('id-ID'),
            completedAt: ticket.completedAt ? ticket.completedAt.toLocaleString('id-ID') : '',
            adminMessage: ticket.adminMessage
        };
        worksheet.addRow(rowData);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Daftar_Kendala.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('❌ Gagal mengekspor data:', err);
    res.status(500).send('Gagal mengekspor data ke Excel.');
  }
});

// ===== Auth Routes (Dibiarkan sama) =====
app.use('/api/auth', authRoutes);

// ====================================================================
// ===== BAGIAN 5: START SERVER
// ====================================================================

// ===== Jalankan Server =====
app.listen(PORT, () => console.log(`🚀 Server berjalan di http://localhost:${PORT}`));