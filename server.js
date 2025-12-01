const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// --- YENİ EKLENECEKLER (En üste) ---
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User'); // Yeni modelimiz
const JWT_SECRET = "cok_gizli_bir_sifre_buraya_yaz"; // Normalde .env'de saklanır ama şimdilik burada olsun

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

// --- 🔐 AUTH ROTALARI ---

// 1. KAYIT OL (REGISTER)
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Basit kontrol
        if (!username || !email || !password) {
            return res.status(400).json({ message: "Lütfen tüm alanları doldurun." });
        }

        // Şifreyi Gizle (Hash)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Yeni kullanıcıyı oluştur
        const newUser = new User({
            username,
            email,
            password: hashedPassword
        });

        // Veritabanına kaydet
        await newUser.save();

        res.status(201).json({ message: "✅ Kayıt başarılı! Şimdi giriş yapabilirsiniz." });

    } catch (error) {
        // Eğer kullanıcı adı veya email zaten varsa hata verir
        if (error.code === 11000) {
            return res.status(400).json({ message: "Bu kullanıcı adı veya email zaten kullanılıyor." });
        }
        res.status(500).json({ message: "Sunucu hatası", error: error.message });
    }
});

// 2. GİRİŞ YAP (LOGIN)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Kullanıcıyı bul
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Kullanıcı bulunamadı." });

        // Şifreyi kontrol et (Girilen şifre ile veritabanındaki şifreli halini kıyasla)
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Hatalı şifre!" });

        // Kimlik Kartı (Token) oluştur
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

// --- 🛡️ MIDDLEWARE (Güvenlik Kontrolü) ---
// Bu fonksiyon, gelen istekte "Giriş Bileti" (Token) var mı diye bakar.
const verifyToken = (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) return res.status(401).json({ message: "Erişim Reddedildi. Giriş yapmalısınız." });

    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified; // Token içindeki ID'yi (verified) isteğe ekle
        next(); // Devam et
    } catch (error) {
        res.status(400).json({ message: "Geçersiz Token." });
    }
};

// --- 👤 PROFİL ROTALARI ---

// 1. Kendi Profilimi Getir (GET)
app.get('/api/user/profile', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password'); // Şifreyi gönderme
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Profil getirilemedi." });
    }
});

// 2. Ayarlarımı Güncelle (PUT)
app.put('/api/user/profile', verifyToken, async (req, res) => {
    try {
        // Gelen verileri al (mouse, dpi, crosshair vs.)
        const { mySetup } = req.body;

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { mySetup: mySetup } }, // Sadece setup kısmını güncelle
            { new: true } // Güncel halini geri döndür
        ).select('-password');

        res.json({ message: "✅ Ayarlar Kaydedildi!", user: updatedUser });

    } catch (error) {
        res.status(500).json({ message: "Güncelleme hatası." });
    }
});

// --- 5. EN SON SUNUCUYU BAŞLAT ---
app.listen(PORT, () => {
    console.log(`🔥 Sunucu çalışıyor: http://localhost:${PORT}`);
});