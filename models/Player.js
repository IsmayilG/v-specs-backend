const mongoose = require('mongoose');

// Oyuncu Verisinin Şablonu (Schema)
const PlayerSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true }, // ID zorunlu ve eşsiz
    name: { type: String, required: true }, // İsim zorunlu
    team: { type: String, required: true },
    region: String,
    agents: [String], // Birden fazla ajan olabilir (Dizi)
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
    image: String,
    social: {
        twitter: String,
        twitch: String
    }
});

module.exports = mongoose.model('Player', PlayerSchema);