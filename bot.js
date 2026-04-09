import axios from "axios";
import 'dotenv/config';

const API_KEY = process.env.API_KEY;

// ===== CONFIG =====
const BET_AMOUNT = 5;
const MIN_DIFF = 0.0035;
const TRIGGER_TIME = 30; // detik sebelum close
const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 menit

let activeTimers = new Set();
let refreshTimeout;

// ===== UI =====
function log(title, data = "") {
  console.log(`\n🔹 ${title}`);
  if (data) console.log(data);
}

function errorLog(err) {
  console.log(`\n❌ ERROR: ${err.message}`);
}

// ===== API =====
async function getMarkets() {
  const res = await axios.get(
    "https://api.unhedged.gg/api/v1/markets?status=ACTIVE&limit=100"
  );
  return res.data.markets;
}

async function getBalance() {
  const res = await axios.get(
    "https://api.unhedged.gg/api/v1/balance",
    { headers: { Authorization: `Bearer ${API_KEY}` } }
  );
  return parseFloat(res.data.balance.available);
}

async function getPrice(symbol) {
  const res = await axios.get(
    `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`
  );
  return parseFloat(res.data.price);
}

async function placeBet(marketId, outcomeIndex) {
  return axios.post(
    "https://api.unhedged.gg/api/v1/bets",
    {
      marketId,
      outcomeIndex,
      amount: BET_AMOUNT
    },
    {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );
}

// ===== HELPER =====
function getSymbol(q) {
  if (q.includes("BTC")) return "BTCUSDT";
  if (q.includes("ETH")) return "ETHUSDT";
  if (q.includes("SOL")) return "SOLUSDT";
  return null;
}

function extractTarget(q) {
  const m = q.match(/\$?([\d,]+\.\d+)/);
  if (!m) return null;
  return parseFloat(m[1].replace(/,/g, ""));
}

// ===== EXECUTION =====
async function executeTrade(market) {
  try {
    log("Checking Market", market.question);

    // 🔥 safety tambahan
    if (!market.question.includes("$")) {
      log("Skip", "Tidak ada target harga");
      triggerRefresh();
      return;
    }

    const symbol = getSymbol(market.question);
    const target = extractTarget(market.question);

    if (!symbol || !target) {
      log("Skip", "Parse gagal");
      triggerRefresh();
      return;
    }

    const current = await getPrice(symbol);
    const diff = Math.abs(current - target) / target;

    console.log(`📊 Price: ${current}`);
    console.log(`🎯 Target: ${target}`);
    console.log(`📈 Diff: ${(diff * 100).toFixed(3)}%`);

    if (diff < MIN_DIFF) {
      log("Skip", "Diff kecil");
      triggerRefresh();
      return;
    }

    const outcomeIndex = current > target ? 0 : 1;

    await placeBet(market.id, outcomeIndex);

    log("✅ BET SUCCESS", market.id);

    triggerRefresh();

  } catch (err) {
    errorLog(err);
    triggerRefresh();
  }
}

// ===== SCHEDULER =====
async function scheduleMarkets() {
  try {
    log("🔄 Refresh Market");

    const markets = await getMarkets();
    const balance = await getBalance();

    log("Balance", `${balance} CC`);

    const now = Date.now();

    for (const m of markets) {
      if (activeTimers.has(m.id)) continue;

      const q = m.question.toUpperCase();

      // 🔥 FILTER 1: hanya crypto
      if (!q.includes("BTC") &&
          !q.includes("ETH") &&
          !q.includes("SOL")) continue;

      // 🔥 FILTER 2: YES/NO market
      if (!m.outcomes || m.outcomes.length !== 2) continue;

      // 🔥 FILTER 3: harus ada target (above/below)
      if (!q.includes("ABOVE") && !q.includes("BELOW")) continue;

      const end = new Date(m.endTime).getTime();
      const triggerTime = end - TRIGGER_TIME * 1000;

      const delay = triggerTime - now;

      // ❗ skip kalau sudah lewat
      if (delay <= 0) continue;

      // 🔥 FILTER 4: hanya market dekat (<= 1 jam)
      if (delay > 60 * 60 * 1000) continue;

      activeTimers.add(m.id);

      console.log(`⏳ Scheduled: ${m.question}`);
      console.log(`   ⏱ ${(delay / 1000).toFixed(1)} sec`);

      setTimeout(() => {
        activeTimers.delete(m.id);
        executeTrade(m);
      }, delay);
    }

  } catch (err) {
    errorLog(err);
  }
}

// ===== REFRESH CONTROL =====
function triggerRefresh() {
  clearTimeout(refreshTimeout);

  refreshTimeout = setTimeout(() => {
    scheduleMarkets();
  }, 2000);
}

// ===== AUTO REFRESH =====
setInterval(() => {
  log("⏰ Auto Refresh 10 menit");
  scheduleMarkets();
}, REFRESH_INTERVAL);

// ===== START =====
if (!API_KEY) {
  console.log("❌ API_KEY tidak ditemukan di .env");
  process.exit(1);
}

log("🚀 Bot Started");
scheduleMarkets();
