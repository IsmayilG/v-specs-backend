const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'v-specs-avatars', // Cloudinary'de bu klasöre kaydedecek
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'], // İzin verilenler
    },
});
const upload = multer({ storage: storage });
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
// --- 👑 ADMIN İŞLEMLERİ ---

// Middleware: Sadece Adminler Geçebilir!
const verifyAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (user && user.isAdmin) {
            next(); // Geç patron!
        } else {
            res.status(403).json({ message: "Bu işlem için YETKİNİZ YOK!" });
        }
    } catch (err) {
        res.status(500).json({ message: "Yetki kontrol hatası" });
    }
};

// 1. YENİ OYUNCU EKLE (POST)
app.post('/api/admin/players', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const newPlayer = new Player(req.body);
        await newPlayer.save();
        res.json({ message: "✅ Oyuncu Eklendi!", player: newPlayer });
    } catch (error) {
        res.status(500).json({ message: "Ekleme hatası", error: error.message });
    }
});

// 2. OYUNCU GÜNCELLE (PUT)
app.put('/api/admin/players/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        // ID'si verilen oyuncuyu bul ve gelen verilerle güncelle
        const updated = await Player.findOneAndUpdate(
            { id: req.params.id }, // Bizim özel ID'miz (1, 2, 3...)
            { $set: req.body },
            { new: true }
        );
        res.json({ message: "✅ Oyuncu Güncellendi!", player: updated });
    } catch (error) {
        res.status(500).json({ message: "Güncelleme hatası" });
    }
});

// 3. OYUNCU SİL (DELETE)
app.delete('/api/admin/players/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        await Player.findOneAndDelete({ id: req.params.id });
        res.json({ message: "🗑️ Oyuncu Silindi!" });
    } catch (error) {
        res.status(500).json({ message: "Silme hatası" });
    }
});
// --- 🤖 AI CHAT ROTASI (MANUEL BAĞLANTI - FLASH MODEL) ---
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        // Google'ın en yeni ve standart modeli: gemini-1.5-flash
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        // Koç Rolü
                        text: `Sen V-SPECS adında, uzman bir Valorant koçusun. Oyuncu sana şunu soruyor: "${message}". Ona kısa, taktiksel ve motive edici bir cevap ver.`
                    }]
                }]
            })
        });

        const data = await response.json();

        // Hata Kontrolü
        if (data.error) {
            console.error("Google Hatası:", data.error);
            return res.status(500).json({ reply: "Hata: " + data.error.message });
        }

        // Cevabı Al
        if (data.candidates && data.candidates[0].content) {
            const replyText = data.candidates[0].content.parts[0].text;
            res.json({ reply: replyText });
        } else {
            res.json({ reply: "Cevap alınamadı." });
        }

    } catch (error) {
        console.error("Sunucu Hatası:", error);
        res.status(500).json({ reply: "Sunucu hatası." });
    }
});
app.listen(PORT, () => {
    console.log(`🔥 Sunucu çalışıyor: http://localhost:${PORT}`);
});
// 3. RESİM YÜKLEME ROTASI (Yeni)
// Kullanıcı dosya seçince buraya gelecek, biz de link döneceğiz.
app.post('/api/upload', upload.single('image'), (req, res) => {
    try {
        // Yükleme başarılıysa Cloudinary bize dosya bilgisini verir
        res.json({ url: req.file.path });
    } catch (error) {
        res.status(500).json({ message: "Resim yüklenemedi." });
    }
});
// Render guncelleme v3