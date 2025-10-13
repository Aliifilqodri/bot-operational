// models/User.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Menggunakan bcryptjs

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true // Normalisasi username untuk DB: lowercase, tanpa spasi di input (diasumsikan sudah dihapus di layer controller/service)
    },
    password: {
        type: String,
        required: true
    },
    displayName: { // Field untuk nama tampilan (yang akan dikirim di JWT payload)
        type: String,
        required: true,
        default: 'Pengguna Sistem'
    },
    role: {
        type: String,
        required: true,
        enum: ['pic', 'admin', 'user'],
        default: 'pic' // Default disetel ke 'pic' sesuai konteks aplikasi
    }
}, { 
    timestamps: true // Menambahkan createdAt dan updatedAt
});

// --- Middleware PRE-SAVE untuk Hashing Password ---
userSchema.pre('save', async function(next) {
    // Hanya hash password jika field password diubah (atau baru)
    if (!this.isModified('password')) {
        return next();
    }
    
    try {
        // Generate salt dan hash password
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        // Meneruskan error ke handler Mongoose/Express
        next(err); 
    }
});

// --- Metode untuk Membandingkan Password ---
/**
 * Membandingkan password yang dimasukkan dengan hash di database.
 * @param {string} enteredPassword - Password yang dimasukkan pengguna.
 * @returns {Promise<boolean>} True jika cocok, False jika tidak.
 */
userSchema.methods.matchPassword = async function(enteredPassword) {
    // Menggunakan bcryptjs.compare
    return await bcrypt.compare(enteredPassword, this.password);
};

// Alias untuk kompatibilitas dengan contoh pertama di index.js
userSchema.methods.comparePassword = userSchema.methods.matchPassword; 

// --- Ekspor Model ---
const User = mongoose.model('User', userSchema);
module.exports = User;