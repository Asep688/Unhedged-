export const CONFIG = {
  BET_AMOUNT: 5,
  MAX_BETS: 3,
  MAX_COINS: 10,

  // ===== DIFF =====
  MIN_DIFF_SHORT: 0.0025,  // 0.2% (CTM)
  MIN_DIFF_LONG: 0.0025,   // 0.4% (Event)

  // ===== TRIGGER =====
  TRIGGER_SHORT: 20, // detik sebelum close
  TRIGGER_LONG: 20,  // lebih aman untuk event

  // ===== LIMIT =====
  MAX_DELAY: 60 * 60, // 1 jam (short)

  // ===== REFRESH =====
  REFRESH_INTERVAL: 600000 // 10 menit
};
