// server/models/Ticket.js
const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketId: { type: String, unique: true, required: true },
  chatId: { type: Number, required: true },
  messageId: { type: Number, required: true },
  username: { type: String, default: "Anonim" },
  telegramUserId: { type: Number, required: true },
  groupName: { type: String, default: 'Private Chat' },
  text: { type: String, required: true },
  status: { 
    type: String, 
    default: 'Diproses',
    enum: ['Diproses', 'On Hold', 'Waiting Third Party', 'Done'] // daftar status valid
  },
  adminMessage: { type: String, default: "" },
  pic: { type: String, default: 'Belum Ditentukan' },
  photoUrl: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null }
});

const Ticket = mongoose.model('Ticket', ticketSchema);
module.exports = Ticket;
