import axios from "axios";
import fs from "fs";
import 'dotenv/config';
import { CONFIG } from "./config.js";

const API_KEY = process.env.API_KEY;

// ===== COLOR =====
const color = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  reset: "\x1b[0m"
};

// ===== GLOBAL =====
let activeTimers = new Set();
let refreshTimeout;

// ===== STATS =====
let stats = {
  totalBets: 0,
  wins: 0,
  losses: 0,
  profit: 0
};

// ===== LOAD / SAVE =====
function loadStats() {
  try {
    const data = fs.readFileSync("stats.json");
    stats = JSON.parse(data);
  } catch {
    console.log("📁 stats.json tidak ditemukan, membuat baru...");
    saveStats();
  }
}

function saveStats() {
  fs.writeFileSync("stats.json", JSON.stringify(stats, null, 2));
}

// ===== UI =====
function log(title, data = "") {
  console.log(`\n${color.cyan}🔹 ${title}${color.reset}`);
  if (data) console.log(data);
}

function errorLog(err) {
  console.log(`${color.red}❌ ERROR: ${err.message}${color.reset}`);
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
  try {
    const res = await axios.get(
      `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`
    );
    return parseFloat(res.data.price);
  } catch {
    return null;
  }
}

async function getPriceWithChange(symbol) {
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

async function placeBet(marketId, outcomeIndex) {
  return axios.post(
    "https://api.unhedged.gg/api/v1/bets",
    {
      marketId,
      outcomeIndex,
      amount: CONFIG.BET_AMOUNT
    },
    {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );
}

// ===== UPDATE STATS =====
async function updateStats() {
  try {
    const res = await axios.get(
      "https://api.unhedged.gg/api/v1/bets",
      { headers: { Authorization: `Bearer ${API_KEY}` } }
    );

    let wins = 0;
    let losses = 0;
    let profit = 0;

    for (const b of res.data.bets) {
      const amount = parseFloat(b.amount);

      if (b.status === "WON") {
        wins++;
        profit += amount;
      }

      if (b.status === "LOST") {
        losses++;
        profit -= amount;
      }
    }

    stats.wins = wins;
    stats.losses = losses;
    stats.profit = profit;

    saveStats();

  } catch (err) {
    errorLog(err);
  }
}

// ===== COIN DETECTION (SUPER FLEX) =====
function extractCoinSymbol(q) {
  q = q.toLowerCase();

  const map = [
    { keys: ["btc", "bitcoin"], symbol: "BTCUSDT" },
    { keys: ["eth", "ethereum"], symbol: "ETHUSDT" },
    { keys: ["sol", "solana"], symbol: "SOLUSDT" },
    { keys: ["cc", "canton"], symbol: null }
  ];

  for (const coin of map) {
    for (const k of coin.keys) {
      if (q.includes(k)) return coin.symbol;
    }
  }

  return null;
}

// ===== HELPER =====
function extractTarget(q) {
  const m = q.match(/\$?([\d,]+\.\d+)/);
  if (!m) return null;
  return parseFloat(m[1].replace(/,/g, ""));
}

// ===== EXECUTION =====
async function executeTrade(market) {
  try {
    log("Checking Market", market.question);

    const symbol = extractCoinSymbol(market.question);
    const target = extractTarget(market.question);

    if (!target) {
      log("Skip", "Target tidak ditemukan");
      triggerRefresh();
      return;
    }

    if (!symbol) {
      log("Skip", "Coin tidak support Binance");
      triggerRefresh();
      return;
    }

    const current = await getPrice(symbol);
    if (!current) {
      log("Skip", "Harga tidak ditemukan");
      triggerRefresh();
      return;
    }

    const diff = Math.abs(current - target) / target;

    console.log(`${color.yellow}${symbol}${color.reset}`);
    console.log(`Price : ${current}`);
    console.log(`Target: ${target}`);
    console.log(`Diff  : ${(diff * 100).toFixed(3)}%`);

    if (diff < CONFIG.MIN_DIFF) {
      log("Skip", "Diff kecil");
      triggerRefresh();
      return;
    }

    const outcomeIndex = current > target ? 0 : 1;

    await placeBet(market.id, outcomeIndex);

    stats.totalBets++;
    saveStats();

    console.log(`${color.green}✅ BET SUCCESS${color.reset}`);

    triggerRefresh();

  } catch (err) {
    errorLog(err);
    triggerRefresh();
  }
}

// ===== MAIN =====
async function scheduleMarkets() {
  try {
    log("🔄 Refresh Market");

    await updateStats();

    const markets = await getMarkets();
    const balance = await getBalance();

    console.log(`${color.yellow}Balance: ${balance} CC${color.reset}`);

    // ===== STATS =====
    const total = stats.wins + stats.losses;

    const winrate = total > 0
      ? ((stats.wins / total) * 100).toFixed(2)
      : 0;

    const profitColor = stats.profit >= 0 ? color.green : color.red;

    console.log("\n📊 ===== STATS =====");
    console.log(`Total Bets : ${stats.totalBets}`);
    console.log(`Wins       : ${stats.wins}`);
    console.log(`Losses     : ${stats.losses}`);
    console.log(`${profitColor}Profit     : ${stats.profit} CC${color.reset}`);
    console.log(`Winrate    : ${winrate}%`);

    // ===== PRICE DISPLAY =====
    const shown = new Set();

    for (const m of markets) {
      const symbol = extractCoinSymbol(m.question);

      if (shown.has(m.question)) continue;

      if (symbol) {
        const data = await getPriceWithChange(symbol);

        if (data) {
          const arrow = data.change >= 0 ? "📈" : "📉";
          const c = data.change >= 0 ? color.green : color.red;

          console.log(
            `${c}${arrow} ${symbol} → $${data.price} (${data.change.toFixed(2)}%)${color.reset}`
          );
        } else {
          console.log(`⚠️ ${symbol} tidak tersedia di Binance`);
        }

      } else if (m.question.toLowerCase().includes("canton")) {
        console.log(`⚠️ CANTON COIN → tidak tersedia di Binance`);
      }

      shown.add(m.question);
    }

    const now = Date.now();

    let betCount = 0;
    const usedCoins = new Set();

    // ===== SCHEDULING =====
    for (const m of markets) {
      if (activeTimers.has(m.id)) continue;

      const q = m.question.toUpperCase();

      if (!m.outcomes || m.outcomes.length !== 2) continue;
      if (!q.includes("ABOVE") && !q.includes("BELOW")) continue;

      const symbol = extractCoinSymbol(m.question);
      if (!symbol) continue;

      if (betCount >= CONFIG.MAX_BETS) continue;
      if (usedCoins.has(symbol)) continue;
      if (usedCoins.size >= CONFIG.MAX_COINS) continue;

      const end = new Date(m.endTime).getTime();
      const triggerTime = end - CONFIG.TRIGGER_TIME * 1000;
      const delay = triggerTime - now;

      if (delay <= 0) continue;
      if (delay > CONFIG.MAX_DELAY * 1000) continue;

      usedCoins.add(symbol);
      betCount++;

      console.log(`${color.cyan}⏳ Scheduled:${color.reset} ${m.question}`);
      console.log(`   ⏱ ${(delay / 1000).toFixed(1)} sec`);

      activeTimers.add(m.id);

      setTimeout(() => {
        activeTimers.delete(m.id);
        executeTrade(m);
      }, delay);
    }

  } catch (err) {
    errorLog(err);
  }
}

// ===== REFRESH =====
function triggerRefresh() {
  clearTimeout(refreshTimeout);
  refreshTimeout = setTimeout(scheduleMarkets, 2000);
}

// ===== AUTO REFRESH =====
setInterval(() => {
  log("⏰ Auto Refresh 10 menit");
  scheduleMarkets();
}, 10 * 60 * 1000);

// ===== START =====
if (!API_KEY) {
  console.log("❌ API_KEY tidak ditemukan");
  process.exit(1);
}

loadStats();
log("🚀 Bot Started");
scheduleMarkets();
