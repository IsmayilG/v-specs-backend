const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    avatar: { type: String, default: "" },
    mySetup: {
        mouse: { type: String, default: "" },
        keyboard: { type: String, default: "" },
        monitor: { type: String, default: "" },
        headset: { type: String, default: "" }
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);