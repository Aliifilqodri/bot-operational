// Menggunakan dotenv untuk mengelola environment variables
require('dotenv').config();

// Impor modul-modul yang diperlukan
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const excel = require('exceljs');
const multer = require('multer');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const PQueue = require('p-queue').default;
const fs = require('fs');
const path = require('path');
const http = require('http'); // Diperlukan untuk socket.io
const { Server } = require("socket.io"); // <-- Impor Socket.IO
const jwt = require('jsonwebtoken'); // <-- Ditambahkan untuk middleware otentikasi

// Impor rute dan model
const authRoutes = require('./routes/auth');
const localAuthRoutes = require('./routes/localAuthRoutes'); 
const User = require('./models/User'); // <-- Model User (ASUMSI SUDAH ADA & MENGGUNAKAN BCRYPT)

// --- FUNGSI MIDDLEWARE OTENTIKASI (PENJAGA) ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Ambil token dari header 'Bearer TOKEN'

    if (token == null) {
        return res.sendStatus(401); // Unauthorized (tidak ada token)
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.sendStatus(403); // Forbidden (token tidak valid)
        }
        req.user = user; // Simpan data user (dari payload token) di object request
        next(); // Lanjutkan ke proses selanjutnya
    });
};
// -----------------------------------------

// Inisialisasi aplikasi Express
const app = express();
const server = http.createServer(app); // <-- Buat server HTTP dari Express
const io = new Server(server, { // <-- Inisialisasi Socket.IO
    cors: {
        origin: "*", // Izinkan semua origin, sesuaikan jika perlu
        methods: ["GET", "POST"]
    }
});

// Konfigurasi port
const PORT = process.env.PORT || 3300;

// Konfigurasi Multer untuk upload file di memori
const upload = multer({ storage: multer.memoryStorage() });

// ====================================================================
// ===== BAGIAN 1: MIDDLEWARE & KONEKSI DATABASE
// ====================================================================

// ===== Middleware =====
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== Menyajikan file statis dari folder public/uploads =====
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));
// ======================================================================

// ===== Fungsi untuk membuat pengguna awal jika belum ada (Seeder) [DIPERBAIKI] =====
// index.js (Ganti fungsi seedUser ini)

const seedUser = async () => {
    // Definisikan daftar user dengan username unik (tanpa spasi) dan displayName yang benar (dengan spasi)
    const usersToSeed = [
        { 
            username: "moh.aliiffilqodrivanozaaraby", // Digunakan untuk LOGIN (harus unik)
            password: 'ultraman1', 
            role: 'pic', 
            displayName: "MOH. ALIIFFIL QODRI VANOZA ARABY" // Digunakan untuk TAMPILAN
        },
        { 
            username: "001", 
            password: '001', 
            role: 'admin', 
            displayName: "Admin Utama" // Nama tampilan untuk user 001
        }
    ];
    
    for (const userData of usersToSeed) {
        try {
            const cleanUsername = userData.username; 
            const existingUser = await User.findOne({ username: cleanUsername });

            if (!existingUser) {
                // Saat menyimpan, kita masukkan displayName yang terpisah
                const newUser = new User(userData);
                await newUser.save(); 
                console.log(`✅ Pengguna awal '${cleanUsername}' berhasil dibuat. Nama Tampilan: ${userData.displayName}`);
            } else {
                console.log(`ℹ️ Pengguna awal '${cleanUsername}' sudah ada di database.`);
            }
        } catch (error) {
            if (error.code !== 11000) {
                 console.error(`❌ Gagal membuat pengguna awal ${userData.username}:`, error.message);
            }
        }
    }
};

// ===== Koneksi MongoDB [DIPERBARUI] =====
mongoose
    .connect(process.env.MONGO_URI || 'mongodb://appDashboardOperation:Px12581u82VSk@127.0.0.1:27017/dashboard_operation?authSource=dashboard_operation')
    .then(() => {
        console.log('✅ MongoDB terhubung!');
        seedUser(); // <-- PANGGIL FUNGSI SEEDER
    })
    .catch(err => console.error('❌ Kesalahan koneksi MongoDB:', err));

// =================================================================================
// ===== Skema dan Daftar [DIPERBARUI] =====
// =================================================================================
const ticketSchema = new mongoose.Schema({
    ticketCode: { type: String, required: true, unique: true },
    platform: { type: String, enum: ['Telegram', 'WhatsApp'], default: 'Telegram' },
    chatId: { type: String, required: true },
    messageId: { type: String, required: true },
    username: { type: String, default: "Anonim" },
    telegramUserId: { type: String, required: true },
    chatType: { type: String, default: 'private' },
    groupName: { type: String, default: 'Private Chat' },
    text: { type: String, required: true },
    status: {
        type: String,
        default: 'Open', // <-- Default adalah 'Open' untuk tiket baru
        enum: ['Open', 'Diproses', 'Waiting Third Party', 'Done']
    },
    adminMessage: { type: String, default: "" },
    pic: { type: String, default: 'BelumDitentukan' },
    photoUrl: { type: String, default: null },
    appCategory: { type: String, default: 'Lainnya' },
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null }
});
const Ticket = mongoose.model('Ticket', ticketSchema);

// ===== Daftar PIC & Status [DIPERBARUI] =====
const PIC_LIST = [
    'BelumDitentukan', 'ald', 'alf', 'ams', 'drl', 'esh', 'fhn',
    'kak', 'nla', 'nyd', 'nzl', 'raf', 'rdh', 'rdo', 'rwj', 'rza',
    'sal', 'vif', 'vtd', 'ysc'
];
const STATUS_LIST = ['Open', 'Diproses', 'Waiting Third Party', 'Done'];

// ===== Kata Kunci untuk klasifikasi kasus (Detail) =====
const CASE_KEYWORDS = {
    'WFM - Mismatch Tiket': [
        'wfm not found', 'tiket not found', 'double tiket', 'wfm kosong',
        'tidak bisa terclose', 'wfm masih open', 'gadak di wfm',
        'wfm masih backend', 'wfm belum close', 'insera sudah close wfm masih backend'
    ],
    'WFM - Tiket Nyangkut (Stuck)': [
        'nyangkut di finalcheck', 'nyangkut di backend', 'nyangkut di mediacare',
        'nyangkut di slamsim', 'tidak bisa closed', 'wfm stuck backend',
        'insera hilang', 'tidak bisa push scc'
    ],
    'WFM - Work Order Tidak Muncul': [
        'work order tidak muncul', 'wo tidak muncul', 'workorder section',
        'assignment section', 'wo insera tidak muncul', 'wo wfm tidak muncul',
        'cancel wo insera', 'add wo wfm'
    ],
    'WFM - Masalah Akun Pengguna': [
        'user terkunci', 'gagal login', 'otp tidak masuk', 'user not registered',
        'reset rekan teknisi', 'reset otp', 'user_rsc_notactive', 'user_notactive',
        'user auth failed', 'user_auth_locked'
    ],
    'WFM - Teknisi Tidak Ditemukan': [
        'technician not found', 'teknisi tidak ditemukan'
    ],
    'WFM - Masalah Owner Group': [
        'owner grup', 'owner group',
        'owner group, witel,service id , service number , dll kosong',
        'munculkan owner'
    ],
    'INSERA - Mismatch Tiket': [
        'insera tidak muncul', 'insera not found', 'not found di insera',
        'insera gadak', 'gadak di insera'
    ],
    'Mytech - Masalah Akun / Login': [
        'user_rsc_notactive', 'user_notactive', 'user auth failed', 'user_auth_locked'
    ],
    'SAP - Revoke': ['revoke'],
    'Alista - Koreksi Data': [
        'delete bai', 'ba duplikasi', 'alista', 'salah input',
        'bad tidak bisa dibuat', 'material balik ke stok'
    ],
    'Alista - Material & Reservasi': [
        'input material', 'reservasi id', 'reservasi double'
    ],
    'Alista - PIC Controller': [
        'pic controler', 'pic kontroler'
    ],
    'VOIP - SCC Gagal': [
        'voip only scc gagal', 'tidak bisa push scc'
    ],
    'Fulfillment Assurance - Menu Tidak Muncul': [
        'menu fullfilment assurance tidak muncul'
    ],
    'Telegram / OTP': [
        'ganti id telegram', 'otp lensa', 'reset otp email',
        'tidak menerima otp dari telegram', 'otp tdk msk di telegram'
    ],
    'Paradise - Registrasi NIK': [
        'perlu daftar di paradise', 'nik perlu daftar di paradise',
        'nik belum bisa login lensa flow', 'daftar di paradise dan scmt',
        'kode gudang'
    ],
    'IMON - Gangguan Sistem': [
        'imon gangguan', 'apakah imon lagi ada gangguan'
    ],
    'WFM - Menu Validasi / ABD Tidak Muncul': [
        'menu validasi tidak muncul', 'tidak muncul menu validasi',
        'tidak muncul abd rekan', 'menu abd tidak muncul'
    ],
    'WOTMS - Tiket / Rincian': [
        'wotms', 'terflagging tanpa odp', 'pelurusan pembuatan rincian',
        'pembuat rincian', 'dialihkan ke pembuat rincian seharusnya'
    ],

    // ✅ Tambahan baru
    'NDE - C.Tel': [
        'c.tel', 'c tel', 'c-tel'
    ]
};


// ===== Kata Kunci untuk klasifikasi aplikasi =====
const APP_KEYWORDS = {
    'WFM': ['wfm'],
    'SAP': ['sap'],
    'Insera': ['insera'],
    'Alista': ['alista', 'alista system'],
    'Super Apps': ['super apps', 'superapps'],
    'Amalia': ['amalia'],
    'SPPD': ['sppd'],
    'Mytech': ['mytech'],
    'NDE': ['nde'],
    'Labor': [
        'labor',
        'laborcode',
        'labor',
        'aktivasi labor',
        'aktivasi laborcode',
        'aktivasi nik',
        'cleansing labor',
        'cleansing laborcode',
        'cleansing nik',
        'approval labor',
        'approval laborcode',
        'approval nik'
    ],
    'NIK': ['nik'],
    'BA Digital': ['ba digital', 'ba-digital', 'badigital'],
    'Invoice': ['invoice', 'inv']
};



// ===== Fungsi untuk mengkategorikan tiket berdasarkan aplikasi =====
function categorizeTicketByApp(text) {
    const textLower = text.toLowerCase();
    for (const [app, keywords] of Object.entries(APP_KEYWORDS)) {
        if (keywords.some(keyword => textLower.includes(keyword))) {
            return app;
        }
    }
    return 'Lainnya'; // Kategori default jika tidak ada kata kunci yang cocok
}

// ====================================================================
// ===== BAGIAN 2: LOGIKA & INISIALISASI BOT
// ====================================================================

// ===== Bot Telegram + Antrian (Queue) =====
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
    polling: { interval: 500, autoStart: true }
});
bot.on('polling_error', err => console.error('❌ Kesalahan Polling:', err && err.code));
console.log('🤖 Bot Telegram berjalan...');

// Antrian untuk menghindari limit rate dari API Telegram
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
// MODIFIKASI: Fungsi kirim dokumen (untuk kirim balasan dengan lampiran file)
function sendDocument(chatId, document, options = {}) {
    return queuedCall(() => bot.sendDocument(chatId, document, options));
}


// ===== Inisialisasi Bot WhatsApp =====
let waClientReady = false;

const waClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
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
    console.log('📱 Pindai Kode QR WhatsApp ini dengan ponsel Anda:');
    qrcode.generate(qr, { small: true });
});

waClient.on('ready', () => {
    console.log('✅ Klien WhatsApp siap digunakan!');
    waClientReady = true;
});

waClient.on('auth_failure', (msg) => {
    console.error('❌ Kegagalan otentikasi WhatsApp:', msg);
    waClientReady = false;
});

waClient.on('disconnected', (reason) => {
    console.log('❌ Klien WhatsApp terputus:', reason);
    waClientReady = false;
});

waClient.on('change_state', (state) => {
    console.log('🔄 Status klien WhatsApp berubah:', state);
});

waClient.initialize().catch(err => {
    console.error("❌ Gagal menginisialisasi Klien WA:", err.message);
});

// ===== Pembatasan Pengiriman per Pengguna (Rate Limit) - HANYA UNTUK TELEGRAM =====
const userCooldown = new Map();
const COOLDOWN_MS = 5000; // 5 detik

function canSendTicket(userId, platform) {
    // MODIFIKASI: Hilangkan cooldown untuk WhatsApp
    if (platform === 'WhatsApp') return true;

    const now = Date.now();
    const last = userCooldown.get(userId) || 0;
    if (now - last < COOLDOWN_MS) return false;
    userCooldown.set(userId, now);
    return true;
}

// ===== Fungsi untuk menghasilkan kode tiket yang unik =====
async function generateTicketCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let isUnique = false;
    let randomCode = '';

    while (!isUnique) {
        let result = '';
        for (let i = 0; i < 3; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        randomCode = `OPS-${result}`;

        const existingTicket = await Ticket.findOne({ ticketCode: randomCode });
        if (!existingTicket) {
            isUnique = true;
        }
    }
    return randomCode;
}

// ===== Fungsi untuk meloloskan karakter khusus MarkdownV2 =====
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
// ===== BAGIAN 3: LISTENER BOT [PERBAIKAN FINAL MEDIA TELEGRAM/WA]
// ====================================================================

// ===== Listener Bot untuk #tanyait (Telegram) [PERBAIKAN MEDIA] =====
bot.on('message', async msg => {
    if (msg.from.is_bot) return;

    // Ambil text dari caption jika ada media, atau dari text biasa
    const textRaw = (msg.caption || msg.text || "").toString();
    const textLower = textRaw.toLowerCase();

    if (textLower.includes('#tanyait')) {
        const chatId = msg.chat.id;
        const messageId = msg.message_id;
        const usernameRaw = msg.from.username || `${msg.from.first_name || ''} ${msg.from.last_name || ''}`.trim() || "Anonim";
        const telegramUserId = msg.from.id;
        const chatType = msg.chat.type;
        const groupName = chatType === 'private' ? 'Private Chat' : msg.chat.title;

        // Pemeriksaan Cooldown (Khusus Telegram)
        if (!canSendTicket(telegramUserId, 'Telegram')) {
            return sendMessage(chatId, '⏳ Mohon tunggu 5 detik sebelum mengirim laporan lainnya.', { reply_to_message_id: messageId });
        }

        try {
            let mediaUrl = null;
            let fileId = null;

            // --- Logika PENGAMBILAN FILE ID ---
            if (msg.document) {
                // Dokumen (PDF, Excel, dll) - Prioritas Tinggi
                const mimeType = msg.document.mime_type;
                const fileName = msg.document.file_name;

                // Menerima PDF, Excel, atau file dengan ekstensi terkait (Disesuaikan untuk Excel/CSV)
                const isAcceptableDocument = mimeType.startsWith('application/pdf') ||
                    mimeType.includes('spreadsheet') ||
                    mimeType.includes('excel') ||
                    mimeType.includes('text/csv') || // Tambahan CSV
                    fileName.toLowerCase().endsWith('.pdf') ||
                    fileName.toLowerCase().endsWith('.xlsx') ||
                    fileName.toLowerCase().endsWith('.xls') ||
                    fileName.toLowerCase().endsWith('.csv'); // Tambahan CSV

                if (isAcceptableDocument) {
                    fileId = msg.document.file_id;
                    console.log(`[Telegram] ✅ Dokumen Diterima: ${fileName}`);
                }
            } else if (msg.photo) {
                // Foto
                const bestPhoto = msg.photo[msg.photo.length - 1];
                fileId = bestPhoto.file_id;
            } else if (msg.video) {
                // Video
                fileId = msg.video.file_id;
            }
            // --- END Logika PENGAMBILAN FILE ID ---


            // Jika ada file ID, coba ambil tautannya
            if (fileId) {
                try {
                    // Percobaan 1: Menggunakan bot.getFileLink()
                    mediaUrl = await bot.getFileLink(fileId);
                    console.log(`[Telegram] ✅ Link Ditemukan (Link 1 - getFileLink): ${mediaUrl}`);

                } catch (e) {
                    // Percobaan 2: Jika getFileLink gagal, ambil file path dan buat URL secara manual
                    console.warn(`[Telegram] ⚠️ getFileLink gagal (${e.message}). Mencoba membuat link manual...`);
                    try {
                        const file = await bot.getFile(fileId);
                        if (file && file.file_path) {
                            // Ini adalah URL default untuk mengakses file dari Telegram setelah mendapatkan file_path
                            mediaUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
                            console.log(`[Telegram] ✅ Link Ditemukan (Link 2 - Manual): ${mediaUrl}`);
                        }
                    } catch (e2) {
                        console.error('❌ Gagal total mendapatkan link file:', e2.message);
                    }
                }
            }

            const extractedText = textRaw.split(/#tanyait/i)[1]?.trim() || (mediaUrl ? "(media terlampir)" : "(tidak ada deskripsi)");
            const ticketCode = await generateTicketCode();
            const appCategory = categorizeTicketByApp(extractedText);

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
                photoUrl: mediaUrl, // <-- Akan menyimpan link PDF/Excel/Foto
                appCategory: appCategory
            });
            await newTicket.save();

            const replyMessage = `✅ <b>Tiket Diterima!</b>\n\nTerima kasih, laporan Anda telah dicatat dengan kode:\n<code>${ticketCode}</code>\n\nGunakan <code>#lacak ${ticketCode}</code> untuk mengecek status.`;

            await sendMessage(chatId, replyMessage, { parse_mode: 'HTML', reply_to_message_id: messageId });

            io.emit('newTicket', newTicket);

            console.log('===== TIKET BARU (Telegram) =====', { ticketCode, chatId, usernameRaw, finalMediaUrl: mediaUrl });
        } catch (err) {
            console.error('❌ Gagal mencatat tiket Telegram:', err);
            await sendMessage(chatId, `❌ Terjadi kesalahan sistem saat mencatat masalah Anda.\nError: ${err.message}`, { reply_to_message_id: messageId });
        }
    }
});

// ===== Listener Bot WhatsApp (Digabung untuk #tanyait, #lacak) [PERBAIKAN MEDIA] =====
waClient.on('message', async msg => {
    if (!waClientReady || !msg.body) {
        return;
    }

    const text = msg.body;
    const textLower = text.toLowerCase();

    if (textLower === 'ping') {
        return msg.reply('🏓 Pong dari WhatsApp!');
    }

    // <-- Sekarang hanya merespons jika ada #tanyait
    if (textLower.includes('#tanyait')) {
        try {
            const chatId = msg.from;
            const phoneNumberId = chatId.replace(/@c\.us$/, '');

            // Cooldown dihapus untuk WA (Fungsi canSendTicket sudah di-handle)

            const contact = await msg.getContact();
            const usernameRaw = contact.pushname || msg.from;
            const ticketCode = await generateTicketCode();

            const extractedText = text.split(/#tanyait/i)[1]?.trim() || (msg.hasMedia ? "(media terlampir)" : "(tidak ada deskripsi)");
            const appCategory = categorizeTicketByApp(extractedText);

            let photoUrl = null;
            if (msg.hasMedia) {
                const media = await msg.downloadMedia();
                // Menambahkan penanganan untuk PDF, Excel, dan CSV
                const isAcceptableMedia = media && media.mimetype && (
                    media.mimetype.startsWith('image/') ||
                    media.mimetype.startsWith('video/') ||
                    media.mimetype.includes('pdf') ||
                    media.mimetype.includes('excel') ||
                    media.mimetype.includes('spreadsheet') ||
                    media.mimetype.includes('csv') // Tambahan CSV
                ) && !media.mimetype.includes('sticker') && !media.mimetype.includes('gif');

                if (isAcceptableMedia) {
                    const fileExtension = media.mimetype.split('/').pop() || 'dat';
                    const fileName = `${ticketCode}-${Date.now()}.${fileExtension.replace(/\W/g, '')}`;
                    const filePath = path.join(__dirname, 'public', 'uploads', fileName);

                    // Menyimpan file ke disk (hanya untuk WhatsApp)
                    fs.writeFileSync(filePath, media.data, 'base64');

                    // URL publik untuk diakses dashboard
                    const serverUrl = process.env.SERVER_URL || `http://localhost:${PORT}`;
                    photoUrl = `${serverUrl}/uploads/${fileName}`;
                    console.log(`✅ Media WhatsApp disimpan untuk tiket ${ticketCode}: ${fileName}`);
                }
            }

            const chat = await msg.getChat();
            const newTicket = new Ticket({
                ticketCode,
                platform: 'WhatsApp',
                chatId: chatId,
                messageId: msg.id && msg.id._serialized ? msg.id._serialized : String(Date.now()),
                username: usernameRaw,
                telegramUserId: phoneNumberId,
                groupName: chat.isGroup ? chat.name : 'Private Chat',
                text: extractedText,
                photoUrl: photoUrl,
                appCategory: appCategory
            });
            await newTicket.save();

            const replyMessage = `✅ *Tiket Diterima!*\n\nTerima kasih, laporan Anda telah dicatat dengan kode:\n*${ticketCode}*\n\nGunakan #lacak ${ticketCode} untuk mengecek status.`;
            await msg.reply(replyMessage);

            io.emit('newTicket', newTicket);

            console.log(`===== TIKET BARU (WhatsApp) ===== ${ticketCode} dibuat oleh ${usernameRaw}`);
        } catch (err) {
            console.error("❌ Gagal mencatat tiket WA:", err);
            if (waClientReady) {
                await waClient.sendMessage(msg.from, "❌ Terjadi kesalahan sistem saat mencatat masalah Anda.");
            }
        }
    }

    else if (textLower.startsWith('#lacak ')) {
        try {
            const code = msg.body.split(' ')[1]?.toUpperCase();

            if (!code) return msg.reply('❌ Format salah. Gunakan #lacak <kode_tiket>');

            const ticket = await Ticket.findOne({ ticketCode: code });
            if (!ticket) return msg.reply(`❌ Tiket ${code} tidak ditemukan.`);

            let statusText = `*🔍 Status Tiket ${ticket.ticketCode}*\n\n` +
                `*Status:* ${ticket.status}\n` +
                `*Masalah:* ${ticket.text}\n`;

            // --- LOGIKA MENTION WHATSAPP ---
            const options = {};
            if (ticket.groupName !== 'Private Chat') {
                statusText += `*Pelapor:* @${ticket.telegramUserId}\n`;
                options.mentions = [ticket.chatId];
            } else {
                statusText += `*Pelapor:* ${ticket.username}\n`;
            }
            // --------------------------------

            statusText += `*Grup:* ${ticket.groupName}\n` +
                `*Dilaporkan pada:* ${ticket.createdAt.toLocaleString('id-ID')}\n`;

            if (ticket.status === 'Done') {
                statusText += `*Selesai pada:* ${ticket.completedAt.toLocaleString('id-ID')}\n`;
                if (ticket.adminMessage) statusText += `\n*📌 Catatan dari IT TA:*\n${ticket.adminMessage}`;
            } else if (ticket.adminMessage) {
                statusText += `\n*📌 Catatan dari IT TA:*\n${ticket.adminMessage}`;
            }

            await msg.reply(statusText, options); // Kirim balasan beserta options

        } catch (err) {
            console.error('❌ Kesalahan listener #lacak (WA):', err);
            if (waClientReady) {
                await waClient.sendMessage(msg.from, '❌ Terjadi kesalahan saat mengambil status tiket.');
            }
        }
    }
});


// ===== Listener tombol copy (callback) - Telegram =====
bot.on('callback_query', async callbackQuery => {
    const data = callbackQuery.data;

    if (data && data.startsWith('copy_')) {
        const ticketCode = data.replace('copy_', '');
        try {
            await bot.answerCallbackQuery(callbackQuery.id, { text: `${ticketCode} disalin!` });
        } catch (e) {
            console.warn('⚠️ Gagal answerCallbackQuery:', e && e.message);
        }
    }
});

// ===== Listener #lacak (Telegram) =====
bot.onText(/#lacak (.+)/, async (msg, match) => {
    try {
        const chatId = msg.chat.id;
        const messageId = msg.message_id;
        const code = match[1]?.toUpperCase();

        if (!code) return sendMessage(chatId, '❌ Format salah. Gunakan #lacak <kode_tiket>', { reply_to_message_id: messageId });

        const ticket = await Ticket.findOne({ ticketCode: code });
        if (!ticket) return sendMessage(chatId, `❌ Tiket ${code} tidak ditemukan.`, { reply_to_message_id: messageId });

        const created = ticket.createdAt;
        const createdDate = `${created.getDate()}/${created.getMonth() + 1}/${created.getFullYear()}`;
        const createdTime = `${created.getHours().toString().padStart(2, '0')}.${created.getMinutes().toString().padStart(2, '0')}.${created.getSeconds().toString().padStart(2, '0')}`;

        const completed = ticket.completedAt;
        const completedDate = completed ? `${completed.getDate()}/${completed.getMonth() + 1}/${completed.getFullYear()}` : "-";
        const completedTime = completed ? `${completed.getHours().toString().padStart(2, '0')}.${completed.getMinutes().toString().padStart(2, '0')}.${completed.getSeconds().toString().padStart(2, '0')}` : "-";

        const statusMessage = ticket.status === 'Done' ? `✅ ${ticket.status}` : `🟡 ${ticket.status}`;

        let statusText = `🔍 Status Tiket \`${escapeMarkdownV2(ticket.ticketCode)}\`\n` +
            `Status: ${escapeMarkdownV2(statusMessage)}\n` +
            `Masalah: \`${escapeMarkdownV2(ticket.text)}\`\n` +
            `Pelapor: [${escapeMarkdownV2(ticket.username)}](tg://user?id=${ticket.telegramUserId})\n` + // <-- MENTION TELEGRAM
            `Grup: ${escapeMarkdownV2(ticket.groupName)}\n` +
            `Dilaporkan pada: ${escapeMarkdownV2(createdDate)}, ${escapeMarkdownV2(createdTime)}\n`;

        if (ticket.status === 'Done') {
            statusText += `Selesai pada: ${escapeMarkdownV2(completedDate)}, ${escapeMarkdownV2(createdTime)}\n`;
            if (ticket.adminMessage) statusText += `📌 Catatan dari IT TA: ${escapeMarkdownV2(ticket.adminMessage)}\n`;
        } else if (ticket.adminMessage) {
            statusText += `📌 Catatan dari IT TA: ${escapeMarkdownV2(ticket.adminMessage)}\n`;
        }

        await sendMessage(chatId, statusText, { parse_mode: 'MarkdownV2', reply_to_message_id: messageId });

    } catch (err) {
        console.error('❌ Kesalahan listener #lacak:', err);
        await sendMessage(msg.chat.id, '❌ Terjadi kesalahan saat mengambil status tiket.', { reply_to_message_id: msg.message_id });
    }
});

// ====================================================================
// ===== BAGIAN 4: RUTE API [FUNGSI REPLY MEDIA TELAH DIOPTIMALKAN]
// ====================================================================

// Endpoint Root untuk Pengecekan Status
app.get('/', (req, res) => {
    res.json({
        status: 'Server berjalan',
        message: 'Selamat Datang di API Kendala Operasional!',
        timestamp: new Date().toISOString()
    });
});

// GET semua tiket + statistik
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
            appCategoryData: {},
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
            if (ticket.status === 'Done') acc.totalSelesai++;
            else acc.totalDiproses++;

            const platformKey = ticket.platform || 'Unknown';
            acc.platformData[platformKey] = (acc.platformData[platformKey] || 0) + 1;

            const appKey = ticket.appCategory || 'Lainnya';
            acc.appCategoryData[appKey] = (acc.appCategoryData[appKey] || 0) + 1;

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
        console.error('❌ Kesalahan saat mengambil data tiket:', err);
        res.status(500).json({ message: 'Gagal memuat tiket.' });
    }
});


// MODIFIKASI: Terapkan middleware dan update logika
app.post('/api/tickets/:id/reply', authenticateToken, upload.single('photo'), async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id);
        const { balasan } = req.body;

        if (!balasan || !ticket) return res.status(400).json({ message: 'Invalid input or ticket not found.' });

        // --- LOGIKA OTOMATISASI PIC ---
        ticket.pic = req.user.username.toLowerCase();
        console.log(`[AUTO-ASSIGN] Tiket ${ticket.ticketCode} di-assign ke PIC: ${ticket.pic} via reply`);
        // -----------------------------

        ticket.adminMessage = balasan;
        ticket.status = 'Done';
        ticket.completedAt = new Date();

        // Logika pengiriman notifikasi (Telegram/WA)
        if (ticket.platform === 'Telegram') {
            const replyNotification = `💬 <b>Pembaruan dari IT TA untuk tiket ${ticket.ticketCode}:</b>\n\n${balasan}`;
            try {
                if (req.file) {
                    const mimeType = req.file.mimetype;
                    // Kirim sebagai foto jika itu gambar
                    if (mimeType.startsWith('image/')) {
                        await sendPhoto(ticket.chatId, req.file.buffer, {
                            caption: replyNotification,
                            parse_mode: 'HTML',
                            reply_to_message_id: ticket.messageId
                        });
                    }
                    // Kirim sebagai dokumen (PDF/Excel/CSV, dll.)
                    else {
                        await sendDocument(ticket.chatId, req.file.buffer, {
                            filename: req.file.originalname,
                            caption: replyNotification,
                            parse_mode: 'HTML',
                            reply_to_message_id: ticket.messageId
                        });
                    }
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
            const replyNotification = `💬 Pembaruan dari Admin untuk tiket ${ticket.ticketCode}:\n\n${balasan}`;
            try {
                if (!waClientReady) throw new Error("Klien WhatsApp tidak siap.");

                if (req.file) {
                    // Menangani semua jenis media yang diunggah
                    const media = new MessageMedia(
                        req.file.mimetype,
                        req.file.buffer.toString('base64'),
                        req.file.originalname || 'file'
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

        io.emit('ticketUpdated', ticket);

        res.json({ success: true, message: 'Reply sent and ticket updated.' });
    } catch (err) {
        console.error('❌ Failed to complete ticket:', err);
        res.status(500).json({ message: 'Failed to update ticket.' });
    }
});


// PATCH untuk mengatur PIC - DILINDUNGI
app.patch('/api/tickets/:id/set-pic', authenticateToken, async (req, res) => {
    try {
        const { pic } = req.body;
        if (!PIC_LIST.includes(pic) && pic !== 'BelumDitentukan') return res.status(400).json({ message: 'PIC tidak valid.' });

        const updatedTicket = await Ticket.findByIdAndUpdate(req.params.id, { pic }, { new: true });

        // REAL-TIME: Kirim pembaruan ke klien
        io.emit('ticketUpdated', updatedTicket);

        res.json(updatedTicket);
    } catch (err) {
        console.error('❌ Gagal mengatur PIC:', err);
        res.status(500).json({ message: 'Gagal menugaskan PIC.' });
    }
});

// MODIFIKASI: Terapkan middleware dan update logika
app.patch('/api/tickets/:id/set-status', authenticateToken, async (req, res) => {
    try {
        const { status, adminMessage } = req.body;
        if (!STATUS_LIST.includes(status)) return res.status(400).json({ message: 'Invalid status.' });

        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });

        const oldStatus = ticket.status;

        // --- LOGIKA OTOMATISASI PIC ---
        // Logika otomatisasi PIC disempurnakan
        if ((ticket.status === 'Open' && (status === 'Diproses' || status === 'Waiting Third Party')) || ticket.pic === 'BelumDitentukan') {
            ticket.pic = req.user.username.toLowerCase();
            console.log(`[AUTO-ASSIGN] Tiket ${ticket.ticketCode} di-assign ke PIC: ${ticket.pic} via status change`);
        }
        // -----------------------------

        ticket.status = status;
        if (adminMessage) {
            ticket.adminMessage = adminMessage;
        }
        ticket.completedAt = status === 'Done' ? new Date() : null;

        await ticket.save();

        io.emit('ticketUpdated', ticket);

        // --- Logika Notifikasi ke Pengguna ---
        if (status !== oldStatus) {
            // Platform Telegram
            if (ticket.platform === 'Telegram') {
                try {
                    let notificationText;
                    const pesanAdminText = ticket.adminMessage ? `\n\n<b>Catatan dari IT TA:</b>\n${ticket.adminMessage}` : "";

                    if (status === 'Diproses') {
                        notificationText = `⏳ <b>Tiket ${ticket.ticketCode} Sedang Diproses!</b>\nStatus tiket Anda telah diubah menjadi: <b>${status}</b>.${pesanAdminText}`;
                    } else if (status === 'Waiting Third Party') {
                        notificationText = `⏳ <b>Tiket ${ticket.ticketCode} Menunggu Pihak Ketiga!</b>\nStatus tiket Anda telah diubah menjadi: <b>${status}</b>.${pesanAdminText}`;
                    } else if (status === 'Done') {
                        notificationText = `✅ <b>Tiket ${ticket.ticketCode} Selesai!</b>\nStatus tiket Anda telah diubah menjadi: <b>${status}</b>.\nTerima kasih atas laporan Anda.${pesanAdminText}`;
                    } else {
                        notificationText = `🔄 Status untuk tiket <code>${ticket.ticketCode}</code> diperbarui menjadi: <b>${status}</b>${pesanAdminText}`;
                    }

                    if (notificationText) {
                        await sendMessage(ticket.chatId, notificationText, {
                            parse_mode: 'HTML',
                            reply_to_message_id: ticket.messageId
                        });
                    }
                } catch (err) {
                    console.error('Gagal mengirim notifikasi status ke Telegram:', err);
                }
            }

            // Platform WhatsApp
            if (ticket.platform === 'WhatsApp' && waClientReady) {
                try {
                    let notificationText;
                    const pesanAdminText = ticket.adminMessage ? `\n\n*Catatan dari IT TA:*\n${ticket.adminMessage}` : "";

                    if (status === 'Diproses') {
                        notificationText = `⏳ *Tiket ${ticket.ticketCode} Sedang Diproses!*\nStatus tiket Anda telah diubah menjadi: *${status}*.${pesanAdminText}`;
                    } else if (status === 'Waiting Third Party') {
                        notificationText = `⏳ *Tiket ${ticket.ticketCode} Menunggu Pihak Ketiga!*\nStatus tiket Anda telah diubah menjadi: *${status}*.${pesanAdminText}`;
                    } else if (status === 'Done') {
                        notificationText = `✅ *Tiket ${ticket.ticketCode} Selesai!*\nStatus tiket Anda telah diubah menjadi: *${status}*.\nTerima kasih atas laporan Anda.${pesanAdminText}`;
                    } else {
                        notificationText = `🔄 Status untuk tiket ${ticket.ticketCode} diperbarui menjadi: *${status}*${pesanAdminText}`;
                    }

                    if (notificationText) {
                        await waClient.sendMessage(ticket.chatId, notificationText, {
                            quotedMessageId: ticket.messageId
                        });
                    }
                } catch (err) {
                    console.error('❌ Gagal mengirim notifikasi status ke WhatsApp:', err.message);
                }
            }
        }
        // --- Akhir Logika Notifikasi Pengguna ---

        res.json(ticket);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update ticket status.' });
    }
});


// Ekspor ke Excel
app.get('/api/tickets/export', async (req, res) => {
    try {
        const tickets = await Ticket.find().sort({ createdAt: -1 });
        const workbook = new excel.Workbook();
        const worksheet = workbook.addWorksheet('Daftar Kendala');

        worksheet.columns = [
            { header: 'Kode Tiket', key: 'ticketCode', width: 15 },
            { header: 'Platform', key: 'platform', width: 12 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Kategori Aplikasi', key: 'appCategory', width: 20 },
            { header: 'PIC', key: 'pic', width: 15 },
            { header: 'Pelapor (Username/Nama)', key: 'username', width: 25 },
            { header: 'ID Pelapor', key: 'reporterId', width: 30 },
            { header: 'Grup/Chat', key: 'groupName', width: 25 },
            { header: 'Deskripsi Masalah', key: 'text', width: 50 },
            { header: 'Tanggal Lapor', key: 'createdAt', width: 25 },
            { header: 'Tanggal Selesai', key: 'completedAt', width: 25 },
            { header: 'Catatan Admin', key: 'adminMessage', width: 50 }
        ];

        tickets.forEach(ticket => {
            let reporterIdDisplay;

            if (ticket.platform === 'WhatsApp') {
                reporterIdDisplay = `HP: ${ticket.telegramUserId}`;
            } else if (ticket.platform === 'Telegram') {
                reporterIdDisplay = `ID TG: ${ticket.telegramUserId} (User: ${ticket.username})`;
            } else {
                reporterIdDisplay = ticket.telegramUserId;
            }

            const rowData = {
                ticketCode: ticket.ticketCode,
                platform: ticket.platform,
                status: ticket.status,
                appCategory: ticket.appCategory || 'Lainnya',
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

// ===== Rute Otentikasi =====
// PASTIKAN rute ini mengarah ke file yang benar
app.use('/api/auth', authRoutes); 
app.use('/api/auth', localAuthRoutes); // <-- TAMBAHAN BARU: Pendaftaran rute

// ====================================================================
// ===== BAGIAN 5: MULAI SERVER [DIPERBARUI]
// ====================================================================

// PENJELASAN WEBSOCKET (SOCKET.IO)
io.on('connection', (socket) => {
    console.log('🔌 Seorang pengguna terhubung ke WebSocket');
    socket.on('disconnect', () => {
        console.log('Pengguna terputus');
    });
});

// Gunakan 'server.listen' alih-alih 'app.listen' untuk menjalankan server HTTP dan WebSocket
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server API & WebSocket berjalan di http://localhost:${PORT}`);
});