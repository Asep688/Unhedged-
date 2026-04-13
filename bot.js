import axios from "axios";
import fs from "fs";
import 'dotenv/config';
import { CONFIG } from "./config.js";

// ===== API KEYS =====
const API_KEYS = process.env.API_KEYS
  ? process.env.API_KEYS.split(",").map(k => k.trim()).filter(Boolean)
  : [];

if (API_KEYS.length === 0) {
  console.log("❌ API_KEYS tidak ditemukan");
  process.exit(1);
}

// ===== COLOR =====
const color = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  reset: "\x1b[0m"
};

// ===== GLOBAL =====
const activeTimers = new Map();

// ===== STATS =====
let stats = { totalBets: 0, wins: 0, losses: 0, profit: 0 };

function loadStats() {
  try {
    stats = JSON.parse(fs.readFileSync("stats.json"));
  } catch {
    saveStats();
  }
}

function saveStats() {
  fs.writeFileSync("stats.json", JSON.stringify(stats, null, 2));
}

// ===== API =====
async function getMarkets() {
  const res = await axios.get(
    "https://api.unhedged.gg/api/v1/markets?status=ACTIVE&limit=100"
  );
  return res.data.markets;
}

async function getBalance(apiKey) {
  try {
    const res = await axios.get(
      "https://api.unhedged.gg/api/v1/balance",
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    return parseFloat(res.data.balance.available);
  } catch {
    return null;
  }
}

async function getPrice(symbol) {
  try {
    const res = await axios.get(
      `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`
    );
    return parseFloat(res.data.price);
  } catch {
    return null;
  }
}

async function getCCPrice(id) {
  try {
    const res = await axios.get(
      `https://api.unhedged.gg/api/v1/ctm/rounds/${id}/price-history`
    );
    const prices = res.data.prices;
    return prices?.length ? prices[prices.length - 1].price : null;
  } catch {
    return null;
  }
}

async function placeBet(apiKey, marketId, outcomeIndex) {
  return axios.post(
    "https://api.unhedged.gg/api/v1/bets",
    { marketId, outcomeIndex, amount: CONFIG.BET_AMOUNT },
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );
}

// ===== HELPER =====
function getMarketType(q) {
  q = q.toUpperCase();
  if (q.includes("AT") && q.match(/\d{1,2}:\d{2}/)) return "short";
  if (q.includes("TANGGAL") || q.includes("PUKUL")) return "long";
  return "short";
}

function extractCoin(q) {
  q = q.toLowerCase();

  if (q.includes("btc") || q.includes("bitcoin"))
    return { type: "binance", symbol: "BTCUSDT" };

  if (q.includes("eth") || q.includes("ethereum"))
    return { type: "binance", symbol: "ETHUSDT" };

  if (q.includes("sol") || q.includes("solana"))
    return { type: "binance", symbol: "SOLUSDT" };

  if (q.includes("bnb"))
    return { type: "binance", symbol: "BNBUSDT" };

  if (q.includes("cc") || q.includes("canton"))
    return { type: "cc", symbol: "CC" };

  return null;
}

function extractTarget(q) {
  const m = q.match(/\$?([\d,]+(\.\d+)?)/);
  return m ? parseFloat(m[1].replace(/,/g, "")) : null;
}

// ===== EXECUTE =====
async function executeTrade(m) {
  console.log("\n🔹 Checking Market");
  console.log(m.question);

  const q = m.question.toUpperCase();
  const coin = extractCoin(q);
  const target = extractTarget(q);
  const type = getMarketType(q);

  if (!coin || !target) return;

  let current =
    coin.type === "binance"
      ? await getPrice(coin.symbol)
      : await getCCPrice(m.id);

  if (!current) return;

  const diff = Math.abs(current - target) / target;

  const minDiff =
    type === "long"
      ? CONFIG.MIN_DIFF_LONG
      : CONFIG.MIN_DIFF_SHORT;

  const diffPercent = diff * 100;
  const minPercent = minDiff * 100;

  console.log(`${coin.symbol}`);
  console.log(`Price : ${current}`);
  console.log(`Target: ${target}`);
  console.log(
    `Diff  : ${diffPercent.toFixed(3)}% | Min: ${minPercent.toFixed(3)}%`
  );

  if (diff < minDiff) {
    console.log(`${color.red}❌ Skip (diff kecil)${color.reset}`);
    return;
  }

  const outcomeIndex = current > target ? 0 : 1;

  for (const apiKey of API_KEYS) {
    try {
      const balance = await getBalance(apiKey);

      if (!balance || balance < CONFIG.BET_AMOUNT) {
        console.log(`${color.yellow}⚠️ Skip akun${color.reset}`);
        continue;
      }

      await placeBet(apiKey, m.id, outcomeIndex);

      stats.totalBets++;
      saveStats();

      console.log(`${color.green}✅ BET SUCCESS${color.reset}`);

      await new Promise(r => setTimeout(r, 300));

    } catch {
      console.log(`${color.red}❌ Error akun${color.reset}`);
    }
  }
}

// ===== SCHEDULER =====
async function scheduleMarkets() {
  console.log("\n🔄 Refresh Market");

  const markets = await getMarkets();
  const now = Date.now();

  for (const m of markets) {
    if (activeTimers.has(m.id)) continue;

    const q = m.question.toUpperCase();

    if (
      !q.includes("ABOVE") &&
      !q.includes("MELAMPAUI") &&
      !q.includes("EXCEED")
    ) continue;

    const end = new Date(m.endTime).getTime();
    const delay = end - now;

    const type = getMarketType(q);

    if (type === "short" && delay > CONFIG.MAX_DELAY * 1000) continue;
    if (type === "long" && delay > 4 * 60 * 60 * 1000) continue;

    const trigger =
      type === "long"
        ? CONFIG.TRIGGER_LONG
        : CONFIG.TRIGGER_SHORT;

    const execTime = end - trigger * 1000;
    const realDelay = execTime - now;

    if (realDelay <= 0) continue;

    console.log(`⏳ [${type.toUpperCase()}] ${m.question}`);
    console.log(`   ⏱ ${(realDelay / 1000).toFixed(1)} sec`);

    const t = setTimeout(() => {
      activeTimers.delete(m.id);
      executeTrade(m);
    }, realDelay);

    activeTimers.set(m.id, t);
  }
}

// ===== START =====
loadStats();

console.log("🚀 Bot Started (FINAL)");

scheduleMarkets();

setInterval(scheduleMarkets, CONFIG.REFRESH_INTERVAL);
