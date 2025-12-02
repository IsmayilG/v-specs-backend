const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const Player = require('./models/Player');
require('dotenv').config();

// MONGODB BAĞLANTISI
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("🟢 DB Bağlandı! Tarayıcı açılıyor..."))
    .catch(err => console.log("🔴 DB Hatası:", err));

async function scrapeProSettings() {
    // 1. Tarayıcıyı Başlat (Headless: false yaparsan tarayıcıyı görürsün)
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // 2. Siteye Git
    console.log("📡 ProSettings.net'e gidiliyor...");
    await page.goto('https://prosettings.net/lists/valorant/', { waitUntil: 'networkidle2' });

    // 3. Tablo verilerini çek (Sayfa yapısına göre burası değişebilir!)
    // Bu kod, tablodaki satırları (tr) bulup içindeki verileri okur.
    const playersData = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('tbody tr')); // Tablo satırlarını bul

        return rows.slice(0, 10).map((row, index) => { // İlk 10 kişiyi çekelim (Test için)
            const columns = row.querySelectorAll('td');

            // Eğer sütunlar beklendiği gibi değilse boş dön
            if (columns.length < 5) return null;

            return {
                id: 200 + index, // Çakışmasın diye 200'den başlatıyoruz
                name: columns[0]?.innerText.trim() || "Bilinmiyor",
                team: columns[1]?.innerText.trim() || "Free Agent",
                // Mouse, DPI, Sens genelde tablonun ileriki sütunlarındadır
                // Not: Sitenin anlık yapısına göre bu indeksler (3, 4, 5) değişebilir!
                dpi: parseInt(columns[3]?.innerText) || 800,
                sensitivity: columns[4]?.innerText || "0.3",
                edpi: columns[5]?.innerText || "240",
                hardware: {
                    mouse: columns[6]?.innerText || ""
                },
                // Resim için yer tutucu kullanıyoruz (Telif yememek için)
                image: "https://via.placeholder.com/150/FF4655/FFFFFF?text=PRO",
                role: "Pro Player" // Varsayılan
            };
        }).filter(p => p !== null); // Boşları temizle
    });

    console.log(`✅ ${playersData.length} oyuncu bulundu. Veritabanına yazılıyor...`);

    // 4. Veritabanına Kaydet
    for (const p of playersData) {
        // İsmi aynı olan varsa güncelleme, yoksa ekle
        await Player.findOneAndUpdate(
            { name: p.name },
            p,
            { upsert: true, new: true }
        );
        console.log(`💾 ${p.name} kaydedildi.`);
    }

    console.log("🏁 İŞLEM TAMAMLANDI!");
    await browser.close();
    process.exit();
}

scrapeProSettings();