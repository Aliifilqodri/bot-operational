require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const excel = require('exceljs');
const multer = require('multer');
const { authMiddleware } = require('./middleware/authMiddleware'); // Middleware untuk proteksi route
const upload = multer({ storage: multer.memoryStorage() });

// Import routes
const authRoutes = require('./routes/auth');

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
    enum: ['Diproses', 'On Hold', 'Waiting Third Party', 'Done'] 
  },
  adminMessage: { type: String, default: "" },
  pic: { type: String, default: 'Belum Ditentukan' },
  photoUrl: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null }
});
const Ticket = mongoose.model('Ticket', ticketSchema);

// ===== Konstanta & Konfigurasi =====
const PIC_LIST = ['Belum Ditentukan', 'sal', 'alf', 'rdh', 'fhn', 'drl', 'raf'];
const STATUS_LIST = ['Diproses', 'On Hold', 'Waiting Third Party', 'Done'];
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

// ===== Telegram Bot Setup =====
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
bot.on('polling_error', err => console.error('❌ Polling Error:', err.code));
console.log('🤖 Bot Telegram berjalan...');

// ===== Helper Functions =====
async function generateTicketCode() {
  const count = await Ticket.countDocuments();
  const codeNumber = (count + 1).toString().padStart(3, '0');
  return `OPS-${codeNumber}`;
}

function escapeMarkdownV2(text = '') {
  if (typeof text !== 'string') return '';
  return text
    .replace(/\\/g, '\\\\').replace(/\./g, '\\.').replace(/\*/g, '\\*')
    .replace(/_/g, '\\_').replace(/\[/g, '\\[').replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/~/g, '\\~')
    .replace(/`/g, '\\`').replace(/>/g, '\\>').replace(/#/g, '\\#')
    .replace(/\+/g, '\\+').replace(/-/g, '\\-').replace(/=/g, '\\=')
    .replace(/\|/g, '\\|').replace(/\{/g, '\\{').replace(/\}/g, '\\}')
    .replace(/!/g, '\\!');
}

// ===== Bot Listeners =====
bot.on('message', async msg => {
  if (msg.from.is_bot) return;
  const { chat, message_id, from, caption, text } = msg;
  const textRaw = caption || text || "";

  if (textRaw.toLowerCase().includes('#kendala')) {
    try {
      let photoUrl = null;
      if (msg.photo) {
        photoUrl = await bot.getFileLink(msg.photo[msg.photo.length - 1].file_id);
      }
      const extractedText = textRaw.split(/#kendala/i)[1]?.trim() || (msg.photo ? "(gambar terlampir)" : "(tidak ada deskripsi)");
      
      const newTicket = new Ticket({
        ticketCode: await generateTicketCode(),
        chatId: chat.id,
        messageId: message_id,
        username: from.username || `${from.first_name || ''} ${from.last_name || ''}`.trim() || "Anonim",
        telegramUserId: from.id,
        chatType: chat.type,
        groupName: chat.type === 'private' ? 'Private Chat' : chat.title,
        text: extractedText,
        photoUrl
      });

      await newTicket.save();
      await bot.sendMessage(chat.id,
        `✅ <b>Tiket Diterima!</b>\n\nKode tiket Anda: <code>${newTicket.ticketCode}</code>\n\nGunakan <code>#lacak ${newTicket.ticketCode}</code> untuk cek status.`,
        { parse_mode: 'HTML', reply_to_message_id: message_id }
      );
      console.log('===== NEW TICKET =====', { ticketCode: newTicket.ticketCode, user: newTicket.username });
    } catch (err) {
      console.error('❌ Gagal mencatat tiket:', err);
      bot.sendMessage(chat.id, `❌ Gagal mencatat kendala Anda. Error: ${err.message}`, { reply_to_message_id: message_id });
    }
  }
});

bot.onText(/#lacak (.+)/, async (msg, match) => {
  try {
    const code = match[1]?.toUpperCase();
    if (!code) return bot.sendMessage(msg.chat.id, '❌ Format salah. Gunakan #lacak <kode_tiket>', { reply_to_message_id: msg.message_id });

    const ticket = await Ticket.findOne({ ticketCode: code });
    if (!ticket) return bot.sendMessage(msg.chat.id, `❌ Tiket ${code} tidak ditemukan.`, { reply_to_message_id: msg.message_id });

    const created = ticket.createdAt;
    const completed = ticket.completedAt;
    const formatDate = (d) => d ? `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}, ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}` : "-";

    const statusMessage = ticket.status === 'Done' ? `✅ ${ticket.status}` : `🟡 ${ticket.status}`;
    let statusText = `🔍 *Status Tiket ${escapeMarkdownV2(ticket.ticketCode)}*\n` +
                     `Status: ${escapeMarkdownV2(statusMessage)}\n` +
                     `Kendala: \`${escapeMarkdownV2(ticket.text)}\`\n` +
                     `Grup: ${escapeMarkdownV2(ticket.groupName)}\n` +
                     `Dilaporkan pada: ${escapeMarkdownV2(formatDate(created))}\n`;

    if (ticket.status === 'Done') {
      statusText += `Selesai pada: ${escapeMarkdownV2(formatDate(completed))}\n`;
      if (ticket.adminMessage) statusText += `📌 Catatan Admin: ${escapeMarkdownV2(ticket.adminMessage)}\n`;
    }

    await bot.sendMessage(msg.chat.id, statusText, { parse_mode: 'MarkdownV2', reply_to_message_id: msg.message_id });
  } catch (err) {
    console.error('❌ Error #lacak listener:', err);
    bot.sendMessage(msg.chat.id, '❌ Terjadi kesalahan saat lacak tiket.', { reply_to_message_id: msg.message_id });
  }
});

// ===================== API ROUTES =====================

// [GET] Semua tiket + stats (dilindungi middleware)
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

        // Untuk kalkulasi statistik, kita ambil semua data yang terfilter tanpa limit
        const allFilteredTickets = await Ticket.find(filters);

        // Kalkulasi Statistik
        const stats = {
            statusCounts: {},
            picData: {},
            caseData: {},
            statsToday: { inProgress: 0, done: 0 },
            statsYesterday: { inProgress: 0, done: 0 },
            picList: PIC_LIST,
            statusList: STATUS_LIST
        };
        
        STATUS_LIST.forEach(s => stats.statusCounts[s] = 0); // Inisialisasi status counts

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterdayStart = new Date(new Date().setDate(now.getDate() - 1));
        yesterdayStart.setHours(0, 0, 0, 0);

        allFilteredTickets.forEach(ticket => {
            stats.statusCounts[ticket.status]++;
            const picKey = ticket.pic || 'Belum Ditentukan';
            stats.picData[picKey] = (stats.picData[picKey] || 0) + 1;

            const textLower = (ticket.text || '').toLowerCase();
            let matched = false;
            for (const [category, keywords] of Object.entries(CASE_KEYWORDS)) {
                if (keywords.some(k => textLower.includes(k))) {
                    stats.caseData[category] = (stats.caseData[category] || 0) + 1;
                    matched = true;
                    break;
                }
            }
            if (!matched) stats.caseData['Lainnya'] = (stats.caseData['Lainnya'] || 0) + 1;

            const ticketDate = new Date(ticket.createdAt);
            if (ticketDate >= todayStart) {
                if (ticket.status === 'Done') stats.statsToday.done++;
                else stats.statsToday.inProgress++;
            } else if (ticketDate >= yesterdayStart) {
                if (ticket.status === 'Done') stats.statsYesterday.done++;
                else stats.statsYesterday.inProgress++;
            }
        });

        res.json({ tickets, totalPages, currentPage: page, stats });
    } catch (err) {
        console.error('❌ Error saat mengambil data tiket:', err);
        res.status(500).json({ message: 'Gagal memuat tiket.' });
    }
});

// [POST] Mengirim balasan (dilindungi middleware)
app.post('/api/tickets/:id/reply', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    const { balasan } = req.body;
    if (!balasan || !ticket) return res.status(400).json({ message: 'Input tidak valid.' });
    
    ticket.adminMessage = balasan;
    const replyNotification = `💬 <b>Update dari IT TA untuk tiket ${ticket.ticketCode}:</b>\n\n${balasan}`;

    if (req.file) {
      await bot.sendPhoto(ticket.chatId, req.file.buffer, {
        caption: replyNotification, parse_mode: 'HTML', reply_to_message_id: ticket.messageId
      });
    } else {
      await bot.sendMessage(ticket.chatId, replyNotification, {
        parse_mode: 'HTML', reply_to_message_id: ticket.messageId
      });
    }

    await ticket.save();
    res.json({ success: true, message: 'Balasan terkirim.' });
  } catch (err) {
    console.error('❌ Gagal mengirim balasan:', err);
    res.status(500).json({ message: 'Gagal mengirim balasan.' });
  }
});

// [PATCH] Menetapkan PIC (dilindungi middleware)
app.patch('/api/tickets/:id/set-pic', authMiddleware, async (req, res) => {
  try {
    const { pic } = req.body;
    if (!PIC_LIST.includes(pic)) return res.status(400).json({ message: 'PIC tidak valid.' });
    
    const ticket = await Ticket.findByIdAndUpdate(req.params.id, { pic }, { new: true });
    if (!ticket) return res.status(404).json({ message: 'Tiket tidak ditemukan.' });
    res.json(ticket);
  } catch (err) {
    console.error('❌ Gagal set PIC:', err);
    res.status(500).json({ message: 'Gagal menetapkan PIC.' });
  }
});

// [PATCH] Mengubah status (dilindungi middleware)
app.patch('/api/tickets/:id/set-status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !STATUS_LIST.includes(status)) return res.status(400).json({ message: 'Status tidak valid.' });
    
    const updateData = { status, completedAt: status === 'Done' ? new Date() : null };
    const ticket = await Ticket.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!ticket) return res.status(404).json({ message: 'Tiket tidak ditemukan.' });

    const statusUpdateMessage = `ℹ️ Status tiket *${escapeMarkdownV2(ticket.ticketCode)}* diubah menjadi *${escapeMarkdownV2(status)}*\\.`;
    await bot.sendMessage(ticket.chatId, statusUpdateMessage, { parse_mode: "MarkdownV2", reply_to_message_id: ticket.messageId });

    res.json(ticket);
  } catch (err) {
    console.error("❌ Gagal mengubah status:", err);
    res.status(500).json({ message: 'Gagal mengubah status.' });
  }
});

// [GET] Ekspor ke Excel (dilindungi middleware)
app.get('/api/tickets/export', authMiddleware, async (req, res) => {
  try {
    const tickets = await Ticket.find().sort({ createdAt: -1 });
    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Daftar Kendala');

    worksheet.columns = [
      { header: 'Kode Tiket', key: 'ticketCode', width: 15 },
      { header: 'Status', key: 'status', width: 20 },
      { header: 'PIC', key: 'pic', width: 15 },
      { header: 'Deskripsi', key: 'text', width: 50 },
      { header: 'Pelapor', key: 'username', width: 20 },
      { header: 'Grup', key: 'groupName', width: 25 },
      { header: 'Tgl Laporan', key: 'createdAt', width: 25 },
      { header: 'Tgl Selesai', key: 'completedAt', width: 25 },
      { header: 'Catatan Admin', key: 'adminMessage', width: 50 }
    ];
    worksheet.addRows(tickets.map(t => ({
        ...t.toObject(),
        createdAt: t.createdAt ? t.createdAt.toLocaleString('id-ID') : '',
        completedAt: t.completedAt ? t.completedAt.toLocaleString('id-ID') : '',
    })));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Daftar_Kendala.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('❌ Gagal mengekspor data:', err);
    res.status(500).send('Gagal mengekspor data ke Excel.');
  }
});

// ===== Auth Routes (TIDAK dilindungi middleware) =====
app.use('/api/auth', authRoutes);

// ===== Jalankan Server =====
app.listen(PORT, () => console.log(`🚀 Server berjalan di http://localhost:${PORT}`));