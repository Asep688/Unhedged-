import axios from "axios";
import fs from "fs";
import 'dotenv/config';
import { CONFIG } from "./config.js";
import {
  uiHeader,
  uiDashboard,
  uiRefresh,
  uiSchedule,
  uiTrade,
  uiBetSuccess,
  uiBetFail,
  uiSkip
} from "./ui.js";

// ===== API KEYS =====
const API_KEYS = process.env.API_KEYS
  ? process.env.API_KEYS.split(",").map(k => k.trim()).filter(Boolean)
  : [];

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

async function getCC() {
  try {
    const res = await axios.get("https://api.chainlink.com/v1/price/ccusd");
    return { price: res.data.price, change: 0 };
  } catch {
    return null;
  }
}

// ===== HELPER =====
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
    return { name: "CC" };

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

  if (!data) return;

  const { price, change } = data;

  const diff = Math.abs(price - target) / target;
  const minDiff = CONFIG.DIFF[coin.name];

  if (diff < minDiff) {
    uiSkip("Diff terlalu kecil");
    return;
  }

  let decision;

  if (q.includes(">") || q.includes("ABOVE")) {
    decision = price > target ? "YES" : "NO";
  } else if (q.includes("<") || q.includes("BELOW")) {
    decision = price < target ? "YES" : "NO";
  } else {
    decision = price > target ? "YES" : "NO";
  }

  uiTrade(
    coin.name,
    m.question,
    price,
    target,
    change,
    diff,
    decision
  );

  for (const apiKey of API_KEYS) {
    try {
      await axios.post(
        "https://api.unhedged.gg/api/v1/bets",
        {
          marketId: m.id,
          outcomeIndex: decision === "YES" ? 0 : 1,
          amount: CONFIG.BET_AMOUNT
        },
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );

      stats.totalBets++;
      stats.profit += CONFIG.BET_AMOUNT;
      saveStats();

      uiBetSuccess();
    } catch {
      uiBetFail();
    }
  }
}

// ===== SCHEDULER =====
async function scheduleMarkets() {
  uiRefresh();

  const balance = await getBalance(API_KEYS[0]);
  uiDashboard(balance, stats);

  const markets = await getMarkets();
  const now = Date.now();

  let total = 0;
  const coinCount = {};

  for (const m of markets) {
    if (total >= CONFIG.MAX_BETS) break;
    if (activeTimers.has(m.id)) continue;

    const q = m.question.toUpperCase();
    const coin = detectCoin(q);

    if (!coin) continue;
    if (!q.match(/\d{1,2}:\d{2}/)) continue;

    coinCount[coin.name] = coinCount[coin.name] || 0;
    if (coinCount[coin.name] >= CONFIG.MAX_PER_COIN) continue;

    const target = extractTarget(q);

    const end = new Date(m.endTime).getTime();
    const execTime = end - CONFIG.TRIGGER_SHORT * 1000;
    const delay = execTime - now;

    if (delay <= 0) continue;

    const sec = (delay / 1000).toFixed(1);

    uiSchedule(coin.name, m.question, target, sec);

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
uiHeader();

scheduleMarkets();
setInterval(scheduleMarkets, CONFIG.REFRESH_INTERVAL);
