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
const c = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
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

function printStats() {
  const winrate =
    stats.totalBets > 0
      ? ((stats.wins / stats.totalBets) * 100).toFixed(2)
      : 0;

  console.log(`
${c.cyan}📊 ===== STATS =====${c.reset}
Total Bets : ${stats.totalBets}
Wins       : ${stats.wins}
Losses     : ${stats.losses}
Profit     : ${stats.profit} CC
Winrate    : ${winrate}%
`);
}

// ===== API =====
async function getMarkets() {
  const res = await axios.get(
    "https://api.unhedged.gg/api/v1/markets?status=ACTIVE&limit=100"
  );
  return res.data.markets;
}

async function getPrice(symbol) {
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

async function placeBet(apiKey, marketId, outcomeIndex) {
  return axios.post(
    "https://api.unhedged.gg/api/v1/bets",
    { marketId, outcomeIndex, amount: CONFIG.BET_AMOUNT },
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );
}

// ===== HELPER =====
function extractCoin(q) {
  q = q.toLowerCase();

  if (q.includes("btc") || q.includes("bitcoin")) return "BTCUSDT";
  if (q.includes("eth") || q.includes("ethereum")) return "ETHUSDT";
  if (q.includes("sol") || q.includes("solana")) return "SOLUSDT";

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

  const symbol = extractCoin(q);
  const target = extractTarget(q);

  if (!symbol || target === null) {
    console.log(`${c.yellow}⚠️ Skip invalid market${c.reset}`);
    return;
  }

  const data = await getPrice(symbol);
  if (!data) return;

  const { price, change } = data;
  const diff = Math.abs(price - target) / target * 100;

  const isUp =
    q.includes("ABOVE") ||
    q.includes("OVER") ||
    q.includes(">");

  const isDown =
    q.includes("BELOW") ||
    q.includes("UNDER") ||
    q.includes("<");

  let outcomeIndex;

  if (isUp) outcomeIndex = price > target ? 0 : 1;
  else if (isDown) outcomeIndex = price < target ? 0 : 1;
  else outcomeIndex = price > target ? 0 : 1;

  const arrow = change >= 0 ? "📈" : "📉";
  const colorChange = change >= 0 ? c.green : c.red;

  console.log(`
${c.magenta}🔎 MARKET${c.reset}
${m.question}

${c.cyan}💰 ${symbol}${c.reset}
Price   : ${price}
Target  : ${target}
Change  : ${colorChange}${change.toFixed(2)}% ${arrow}${c.reset}
Diff    : ${diff.toFixed(3)}%

${c.yellow}🎯 Decision:${c.reset} ${outcomeIndex === 0 ? "YES" : "NO"}
`);

  if (diff < CONFIG.MIN_DIFF_SHORT * 100) {
    console.log(`${c.red}❌ Skip (diff kecil)${c.reset}`);
    return;
  }

  for (const apiKey of API_KEYS) {
    try {
      await placeBet(apiKey, m.id, outcomeIndex);

      stats.totalBets++;
      stats.profit += CONFIG.BET_AMOUNT;
      saveStats();

      console.log(`${c.green}✅ BET SUCCESS${c.reset}`);
    } catch {
      console.log(`${c.red}❌ BET FAILED${c.reset}`);
    }
  }
}

// ===== SCHEDULER (SHORT ONLY) =====
async function scheduleMarkets() {
  console.log(`\n${c.cyan}🔄 REFRESH MARKET${c.reset}`);

  printStats();

  const markets = await getMarkets();
  const now = Date.now();

  for (const m of markets) {
    if (activeTimers.has(m.id)) continue;

    const q = m.question.toUpperCase();

    // hanya short (ada jam)
    if (!q.match(/\d{1,2}:\d{2}/)) continue;

    const end = new Date(m.endTime).getTime();
    const execTime = end - CONFIG.TRIGGER_SHORT * 1000;
    const delay = execTime - now;

    if (delay <= 0) continue;

    console.log(`${c.cyan}⏳ Scheduled:${c.reset} ${m.question}`);

    const t = setTimeout(() => {
      activeTimers.delete(m.id);
      executeTrade(m);
    }, delay);

    activeTimers.set(m.id, t);
  }
}

// ===== START =====
loadStats();

console.log(`${c.green}🚀 BOT SHORT MODE STARTED${c.reset}`);

scheduleMarkets();
setInterval(scheduleMarkets, CONFIG.REFRESH_INTERVAL);
