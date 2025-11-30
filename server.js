const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// Modelleri ve Veriyi Çağır
const Player = require('./models/Player');
const playersData = require('./playersData');

// --- 1. ÖNCE "app" OLUŞTURULMALI ---
const app = express();
const PORT = 5000;

// --- 2. SONRA MIDDLEWARE'LER ---
app.use(cors());
app.use(express.json());

// --- 3. VERİTABANI BAĞLANTISI ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("🟢 MONGODB BAĞLANTISI BAŞARILI!"))
    .catch(err => console.error("🔴 Bağlantı Hatası:", err));

// --- 4. ROTALAR (En Sona Yazılır) ---

// Ana Sayfa
app.get('/', (req, res) => {
    res.json({ message: "V-SPECS API Yayında! 🚀" });
});

// 🛠️ SEED ROUTE (Verileri Yükleme)
app.get('/api/seed', async (req, res) => {
    try {
        // Önce temizle
        await Player.deleteMany({});
        // Sonra ekle
        await Player.insertMany(playersData);

        res.json({ message: "✅ Başarılı! 39 Oyuncu Veritabanına Eklendi." });
    } catch (error) {
        res.status(500).json({ message: "Hata oluştu", error: error.message });
    }
});

// Gerçek Oyuncu Listesini Getiren Rota (Bunu da ekledim lazım olacak)
app.get('/api/players', async (req, res) => {
    try {
        const players = await Player.find();
        res.json(players);
    } catch (error) {
        res.status(500).json({ message: "Veri çekilemedi" });
    }
});

// --- 5. EN SON SUNUCUYU BAŞLAT ---
app.listen(PORT, () => {
    console.log(`🔥 Sunucu çalışıyor: http://localhost:${PORT}`);
});