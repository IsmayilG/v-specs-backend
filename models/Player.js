const mongoose = require('mongoose');

// Oyuncu Verisinin Şablonu (Schema) - GÜNCELLENDİ
const PlayerSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    team: { type: String, required: true },
    region: String,
    agents: [String],
    roles: [String],
    sensitivity: String,
    crosshair: String,
    resolution: String,
    dpi: Number,
    zoom_sensitivity: Number,
    keybinds: {
        ability1: String,
        ability2: String,
        ultimate: String
    },
    hardware: {
        mouse: String,
        keyboard: String,
        monitor: String,
        headset: String
    },

    // --- 💰 YENİ EKLENEN ALANLAR (PARA & CANLILIK) ---
    twitchUser: { type: String, default: "" }, // Örn: "tenz" (Canlı yayın kontrolü için)

    shopLinks: {
        mouse: { type: String, default: "" },    // Amazon Affiliate Linki buraya
        keyboard: { type: String, default: "" },
        monitor: { type: String, default: "" },
        headset: { type: String, default: "" }
    },
    // --------------------------------------------------

    image: String,
    social: {
        twitter: String,
        twitch: String
    }
});

module.exports = mongoose.model('Player', PlayerSchema);