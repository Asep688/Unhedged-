🚀 Unhedged Sniper Bot

Bot otomatis untuk trading di Unhedged.gg

Fitur:

- ✅ BTC / ETH / SOL (harga dari Binance)
- ✅ CC / Canton Coin (harga dari Unhedged)
- ✅ Auto bet berdasarkan selisih harga
- ✅ Stats (profit, winrate, dll)

---

📁 Struktur Project

Unhedged-/
├── bot.js
├── config.js
├── stats.json
├── .env
├── package.json

---

⚙️ 1. Install

git clone https://github.com/Asep688/Unhedged-
cd Unhedged-
npm install

---

🔐 2. Setup API KEY

Buat file ".env":

nano .env

Isi:

API_KEY=ak_xxxxxxxxxxxxxx

---

📊 3. Setup Stats

Buat file "stats.json":

{
  "totalBets": 0,
  "wins": 0,
  "losses": 0,
  "profit": 0
}

---

⚙️ 4. Config Bot

Edit "config.js":

export const CONFIG = {
  BET_AMOUNT: 5,        // jumlah taruhan per bet
  MAX_BETS: 3,          // maksimal bet per siklus
  MAX_COINS: 3,         // jumlah coin berbeda
  MIN_DIFF: 0.0035,     // minimal selisih 0.35%
  TRIGGER_TIME: 30,     // detik sebelum close
  MAX_DELAY: 60 * 60,   // maksimal 1 jam
  REFRESH_INTERVAL: 10 * 60 * 1000 // refresh tiap 10 menit
};

---

🇮🇩 Catatan Bahasa Indonesia di Config

- Komentar Bahasa Indonesia aman digunakan
- Tidak akan menyebabkan error
- Disarankan untuk penjelasan agar lebih mudah dipahami

Contoh yang benar:

MIN_DIFF: 0.0035 // selisih minimal 0.35%

---

⚠️ Hindari kesalahan ini:

❌ Kurang koma:

BET_AMOUNT: 5
MAX_BETS: 3

❌ Key pakai spasi:

MAX BETS: 3

❌ Tipe data salah:

MIN_DIFF: "0.0035"

---

▶️ 5. Jalankan Bot

node bot.js

atau:

npm start

---

📈 Output

🚀 Bot Started

📊 STATS
Total Bets / Profit / Winrate

📈 BTCUSDT → $xxxx (+x%)
🟡 CC → $x.xx

⏳ Scheduled: Market

---

⚠️ Catatan

- Jika "Balance = 0 CC" → bot tidak bisa bet
- CC menggunakan harga dari Unhedged
- Bot hanya ambil market mendekati waktu close

---

🔥 Tips

- Gunakan VPS agar bot jalan 24 jam
- Atur "MIN_DIFF":
  - kecil → lebih sering bet
  - besar → lebih selektif

---

🧩 Fitur

- Auto detect coin (BTC, ETH, SOL, CC)
- Hybrid pricing (Binance + Unhedged)
- Limit bet & coin
- Stats otomatis tersimpan

---

🚀 Selesai

Bot siap digunakan 🎯
