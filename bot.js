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
    fs.writeFileSync("stats.json", JSON.stringify(stats));
  }
}

// ===== API =====
async function getMarkets() {
  const res = await axios.get("https://api.unhedged.gg/api/v1/markets?status=ACTIVE&limit=100");
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

  if (q.includes("btc")) return { name: "BTC", symbol: "BTCUSDT" };
  if (q.includes("eth")) return { name: "ETH", symbol: "ETHUSDT" };
  if (q.includes("sol")) return { name: "SOL", symbol: "SOLUSDT" };
  if (q.includes("bnb")) return { name: "BNB", symbol: "BNBUSDT" };
  if (q.includes("cc") || q.includes("canton")) return { name: "CC" };

  return null;
}

function extractTarget(q) {
  const m = q.match(/\$?([\d,]+(\.\d+)?)/);
  return m ? parseFloat(m[1].replace(/,/g, "")) : null;
}

function getMarketType(q) {
  q = q.toUpperCase();

  if (q.includes("CURRENT HOUR")) return "HOURLY";

  if (
    q.includes("DAILY") ||
    q.includes("DAY CLOSE")
  ) return "DAILY";

  if (/\d{1,2}[:.]\d{2}/.test(q)) return "SHORT";

  return null;
}

function getNextHourClose() {
  const now = new Date();
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return next.getTime();
}

// ===== EXECUTE =====
async function executeTrade(m, type) {
  const q = m.question.toUpperCase();

  const coin = detectCoin(q);
  const target = extractTarget(q);
  if (!coin || !target) return;

  const data = coin.name === "CC"
    ? await getCC()
    : await getBinance(coin.symbol);

  if (!data) return;

  const { price, change } = data;

  const diff = Math.abs(price - target) / target;
  const minDiff = CONFIG.DIFF[type][coin.name];

  if (diff < minDiff) return;

  const decision =
    q.includes("BELOW") || q.includes("<")
      ? (price < target ? "YES" : "NO")
      : (price > target ? "YES" : "NO");

  uiTrade(`${coin.name} (${type})`, m.question, price, target, change, diff, decision);

  for (const apiKey of API_KEYS) {
    try {
      const balance = await getBalance(apiKey);

      if (!balance || balance < CONFIG.BET_AMOUNT) {
        uiSkip(`Saldo (${apiKey.slice(0,5)})`);
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

      uiBetSuccess(apiKey.slice(0,5));

      await new Promise(r => setTimeout(r, 300));

    } catch {
      uiBetFail(apiKey.slice(0,5));
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

    const type = getMarketType(q);
    if (!type) continue;

    if (!CONFIG.ENABLE[type]) continue;

    const coin = detectCoin(q);
    const target = extractTarget(q);
    if (!coin || !target) continue;

    coinCount[coin.name] = coinCount[coin.name] || 0;
    if (coinCount[coin.name] >= CONFIG.MAX_PER_COIN) continue;

    let end;

    if (type === "HOURLY") {
      end = getNextHourClose();
    } else if (type === "DAILY") {
      const d = new Date();
      d.setUTCHours(0,0,0,0);
      d.setUTCDate(d.getUTCDate() + 1);
      end = d.getTime();
    } else {
      end = new Date(m.endTime).getTime();
    }

    const trigger = CONFIG.TRIGGER[type];
    const delay = end - trigger * 1000 - now;

    if (delay <= 0) continue;

    const data = coin.name === "CC"
      ? await getCC()
      : await getBinance(coin.symbol);

    if (!data) continue;

    const { price, change } = data;
    const diff = Math.abs(price - target) / target;

    uiSchedule(
      `${coin.name} (${type})`,
      m.question,
      target,
      (delay / 1000).toFixed(1),
      price,
      change,
      diff
    );

    const t = setTimeout(() => {
      activeTimers.delete(m.id);
      executeTrade(m, type);
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
