🚀 Unhedged Sniper Bot (Auto Trading)

Bot otomatis untuk Unhedged.gg prediction market dengan strategi last-second sniper menggunakan harga real-time dari Binance + tracking performa lengkap.

---

✨ Fitur Utama

- ⚡ Eksekusi otomatis di 30 detik terakhir
- 📊 Harga real-time dari Binance (tanpa API tambahan)
- 🧠 Auto detect coin:
  - Bitcoin / BTC / btc
  - Ethereum / ETH / eth
  - Solana / SOL / sol
- 🎯 Filter market:
  - YES / NO saja
  - Harus ada target harga (above / below)
  - Maksimal 1 jam sebelum close
- 💰 Limit:
  - jumlah bet
  - jumlah coin
- 📈 Tampilan harga + persen + arah (📈📉)
- 📊 Tracking performa:
  - total bet
  - win / loss
  - profit
  - winrate
- 💾 Stats tersimpan otomatis ("stats.json")

---

📁 Struktur Project

Unhedged-/
├── bot.js        # main bot
├── config.js     # pengaturan bot
├── stats.json    # data performa
├── .env          # API key
├── package.json

---

⚙️ Instalasi

1. Clone repo

git clone https://github.com/Asep688/Unhedged-
cd Unhedged-

---

2. Install dependency

npm install

---

3. Setup API Key

Buat file ".env":

nano .env

Isi:

API_KEY=ak_xxxxxxxxxxxxx

⚠️ Jangan share API key ke publik

---

4. Setup stats.json

nano stats.json

Isi:

{
  "totalBets": 0,
  "wins": 0,
  "losses": 0,
  "profit": 0
}

---

5. Jalankan bot

npm start

atau:

node bot.js

---

🧠 Cara Kerja Bot

1. Ambil market dari Unhedged
2. Filter market valid:
   - crypto
   - YES/NO
   - above/below
   - ≤ 1 jam
3. Tampilkan harga coin (real-time)
4. Tunggu hingga 30 detik sebelum close
5. Ambil harga terbaru dari Binance
6. Hitung selisih (diff)
7. Jika memenuhi syarat → otomatis bet

---

📊 Contoh Output

🚀 Bot Started

🔄 Refresh Market
Balance: 50 CC

📊 ===== STATS =====
Total Bets : 10
Wins       : 6
Losses     : 4
Profit     : +12 CC
Winrate    : 60%

📈 BTCUSDT → $71000 (+0.52%)
📉 ETHUSDT → $2180 (-0.30%)

⏳ Scheduled: Bitcoin above $70000
   ⏱ 25.3 sec

---

⚙️ Config (config.js)

Kamu bisa ubah strategi di sini:

export const CONFIG = {
  BET_AMOUNT: 5,        // jumlah CC per bet
  MAX_BETS: 3,          // maksimal bet per cycle
  MAX_COINS: 3,         // maksimal coin berbeda
  MIN_DIFF: 0.0035,     // minimal selisih (0.35%)
  TRIGGER_TIME: 30,     // detik sebelum close
  MAX_DELAY: 60 * 60    // max waktu (1 jam)
};

---

📊 Stats (stats.json)

Disimpan otomatis:

{
  "totalBets": 20,
  "wins": 15,
  "losses": 5,
  "profit": 30
}

---

⚠️ Catatan Penting

- Bot tidak akan bet jika:
  - saldo 0 CC
  - API key tidak valid
- Coin yang tidak ada di Binance (misal CC) akan:
  - tetap terdeteksi
  - tapi di-skip

---

🛠 Troubleshooting

❌ API_KEY tidak ditemukan

Pastikan ".env" ada dan benar

---

❌ npm start error

Pastikan "package.json" ada:

"scripts": {
  "start": "node bot.js"
}

---

❌ Coin tidak muncul

Pastikan market mengandung:

- BTC / Bitcoin
- ETH / Ethereum
- SOL / Solana

---

❌ Tidak ada bet

Kemungkinan:

- diff terlalu kecil
- saldo habis

---

🚀 Upgrade Selanjutnya

Fitur yang bisa ditambahkan:

- 📈 Ranking market terbaik (auto pilih)
- 🧠 AI prediction
- 🔔 Notifikasi Telegram
- 🛑 Auto stop jika loss
- ⚡ Ultra sniper (monitor per detik)

---

⚠️ Disclaimer

Gunakan bot ini dengan risiko sendiri.
Bot ini bukan jaminan profit.

---

👨‍💻 Author

GitHub: https://github.com/Asep688
