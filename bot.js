import axios from "axios";
import fs from "fs";
import 'dotenv/config';
import { CONFIG } from "./config.js";

// ===== API KEYS =====
const API_KEYS = process.env.API_KEYS
  ? process.env.API_KEYS.split(",").map(k => k.trim()).filter(Boolean)
  : [];

// ===== COLOR =====
const c = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  bold: "\x1b[1m",
  reset: "\x1b[0m"
};

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

// ===== PRICE =====
async function getBinance(symbol) {
  try {
    const res = await axios.get(
      `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`
    );
    return {
      price: parseFloat(res.data.lastPrice),
      change: parseFloat(res.data.priceChangePercent)
    };
  } catch {
    return null;
  }
}

// CC via Chainlink (fallback aman)
async function getCC() {
  try {
    const res = await axios.get("https://api.chainlink.com/v1/price/ccusd");
    return { price: res.data.price, change: 0 };
  } catch {
    return { price: null, change: 0 };
  }
}

// ===== DETECT =====
function detectCoin(q) {
  q = q.toLowerCase();

  if (q.includes("btc") || q.includes("bitcoin"))
    return { name: "BTC", symbol: "BTCUSDT" };

  if (q.includes("eth") || q.includes("ethereum"))
    return { name: "ETH", symbol: "ETHUSDT" };

  if (q.includes("sol") || q.includes("solana"))
    return { name: "SOL", symbol: "SOLUSDT" };

  if (q.includes("bnb"))
    return { name: "BNB", symbol: "BNBUSDT" };

  if (q.includes("cc") || q.includes("canton"))
    return { name: "CC", symbol: "CC" };

  return null;
}

function extractTarget(q) {
  const m = q.match(/([\d.,]+)/);
  if (!m) return null;

  let num = m[1];

  if (num.includes(",") && !num.includes(".")) {
    num = num.replace(",", ".");
  } else {
    num = num.replace(/,/g, "");
  }

  return parseFloat(num);
}

// ===== EXECUTE =====
async function executeTrade(m) {
  const q = m.question.toUpperCase();

  const coin = detectCoin(q);
  if (!coin) return;

  const target = extractTarget(q);
  if (!target) return;

  let data =
    coin.name === "CC"
      ? await getCC()
      : await getBinance(coin.symbol);

  if (!data || !data.price) return;

  const { price, change } = data;

  const diff = Math.abs(price - target) / target;
  const minDiff = CONFIG.DIFF[coin.name];

  if (diff < minDiff) {
    console.log(`${c.red}❌ Skip ${coin.name} (diff kecil)${c.reset}`);
    return;
  }

  let outcomeIndex;

  if (q.includes(">") || q.includes("ABOVE") || q.includes("OVER")) {
    outcomeIndex = price > target ? 0 : 1;
  } else if (q.includes("<") || q.includes("BELOW") || q.includes("UNDER")) {
    outcomeIndex = price < target ? 0 : 1;
  } else {
    outcomeIndex = price > target ? 0 : 1;
  }

  const arrow = change >= 0 ? "📈" : "📉";
  const col = change >= 0 ? c.green : c.red;

  console.log(`
${c.cyan}══════════════════════════════════${c.reset}
${c.bold}${c.magenta}🚀 ${coin.name} TRADE${c.reset}
${c.cyan}══════════════════════════════════${c.reset}

${m.question}

${c.yellow}💰 Price   :${c.reset} ${price}
${c.yellow}🎯 Target  :${c.reset} ${target}
${c.yellow}📊 Change  :${c.reset} ${col}${change.toFixed(2)}% ${arrow}${c.reset}
${c.yellow}📏 Diff    :${c.reset} ${(diff * 100).toFixed(3)}%

${c.green}➡️ Decision:${c.reset} ${outcomeIndex === 0 ? "YES" : "NO"}

${c.cyan}══════════════════════════════════${c.reset}
`);

  for (const apiKey of API_KEYS) {
    try {
      await axios.post(
        "https://api.unhedged.gg/api/v1/bets",
        { marketId: m.id, outcomeIndex, amount: CONFIG.BET_AMOUNT },
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );

      stats.totalBets++;
      stats.profit += CONFIG.BET_AMOUNT;
      saveStats();

      console.log(`${c.green}✅ BET SUCCESS${c.reset}`);
    } catch {
      console.log(`${c.red}❌ BET FAILED${c.reset}`);
    }
  }
}

// ===== SCHEDULER =====
async function scheduleMarkets() {
  console.log(`\n${c.cyan}🔄 REFRESH MARKET${c.reset}`);

  const markets = await getMarkets();
  const now = Date.now();

  let total = 0;
  const coinCount = {};

  for (const m of markets) {
    if (total >= CONFIG.MAX_BETS) break;
    if (activeTimers.has(m.id)) continue;

    const q = m.question.toUpperCase();
    const coin = detectCoin(q);

    if (!coin) continue; // crypto only
    if (!q.match(/\d{1,2}:\d{2}/)) continue; // short only

    coinCount[coin.name] = coinCount[coin.name] || 0;
    if (coinCount[coin.name] >= CONFIG.MAX_PER_COIN) continue;

    const end = new Date(m.endTime).getTime();
    const execTime = end - CONFIG.TRIGGER_SHORT * 1000;
    const delay = execTime - now;

    if (delay <= 0) continue;

    console.log(`${c.green}⏳ ${coin.name}${c.reset} → ${m.question}`);

    const t = setTimeout(() => {
      activeTimers.delete(m.id);
      executeTrade(m);
    }, delay);

    activeTimers.set(m.id, t);

    coinCount[coin.name]++;
    total++;
  }
}

// ===== START =====
loadStats();

console.log(`${c.green}🚀 CRYPTO ALL-PAIR BOT STARTED${c.reset}`);

scheduleMarkets();
setInterval(scheduleMarkets, CONFIG.REFRESH_INTERVAL);
