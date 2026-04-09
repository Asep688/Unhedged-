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

// ===== CC PRICE =====
async function getCCPriceFromMarket(marketId) {
  try {
    const res = await axios.get(
      `https://api.unhedged.gg/api/v1/ctm/rounds/${marketId}/price-history`
    );

    const prices = res.data.prices;
    if (!prices || prices.length === 0) return null;

    return prices[prices.length - 1].price;
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

// ===== COIN DETECTION =====
function extractCoin(q) {
  q = q.toLowerCase();

  if (q.includes("btc") || q.includes("bitcoin"))
    return { type: "binance", symbol: "BTCUSDT", priority: 0 };

  if (q.includes("eth") || q.includes("ethereum"))
    return { type: "binance", symbol: "ETHUSDT", priority: 1 };

  if (q.includes("sol") || q.includes("solana"))
    return { type: "binance", symbol: "SOLUSDT", priority: 2 };

  if (q.includes("cc") || q.includes("canton"))
    return { type: "cc", symbol: "CC", priority: 99 };

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

    const coin = extractCoin(market.question);
    const target = extractTarget(market.question);

    if (!coin || !target) return;

    let current = null;

    if (coin.type === "binance") {
      current = await getPrice(coin.symbol);
    }

    if (coin.type === "cc") {
      current = await getCCPriceFromMarket(market.id);
    }

    if (!current) return;

    const diff = Math.abs(current - target) / target;

    console.log(`${color.yellow}${coin.symbol}${color.reset}`);
    console.log(`Price : ${current}`);
    console.log(`Target: ${target}`);
    console.log(`Diff  : ${(diff * 100).toFixed(3)}%`);

    if (diff < CONFIG.MIN_DIFF) return;

    const outcomeIndex = current > target ? 0 : 1;

    await placeBet(market.id, outcomeIndex);

    stats.totalBets++;
    saveStats();

    console.log(`${color.green}✅ BET SUCCESS${color.reset}`);

  } catch (err) {
    errorLog(err);
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

    // ===== SORT PRIORITY =====
    markets.sort((a, b) => {
      const ca = extractCoin(a.question);
      const cb = extractCoin(b.question);

      return (ca?.priority ?? 99) - (cb?.priority ?? 99);
    });

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
      const coin = extractCoin(m.question);

      if (!coin || shown.has(coin.symbol)) continue;

      if (coin.type === "binance") {
        const data = await getPriceWithChange(coin.symbol);

        if (data) {
          const arrow = data.change >= 0 ? "📈" : "📉";
          const c = data.change >= 0 ? color.green : color.red;

          console.log(
            `${c}${arrow} ${coin.symbol} → $${data.price} (${data.change.toFixed(2)}%)${color.reset}`
          );
        }
      }

      if (coin.type === "cc") {
        const price = await getCCPriceFromMarket(m.id);

        if (price) {
          console.log(`🟡 CC → $${price}`);
        } else {
          console.log(`⚠️ CC → harga tidak tersedia`);
        }
      }

      shown.add(coin.symbol);
    }

    const now = Date.now();

    let betCount = 0;
    const usedCoins = new Set();

    // ===== SCHEDULING =====
    for (const m of markets) {
      if (activeTimers.has(m.id)) continue;

      const coin = extractCoin(m.question);
      if (!coin) continue;

      const q = m.question.toUpperCase();

      const valid =
        q.includes("ABOVE") ||
        q.includes("BELOW") ||
        q.includes("HIT") ||
        q.includes("REACH") ||
        q.includes("TARGET");

      if (!valid) continue;

      // 🔥 FIX: CC tidak dihitung limit
      if (coin.type !== "cc" && usedCoins.size >= CONFIG.MAX_COINS) continue;
      if (coin.type !== "cc" && usedCoins.has(coin.symbol)) continue;

      const end = new Date(m.endTime).getTime();
      const triggerTime = end - CONFIG.TRIGGER_TIME * 1000;
      const delay = triggerTime - now;

      if (delay <= 0) continue;
      if (delay > CONFIG.MAX_DELAY * 1000) continue;

      if (coin.type !== "cc") {
        usedCoins.add(coin.symbol);
      }

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

// ===== AUTO REFRESH =====
setInterval(() => {
  log("⏰ Auto Refresh");
  scheduleMarkets();
}, CONFIG.REFRESH_INTERVAL);

// ===== START =====
if (!API_KEY) {
  console.log("❌ API_KEY tidak ditemukan");
  process.exit(1);
}

loadStats();
log("🚀 Bot Started");
scheduleMarkets();
