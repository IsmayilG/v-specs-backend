const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const JWT_SECRET = "cok_gizli_bir_sifre_buraya_yaz";
const Player = require('./models/Player');
const playersData = require('./playersData');
const app = express();
const PORT = 5000;
app.use(cors());
app.use(express.json());
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("🟢 MONGODB BAĞLANTISI BAŞARILI!"))
    .catch(err => console.error("🔴 Bağlantı Hatası:", err));
app.get('/', (req, res) => {
    res.json({ message: "V-SPECS API Yayında! 🚀" });
});
app.get('/api/seed', async (req, res) => {
    try {
        await Player.deleteMany({});
        await Player.insertMany(playersData);
        res.json({ message: "✅ Başarılı! 39 Oyuncu Veritabanına Eklendi." });
    } catch (error) {
        res.status(500).json({ message: "Hata oluştu", error: error.message });
    }
});
app.get('/api/players', async (req, res) => {
    try {
        const players = await Player.find();
        res.json(players);
    } catch (error) {
        res.status(500).json({ message: "Veri çekilemedi" });
    }
});
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ message: "Lütfen tüm alanları doldurun." });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = new User({
            username,
            email,
            password: hashedPassword
        });
        await newUser.save();
        res.status(201).json({ message: "✅ Kayıt başarılı! Şimdi giriş yapabilirsiniz." });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Bu kullanıcı adı veya email zaten kullanılıyor." });
        }
        res.status(500).json({ message: "Sunucu hatası", error: error.message });
    }
});
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Kullanıcı bulunamadı." });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Hatalı şifre!" });
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            message: "Giriş Başarılı!",
            token,
            username: user.username,
            mySetup: user.mySetup
        });
    } catch (error) {
        res.status(500).json({ message: "Sunucu hatası" });
    }
});
const verifyToken = (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) return res.status(401).json({ message: "Erişim Reddedildi. Giriş yapmalısınız." });
    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        res.status(400).json({ message: "Geçersiz Token." });
    }
};
app.get('/api/user/profile', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Profil getirilemedi." });
    }
});
// 2. Ayarlarımı VE Resmimi Güncelle (PUT) - GARANTİLİ VERSİYON
app.put('/api/user/profile', verifyToken, async (req, res) => {
    try {
        // Frontend'den gelen verileri tek tek alıyoruz
        const { mySetup, avatar } = req.body;

        // Veritabanına neyi güncelleyeceğini açıkça söylüyoruz
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            {
                $set: {
                    mySetup: mySetup, // User.js'deki mySetup alanına -> gelen mySetup'ı koy
                    avatar: avatar    // User.js'deki avatar alanına -> gelen avatar'ı koy
                }
            },
            { new: true }
        ).select('-password');

        res.json({ message: "✅ Profil Güncellendi!", user: updatedUser });

    } catch (error) {
        console.error(error); // Hatayı terminale yazdır ki görelim
        res.status(500).json({ message: "Güncelleme hatası." });
    }
});
app.listen(PORT, () => {
    console.log(`🔥 Sunucu çalışıyor: http://localhost:${PORT}`);
});