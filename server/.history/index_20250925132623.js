require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');
const excel = require('exceljs');

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
  ticketCode: { type: String, required: true, unique: true },
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

// ===== Telegram Bot =====
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
bot.on('polling_error', (err) => console.error('❌ Polling Error:', err.code));
console.log('🤖 Bot Telegram berjalan...');

// ===== Fungsi generate kode tiket =====
async function generateTicketCode() {
  const count = await Ticket.countDocuments();
  const codeNumber = (count + 1).toString().padStart(3, '0');
  return `OPS-${codeNumber}`;
}

// ===== Bot Listener =====
bot.on("message", async (msg) => {
  if (msg.from.is_bot) return;

  const chatId = msg.chat.id;
  const messageId = msg.message_id;
  const usernameRaw = msg.from.username || `${msg.from.first_name || ''} ${msg.from.last_name || ''}`.trim() || "Anonim";
  const telegramUserId = msg.from.id;
  const chatType = msg.chat.type;
  const groupName = chatType === 'private' ? 'Private Chat' : msg.chat.title;
  const textRaw = msg.caption || msg.text || "";

  // ===== #kendala =====
  if (textRaw.toLowerCase().includes("#kendala")) {
    try {
      let photoUrl = null;
      if (msg.photo) {
        const bestPhoto = msg.photo[msg.photo.length - 1];
        photoUrl = await bot.getFileLink(bestPhoto.file_id);
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

      await bot.sendMessage(chatId, `✅ Tiket Diterima!\n\nTerima kasih, laporan Anda telah dicatat dengan nomor:\n${ticketCode}\n\nGunakan #lacak ${ticketCode} untuk cek status tiket Anda.`, { 
        parse_mode: "HTML",
        reply_to_message_id: messageId 
      });

      console.log("===== NEW TICKET =====", { ticketCode, chatId, usernameRaw, extractedText, photoUrl });

    } catch (err) {
      console.error("❌ Gagal mencatat tiket:", err);
      bot.sendMessage(chatId, `❌ Terjadi kesalahan sistem saat mencatat kendala Anda.\nError: ${err.message}`, { reply_to_message_id: messageId });
    }
  }

  // ===== #lacak =====
  if (textRaw.toLowerCase().includes("#lacak")) {
    const parts = textRaw.trim().split(" ");
    const code = parts[1]?.toUpperCase();
    if (!code) {
      return bot.sendMessage(chatId, `❌ Format salah. Gunakan #lacak <kode_tiket>`, { reply_to_message_id: messageId });
    }

    const ticket = await Ticket.findOne({ ticketCode: code });
    if (!ticket) {
      return bot.sendMessage(chatId, `❌ Tiket dengan kode ${code} tidak ditemukan.`, { reply_to_message_id: messageId });
    }

    const statusText = `💬 Status Tiket ${code}:\n\n📌 Kendala: ${ticket.text}\n🏢 Grup: ${ticket.groupName}\n📅 Tanggal Laporan: ${ticket.createdAt.toLocaleString()}\n🟢 Status: ${ticket.status}\n👤 PIC: ${ticket.pic}`;
    bot.sendMessage(chatId, statusText, { reply_to_message_id: messageId });
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

    res.json({
      tickets,
      stats: {
        totalDiproses,
        totalSelesai,
        picData,
        picList: PIC_LIST
      }
    });
  } catch (err) {
    console.error("❌ Error saat mengambil data tiket:", err);
    res.status(500).json({ message: 'Gagal memuat data dashboard.' });
  }
});

// POST balasan (IT TA)
app.post('/api/tickets/:id/reply', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    const { balasan } = req.body;
    if (!balasan || !ticket) return res.status(400).json({ message: 'Input tidak valid atau tiket tidak ditemukan.' });

    await bot.sendMessage(ticket.chatId, `💬 <b>Update dari IT TA:</b>\n\n${balasan}`, {
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
      { header: 'Kode Tiket', key: 'ticketCode', width: 15 },
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
