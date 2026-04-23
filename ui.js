export const c = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  reset: "\x1b[0m"
};

// ===== HEADER =====
export function uiHeader() {
  console.log(`
${c.green}${c.bold}🚀 CRYPTO MULTI BOT STARTED${c.reset}
${c.dim}Short • Hourly • Daily • Multi Account${c.reset}
`);
}

// ===== DASHBOARD =====
export function uiDashboard(balance, stats) {
  const winrate =
    stats.totalBets > 0
      ? ((stats.wins / stats.totalBets) * 100).toFixed(2)
      : "0.00";

  console.log(`
${c.cyan}══════════════════════════════${c.reset}
${c.bold}📊 DASHBOARD${c.reset}
${c.cyan}══════════════════════════════${c.reset}

💰 Balance : ${c.green}${balance ?? 0} CC${c.reset}

📌 Bets    : ${stats.totalBets}
✅ Wins    : ${c.green}${stats.wins}${c.reset}
❌ Loss    : ${c.red}${stats.losses}${c.reset}
💵 Profit  : ${c.yellow}${stats.profit} CC${c.reset}
🎯 Winrate : ${winrate}%
`);
}

// ===== TYPE COLOR =====
function typeColor(type) {
  if (type === "SHORT") return c.green;
  if (type === "HOURLY") return c.yellow;
  if (type === "DAILY") return c.red;
  return c.cyan;
}

// ===== DIFF COLOR =====
function diffColor(diff) {
  const p = diff * 100;
  if (p > 0.3) return c.green;
  if (p > 0.15) return c.yellow;
  return c.red;
}

// ===== SCHEDULE =====
export function uiSchedule(name, type, question, target, seconds, price, change, diff) {
  const arrow = change >= 0 ? "📈" : "📉";
  const col = change >= 0 ? c.green : c.red;

  console.log(`
${c.cyan}══════════════════════════════${c.reset}
${c.bold}⏳ SCHEDULED ${typeColor(type)}[${type}]${c.reset}
${c.cyan}══════════════════════════════${c.reset}

${c.bold}${name}${c.reset}
${c.dim}${question}${c.reset}

💰 Price   : ${price}
🎯 Target  : ${target}
📊 Change  : ${col}${change.toFixed(2)}% ${arrow}${c.reset}
📏 Diff    : ${diffColor(diff)}${(diff * 100).toFixed(3)}%${c.reset}

⏱ Execute : ${seconds} sec
`);
}

// ===== TRADE =====
export function uiTrade(name, type, question, price, target, change, diff, decision) {
  const arrow = change >= 0 ? "📈" : "📉";
  const col = change >= 0 ? c.green : c.red;
  const decColor = decision === "YES" ? c.green : c.red;

  console.log(`
${c.magenta}══════════════════════════════════${c.reset}
${c.bold}🚀 EXECUTION ${typeColor(type)}[${type}]${c.reset}
${c.magenta}══════════════════════════════════${c.reset}

${c.bold}${name}${c.reset}
${question}

💰 Price   : ${price}
🎯 Target  : ${target}
📊 Change  : ${col}${change.toFixed(2)}% ${arrow}${c.reset}
📏 Diff    : ${(diff * 100).toFixed(3)}%

➡️ Decision: ${decColor}${decision}${c.reset}
`);
}

// ===== BET =====
export function uiBetSuccess(id) {
  console.log(`${c.green}✅ BET SUCCESS (${id})${c.reset}`);
}

export function uiBetFail(id) {
  console.log(`${c.red}❌ BET FAILED (${id})${c.reset}`);
}

// ===== SKIP =====
export function uiSkip(msg) {
  console.log(`${c.yellow}⚠️ ${msg}${c.reset}`);
}
