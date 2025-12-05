const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// --- MODELLER ---
// Bu dosyaların var olduğundan emin ol!
const User = require('./models/User');
const Player = require('./models/Player');

// --- OPSİYONEL VERİ ---
// Eğer playersData.js yoksa sunucu çökmesin diye kontrol
let playersData = [];
try {
    playersData = require('./playersData');
} catch (e) {
    console.log("⚠️ Uyarı: playersData.js bulunamadı, seed işlemi yapılamayabilir.");
}

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "gizli_anahtar_varsayilan";

app.use(cors());
app.use(express.json());

if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
}

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'v-specs-avatars',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    },
});
const upload = multer({ storage: storage });

// --- MONGODB BAĞLANTISI ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("🟢 MONGODB BAĞLANTISI BAŞARILI!"))
    .catch(err => {
        console.error("🔴 MONGODB BAĞLANTI HATASI:", err.message);
        console.log("👉 İpucu: .env dosyasındaki MONGO_URI doğru mu?");
    });

// --- ROTALAR ---

// Test Rotası
app.get('/', (req, res) => {
    res.json({ message: "V-SPECS API Yayında! 🚀" });
});

// Seed (Veri Yükleme) Rotası
app.get('/api/seed', async (req, res) => {
    try {
        if (playersData.length === 0) {
            return res.status(400).json({ message: "playersData.js boş veya bulunamadı." });
        }
        await Player.deleteMany({});
        await Player.insertMany(playersData);
        res.json({ message: `✅ Başarılı! ${playersData.length} Oyuncu Veritabanına Eklendi.` });
    } catch (error) {
        res.status(500).json({ message: "Seed hatası", error: error.message });
    }
});

// Tüm Oyuncuları Getir
app.get('/api/players', async (req, res) => {
    try {
        const players = await Player.find();
        res.json(players);
    } catch (error) {
        res.status(500).json({ message: "Veri çekilemedi" });
    }
});

// Kayıt Ol
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ message: "Lütfen tüm alanları doldurun." });
        }

        // Şifreleme
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            username,
            email,
            password: hashedPassword
        });

        await newUser.save();
        res.status(201).json({ message: "✅ Kayıt başarılı! Giriş yapabilirsiniz." });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Bu kullanıcı adı veya email zaten kullanılıyor." });
        }
        res.status(500).json({ message: "Sunucu hatası", error: error.message });
    }
});

// Giriş Yap
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
            mySetup: user.mySetup,
            isPremium: false // Şimdilik hardcoded
        });
    } catch (error) {
        res.status(500).json({ message: "Sunucu hatası" });
    }
});

// Middleware: Token Doğrulama
const verifyToken = (req, res, next) => {
    // Header'da 'auth-token' arıyoruz (Frontend'de bu isimle gönderdiğine emin ol)
    const token = req.header('auth-token');
    if (!token) return res.status(401).json({ message: "Erişim Reddedildi." });

    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        res.status(400).json({ message: "Geçersiz Token." });
    }
};

// Profil Getir
app.get('/api/user/profile', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Profil hatası." });
    }
});

// Profil Güncelle
app.put('/api/user/profile', verifyToken, async (req, res) => {
    try {
        const { mySetup, avatar } = req.body;
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { mySetup: mySetup, avatar: avatar } },
            { new: true }
        ).select('-password');
        res.json({ message: "✅ Profil Güncellendi!", user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: "Güncelleme hatası." });
    }
});

// AI Chat Rotası
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ reply: "API Anahtarı eksik (Server Config)." });
        }

        const response = await fetch("[https://api.groq.com/openai/v1/chat/completions](https://api.groq.com/openai/v1/chat/completions)", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: "Sen V-SPECS Valorant koçusun. Kısa ve net cevap ver." },
                    { role: "user", content: message }
                ],
                temperature: 0.7
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        res.json({ reply: data.choices[0].message.content });
    } catch (error) {
        console.error("AI Hatası:", error.message);
        res.status(500).json({ reply: "Koç şu an müsait değil. (Sunucu Hatası)" });
    }
});

// Resim Yükleme (Multer)
app.post('/api/upload', upload.single('image'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "Dosya seçilmedi." });
        res.json({ url: req.file.path });
    } catch (error) {
        res.status(500).json({ message: "Yükleme başarısız." });
    }
});

// --- SUNUCUYU BAŞLAT (EN SONDA OLMALI) ---
app.listen(PORT, () => {
    console.log(`🔥 Sunucu çalışıyor: http://localhost:${PORT}`);
});