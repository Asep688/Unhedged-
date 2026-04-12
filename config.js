export const CONFIG = {
  BET_AMOUNT: 5, 
  // 💰 Jumlah taruhan per bet (dalam CC)

  MAX_BETS: 10, 
  // 🔢 Maksimal jumlah bet dalam satu siklus refresh

  MAX_COINS: 4, 
  // 🪙 Maksimal jumlah koin berbeda (BTC, ETH, SOL, dll)
  // Catatan: CC tidak dihitung dalam limit ini

  MIN_DIFF: 0.0025, 
  // 📊 Minimal selisih harga (0.0035 = 0.35%)
  // Semakin besar → semakin selektif (lebih sedikit bet)

  TRIGGER_TIME: 30, 
  // ⏱ Waktu eksekusi sebelum market ditutup (dalam detik)
  // Contoh: 30 = bet dilakukan 30 detik sebelum close

  MAX_DELAY: 60 * 60, 
  // ⏳ Maksimal jarak waktu market dari sekarang (dalam detik)
  // 60*60 = 1 jam → hanya ambil market yang akan close ≤ 1 jam

  REFRESH_INTERVAL: 20 * 60 * 1000 
  // 🔄 Interval auto refresh market (dalam milidetik)
  // 10*60*1000 = 10 menit
};
