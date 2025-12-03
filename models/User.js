const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    isPremium: { type: Boolean, default: false },
    avatar: { type: String, default: "" },

    mySetup: {
        mouse: { type: String, default: "" },
        dpi: { type: Number, default: 800 },
        sensitivity: { type: Number, default: 0.3 },
        crosshair: { type: String, default: "" },
        rank: { type: String, default: "Unranked" }
    },
    favorites: [Number]
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
//hii