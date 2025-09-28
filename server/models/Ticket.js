// file: server/models/Ticket.js
const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  // --- Identitas tiket ---
  ticketCode: { type: String, required: true, unique: true }, // kode unik tiket
  username: { type: String, required: true }, // nama user pembuat tiket
  userId: { type: String }, // kalau butuh ID user
  email: { type: String }, // opsional email user
  department: { type: String }, // opsional departemen/asal divisi
  category: { type: String }, // kategori tiket (IT, HR, Finance, dll.)
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium' 
  },

  // --- Isi tiket ---
  text: { type: String, required: true }, // isi deskripsi masalah
  attachments: [{ type: String }], // link/file lampiran (opsional)

  // --- Status & PIC ---
  status: { 
    type: String, 
    enum: ['diproses', 'on hold', 'menunggu approval', 'done'], 
    default: 'diproses' 
  },
  pic: { type: String, default: 'Belum Ditentukan' }, // penanggung jawab

  // --- Balasan admin ---
  adminMessage: { type: String }, // pesan balasan
  photoUrl: { type: String }, // untuk foto balasan
  replies: [
    {
      balasan: { type: String, required: true },
      photoUrl: { type: String },
      repliedAt: { type: Date, default: Date.now }
    }
  ],

  // --- Multi-platform support (WA & Telegram) ---
  chatId: { type: String, required: true }, 
  messageId: { type: String, required: true }, 
  telegramUserId: { type: String }, 
  platform: { 
    type: String, 
    required: true, 
    enum: ['Telegram', 'WhatsApp'] 
  },

  // --- Waktu ---
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

// Middleware untuk update updatedAt otomatis
ticketSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;
