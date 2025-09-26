const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() }); // untuk foto balasan
const Ticket = require('../models/Ticket');

// --- PATCH /api/tickets/:id/set-status ---
router.patch('/:id/set-status', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket tidak ditemukan' });

    const newStatus = req.body.status.toLowerCase();
    if (!['diproses', 'on hold', 'waiting third party', 'done'].includes(newStatus)) {
      return res.status(400).json({ message: 'Status tidak valid' });
    }

    ticket.status = newStatus;
    if (newStatus === 'done') ticket.completedAt = new Date();
    await ticket.save();

    res.json(ticket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- PATCH /api/tickets/:id/set-pic ---
router.patch('/:id/set-pic', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket tidak ditemukan' });

    ticket.pic = req.body.pic || 'Belum Ditentukan';
    await ticket.save();
    res.json(ticket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- POST /api/tickets/:id/reply ---
router.post('/:id/reply', upload.single('photo'), async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket tidak ditemukan' });

    const { balasan } = req.body;
    if (!balasan) return res.status(400).json({ message: 'Balasan kosong' });

    ticket.adminMessage = balasan;

    if (req.file) {
      // Simpel: simpan foto sebagai data URL atau path file
      // Untuk produksi, sebaiknya pakai cloud storage
      ticket.photoUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    await ticket.save();
    res.json(ticket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
