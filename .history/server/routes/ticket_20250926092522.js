// file: server/routes/tickets.js
const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const excel = require('exceljs');

const PIC_LIST = ['BelumDitentukan','sal','alf','rdh','fhn','drl','raf'];
const CASE_KEYWORDS = { /* ... Salin CASE_KEYWORDS Anda di sini ... */ };

// [GET] /api/tickets - Mendapatkan semua tiket dengan statistik
router.get('/', async (req, res) => { /* ... Salin logika GET /api/tickets Anda di sini ... */ });

// [POST] /api/tickets/:id/reply - Membalas dan menyelesaikan tiket
router.post('/:id/reply', async (req, res) => { /* ... Salin logika POST /reply Anda di sini ... */ });

// [PATCH] /api/tickets/:id/set-pic - Menetapkan PIC
router.patch('/:id/set-pic', async (req, res) => { /* ... Salin logika PATCH /set-pic Anda di sini ... */ });

// [GET] /api/tickets/export - Ekspor ke Excel
router.get('/export', async (req, res) => { /* ... Salin logika GET /export Anda di sini ... */ });

module.exports = router;