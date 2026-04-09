import axios from "axios";

const API_KEY = "ak_RJKxDN4GUMjX3cXueMWLDkbdCRSJB0fE5ZH7FjHWumrj1Bl6";

const BET_AMOUNT = 5;
const MIN_DIFF = 0.0035;
const TRIGGER_TIME = 30; // detik
const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 menit

let activeTimers = new Set();

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

      const end = new Date(m.endTime).getTime();
      const triggerTime = end - TRIGGER_TIME * 1000;

      const delay = triggerTime - now;

      if (delay <= 0) continue;

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
let refreshTimeout;

function triggerRefresh() {
  clearTimeout(refreshTimeout);

  refreshTimeout = setTimeout(() => {
    scheduleMarkets();
  }, 2000); // refresh cepat setelah event
}

// ===== AUTO REFRESH (10 MENIT) =====
setInterval(() => {
  log("⏰ Auto Refresh 10 menit");
  scheduleMarkets();
}, REFRESH_INTERVAL);

// ===== START =====
scheduleMarkets();
