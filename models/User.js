const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    // Kullanıcının Kendi Ayarları (Profilim kısmı için)
    mySetup: {
        mouse: { type: String, default: "" },
        dpi: { type: Number, default: 800 },
        sensitivity: { type: Number, default: 0.3 },
        crosshair: { type: String, default: "" }, // Crosshair kodunu buraya kaydedecek
        rank: { type: String, default: "Unranked" }
    },
    // Favoriye aldığı oyuncuların ID'leri
    favorites: [Number]
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);