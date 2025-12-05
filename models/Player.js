const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
    id: { type: Number, required: true },
    name: { type: String, required: true },
    team: { type: String, required: true },
    region: { type: String, required: true },
    agents: [{ type: String }],
    roles: [{ type: String }],
    sensitivity: { type: String },
    crosshair: { type: String },
    resolution: { type: String },
    dpi: { type: Number },
    zoom_sensitivity: { type: Number },
    keybinds: {
        ability1: { type: String },
        ability2: { type: String },
        ultimate: { type: String }
    },
    hardware: {
        mouse: { type: String },
        keyboard: { type: String },
        monitor: { type: String },
        headset: { type: String }
    },
    image: { type: String },
    social: {
        twitter: { type: String },
        twitch: { type: String }
    }
});

module.exports = mongoose.model('Player', PlayerSchema);