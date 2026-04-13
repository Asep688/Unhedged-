export const CONFIG = {
  BET_AMOUNT: 5,
  MAX_BETS: 3,
  MAX_COINS: 3,

  // ===== DIFF =====
  MIN_DIFF_SHORT: 0.002,  // 0.2% (CTM)
  MIN_DIFF_LONG: 0.004,   // 0.4% (Event)

  // ===== TRIGGER =====
  TRIGGER_SHORT: 30, // detik sebelum close
  TRIGGER_LONG: 60,  // lebih aman untuk event

  // ===== LIMIT =====
  MAX_DELAY: 60 * 60, // 1 jam (short)

  // ===== REFRESH =====
  REFRESH_INTERVAL: 600000 // 10 menit
};
