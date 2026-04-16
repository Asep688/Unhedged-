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
${c.green}${c.bold}🚀 CRYPTO SNIPER BOT STARTED${c.reset}
${c.dim}Multi Account • Real-time • Diff Filter${c.reset}
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

// ===== SCHEDULE =====
export function uiSchedule(name, question, target, seconds, price, change, diff) {
  const arrow = change >= 0 ? "📈" : "📉";
  const col = change >= 0 ? c.green : c.red;

  const diffPercent = (diff * 100).toFixed(3);

  const diffColor =
    diffPercent > 0.3 ? c.green :
    diffPercent > 0.15 ? c.yellow :
    c.red;

  console.log(`
${c.cyan}══════════════════════════════${c.reset}
${c.bold}⏳ SCHEDULED${c.reset}
${c.cyan}══════════════════════════════${c.reset}

${c.green}${c.bold}${name}${c.reset}
${c.dim}${question}${c.reset}

💰 Price   : ${price}
🎯 Target  : ${target}
📊 Change  : ${col}${change.toFixed(2)}% ${arrow}${c.reset}
📏 Diff    : ${diffColor}${diffPercent}%${c.reset}

⏱ Execute : ${seconds} sec
`);
}

// ===== TRADE =====
export function uiTrade(coin, question, price, target, change, diff, decision) {
  const arrow = change >= 0 ? "📈" : "📉";
  const col = change >= 0 ? c.green : c.red;

  const decisionColor = decision === "YES" ? c.green : c.red;

  console.log(`
${c.magenta}══════════════════════════════════${c.reset}
${c.bold}🚀 ${coin} EXECUTION${c.reset}
${c.magenta}══════════════════════════════════${c.reset}

${question}

💰 Price   : ${price}
🎯 Target  : ${target}
📊 Change  : ${col}${change.toFixed(2)}% ${arrow}${c.reset}
📏 Diff    : ${(diff * 100).toFixed(3)}%

➡️ Decision: ${decisionColor}${decision}${c.reset}
`);
}

// ===== BET RESULT =====
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
