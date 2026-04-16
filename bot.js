import axios from "axios";
import fs from "fs";
import 'dotenv/config';
import { CONFIG } from "./config.js";
import {
  uiHeader,
  uiDashboard,
  uiSchedule,
  uiTrade,
  uiBetSuccess,
  uiBetFail,
  uiSkip
} from "./ui.js";

const API_KEYS = process.env.API_KEYS
  ? process.env.API_KEYS.split(",").map(k => k.trim()).filter(Boolean)
  : [];

const activeTimers = new Map();

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

// ===== HELPERS =====
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
  const m = q.match(/\$?([\d,]+(\.\d+)?)/);
  if (!m) return null;
  return parseFloat(m[1].replace(/,/g, ""));
}

function getMarketType(q) {
  q = q.toUpperCase();

  if (
    q.includes("WILL") ||
    q.includes("ON ") ||
    q.includes("DATE") ||
    q.includes("2026")
  ) return "long";

  return "short";
}

// ===== EXECUTE =====
async function executeTrade(m) {
  const q = m.question.toUpperCase();

  const coin = detectCoin(q);
  if (!coin) return;

  const target = extractTarget(q);
  if (!target) return;

  const type = getMarketType(q);

  let data =
    coin.name === "CC"
      ? await getCC()
      : await getBinance(coin.symbol);

  if (!data) return;

  const { price, change } = data;

  const diff = Math.abs(price - target) / target;
  const minDiff = CONFIG.DIFF[coin.name];

  const diffPercent = diff * 100;

  if (diffPercent < 0.1) {
    uiSkip("Noise (terlalu dekat)");
    return;
  }

  if (diff < minDiff) {
    uiSkip("Diff terlalu kecil");
    return;
  }

  let decision =
    q.includes("<") || q.includes("BELOW")
      ? (price < target ? "YES" : "NO")
      : (price > target ? "YES" : "NO");

  uiTrade(
    `${coin.name} (${type.toUpperCase()})`,
    m.question,
    price,
    target,
    change,
    diff,
    decision
  );

  for (const apiKey of API_KEYS) {
    try {
      const balance = await getBalance(apiKey);
      if (!balance || balance < CONFIG.BET_AMOUNT) {
        uiSkip("Saldo tidak cukup");
        continue;
      }

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

    const target = extractTarget(q);
    if (!target) continue;

    if (!q.match(/\d{1,2}[:.]\d{2}/)) continue;

    const type = getMarketType(q);

    if (type === "short" && !CONFIG.ENABLE_SHORT) continue;
    if (type === "long" && !CONFIG.ENABLE_LONG) continue;

    const end = new Date(m.endTime).getTime();

    const trigger =
      type === "long"
        ? CONFIG.TRIGGER_LONG
        : CONFIG.TRIGGER_SHORT;

    const execTime = end - trigger * 1000;
    const delay = execTime - now;

    if (delay <= 0) continue;

    let data =
      coin.name === "CC"
        ? await getCC()
        : await getBinance(coin.symbol);

    if (!data) continue;

    const { price, change } = data;
    const diff = Math.abs(price - target) / target;

    const sec = (delay / 1000).toFixed(1);

    coinCount[coin.name] = coinCount[coin.name] || 0;
    if (coinCount[coin.name] >= CONFIG.MAX_PER_COIN) continue;

    uiSchedule(
      `${coin.name} (${type.toUpperCase()})`,
      m.question,
      target,
      sec,
      price,
      change,
      diff
    );

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
