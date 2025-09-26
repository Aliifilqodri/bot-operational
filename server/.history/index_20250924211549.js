require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');
const excel = require('exceljs'); // <-- Untuk export Excel

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Middleware =====
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ===== Koneksi MongoDB =====
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Terhubung ke MongoDB'))
  .catch(err => console.error('❌ Gagal terhubung ke MongoDB:', err));

// ===== Schema & Model =====
const ticketSchema = new mongoose.Schema({
  chatId: { type: Number, required: true },
  messageId: { type: Number, required: true },
  username: { type: String, default: "Anonim" },
  telegramUserId: { type: Number, required: true },
  chatType: { type: String, default: 'private' },
  groupName: { type: String, default: 'Private Chat' },
  text: { type: String, required: true },
  status: { type: String, default: 'Diproses' },
  pic: { type: String, default: 'Belum Ditentukan' },
  photoUrl: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null }
});
const Ticket = mongoose.model('Ticket', ticketSchema);

// ===== Daftar PIC =====
const PIC_LIST = ['sal', 'alf', 'rdh', 'fhn', 'drl', 'raf'];

// ===== Kategori Kasus =====
const CASE_KEYWORDS = {
  'WFM - Mismatch Tiket': ['wfm not found','double tiket','wfm kosong','tidak bisa terclose','wfm masih open','gadak di wfm'],
  'WFM - Tiket Nyangkut (Stuck)': ['nyangkut di finalcheck','nyangkut di backend','nyangkut di mediacare','nyangkut di slamsim'],
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

// ===== Telegram Bot =====
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
bot.on('polling_error', (err) => console.error('❌ Polling Error:', err.code));
console.log('🤖 Bot Telegram berjalan...');

// ===== Bot Listener =====
bot.on("message", async (msg) => {
  if (msg.from.is_bot) return;

  const chatId = msg.chat.id;
  const messageId = msg.message_id;
  const usernameRaw = msg.from.username || `${msg.from.first_name || ''} ${msg.from.last_name || ''}`.trim() || "Anonim";
  const telegramUserId = msg.from.id;
  const chatType = msg.chat.type;
  const groupName = chatType === 'private' ? 'Private Chat' : msg.chat.title;
  const text = msg.caption || msg.text || "";

  if (!text.toLowerCase().includes("#kendala")) return;

  try {
    let photoUrl = null;
    if (msg.photo) {
      const bestPhoto = msg.photo[msg.photo.length - 1];
      photoUrl = await bot.getFileLink(bestPhoto.file_id);
    }

    const extractedText = text.split(/#kendala/i)[1]?.trim() || (msg.photo ? "(gambar terlampir)" : "(tidak ada deskripsi)");

    console.log("===== NEW TICKET =====", { chatId, messageId, usernameRaw, telegramUserId, chatType, groupName, extractedText, photoUrl });

    const newTicket = new Ticket({ 
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

    await bot.sendMessage(chatId, `✅ <b>Tiket Diterima!</b>\n\n👤 Pelapor: @${usernameRaw}\n📌 Kendala: "${extractedText}"\n\nStatus: Diproses.`, { 
      parse_mode: "HTML",
      reply_to_message_id: messageId 
    });

  } catch (err) {
    console.error("❌ Gagal mencatat tiket:", err);
    bot.sendMessage(chatId, `❌ Terjadi kesalahan sistem saat mencatat kendala Anda.\nError: ${err.message}`, { reply_to_message_id: messageId });
  }
});

// ===== API Routes =====

// GET semua tiket + stats
app.get('/api/tickets', async (req, res) => {
  try {
    const tickets = await Ticket.find().sort({ createdAt: -1 });

    const totalDiproses = tickets.filter(t => t.status === 'Diproses').length;
    const totalSelesai = tickets.filter(t => t.status === 'Selesai').length;

    const picData = {};
    tickets.forEach(t => { const key = t.pic || 'Belum Ditentukan'; picData[key] = (picData[key] || 0) + 1; });

    const caseData = {};
    tickets.forEach(ticket => {
      const textLower = ticket.text.toLowerCase();
      let matched = false;
      for (const [category, keywords] of Object.entries(CASE_KEYWORDS)) {
        if (keywords.some(k => textLower.includes(k))) { caseData[category] = (caseData[category] || 0) + 1; matched = true; break; }
      }
      if (!matched) caseData['Lainnya'] = (caseData['Lainnya'] || 0) + 1;
    });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(todayStart.getDate() - 1);
    const todayEnd = new Date(todayStart); todayEnd.setDate(todayStart.getDate() + 1);

    const ticketsToday = tickets.filter(t => t.createdAt >= todayStart && t.createdAt < todayEnd);
    const ticketsYesterday = tickets.filter(t => t.createdAt >= yesterdayStart && t.createdAt < todayStart);

    const getDailyStats = (arr) => ({
      diproses: arr.filter(t => t.status === 'Diproses').length,
      selesai: arr.filter(t => t.status === 'Selesai').length,
    });

    res.json({
      tickets,
      stats: {
        totalDiproses,
        totalSelesai,
        picData,
        caseData,
        statsToday: getDailyStats(ticketsToday),
        statsYesterday: getDailyStats(ticketsYesterday),
        picList: PIC_LIST
      }
    });
  } catch (err) {
    console.error("❌ Error saat mengambil data tiket:", err);
    res.status(500).json({ message: 'Gagal memuat data dashboard.' });
  }
});

// POST balasan
app.post('/api/tickets/:id/reply', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    const { balasan } = req.body;
    if (!balasan || !ticket) return res.status(400).json({ message: 'Input tidak valid atau tiket tidak ditemukan.' });

    await bot.sendMessage(ticket.chatId, `💬 <b>Update dari Admin:</b>\n\n${balasan}`, {
      parse_mode: "HTML",
      reply_to_message_id: ticket.messageId
    });

    res.json({ success: true, message: 'Balasan terkirim.' });
  } catch (err) {
    console.error("❌ Gagal mengirim balasan:", err);
    res.status(500).json({ message: 'Gagal mengirim balasan.' });
  }
});

// PATCH complete
app.patch('/api/tickets/:id/complete', async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { status: 'Selesai', completedAt: new Date() },
      { new: true }
    );
    if (!ticket) return res.status(404).json({ message: 'Tiket tidak ditemukan.' });

    await bot.sendMessage(ticket.chatId, `🎉 <b>Kendala Terselesaikan!</b>\n\n📌 "${ticket.text}"`, {
      parse_mode: "HTML",
      reply_to_message_id: ticket.messageId
    });

    res.json(ticket);
  } catch (err) {
    console.error("❌ Gagal menandai selesai:", err);
    res.status(500).json({ message: 'Gagal memperbarui status.' });
  }
});

// PATCH set PIC
app.patch('/api/tickets/:id/set-pic', async (req, res) => {
  try {
    const { pic } = req.body;
    if (!PIC_LIST.includes(pic) && pic !== 'Belum Ditentukan') return res.status(400).json({ message: 'PIC tidak valid.' });

    const ticket = await Ticket.findByIdAndUpdate(req.params.id, { pic }, { new: true });
    res.json(ticket);
  } catch (err) {
    console.error("❌ Gagal set PIC:", err);
    res.status(500).json({ message: 'Gagal menetapkan PIC.' });
  }
});

// ===== Export ke Excel =====
app.get('/api/tickets/export', async (req, res) => {
  try {
    const tickets = await Ticket.find().sort({ createdAt: -1 });
    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Daftar Kendala');

    worksheet.columns = [
      { header: 'ID Tiket', key: '_id', width: 30 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'PIC', key: 'pic', width: 15 },
      { header: 'Deskripsi Kendala', key: 'text', width: 50 },
      { header: 'Pelapor', key: 'username', width: 20 },
      { header: 'Grup', key: 'groupName', width: 25 },
      { header: 'Tanggal Laporan', key: 'createdAt', width: 25 },
      { header: 'Tanggal Selesai', key: 'completedAt', width: 25 },
    ];

    tickets.forEach(ticket => worksheet.addRow(ticket));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=' + 'Daftar_Kendala.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("❌ Gagal mengekspor data:", err);
    res.status(500).send('Gagal mengekspor data ke Excel.');
  }
});

// ===== Jalankan Server =====
app.listen(PORT, () => console.log(`🚀 Server API berjalan di http://localhost:${PORT}`));
