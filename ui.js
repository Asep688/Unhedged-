export const c = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  bold: "\x1b[1m",
  reset: "\x1b[0m"
};

export function uiHeader() {
  console.log(`\n${c.green}🚀 CRYPTO ALL-PAIR BOT STARTED${c.reset}`);
}

export function uiDashboard(balance, stats) {
  const winrate =
    stats.totalBets > 0
      ? ((stats.wins / stats.totalBets) * 100).toFixed(2)
      : "0.00";

  console.log(`
${c.cyan}══════════════════════════════${c.reset}
${c.bold}📊 DASHBOARD${c.reset}
${c.cyan}══════════════════════════════${c.reset}

💰 Balance : ${balance ?? 0} CC

Total Bets : ${stats.totalBets}
Wins       : ${stats.wins}
Losses     : ${stats.losses}
Profit     : ${stats.profit} CC
Winrate    : ${winrate}%
`);
}

export function uiRefresh() {
  console.log(`${c.cyan}🔄 REFRESH MARKET${c.reset}`);
}

export function uiSchedule(coin, question, target, seconds) {
  console.log(`
${c.cyan}══════════════════════════════${c.reset}
${c.bold}⏳ SCHEDULED${c.reset}
${c.cyan}══════════════════════════════${c.reset}

${c.green}${coin}${c.reset}
${question}

🎯 Target : ${target}
⏱ Execute: ${seconds} sec
`);
}

export function uiTrade(coin, question, price, target, change, diff, decision) {
  const arrow = change >= 0 ? "📈" : "📉";
  const col = change >= 0 ? c.green : c.red;

  console.log(`
${c.cyan}══════════════════════════════════${c.reset}
${c.bold}${c.magenta}🚀 ${coin} TRADE${c.reset}
${c.cyan}══════════════════════════════════${c.reset}

${question}

💰 Price   : ${price}
🎯 Target  : ${target}
📊 Change  : ${col}${change.toFixed(2)}% ${arrow}${c.reset}
📏 Diff    : ${(diff * 100).toFixed(3)}%

➡️ Decision: ${decision}

${c.cyan}══════════════════════════════════${c.reset}
`);
}

export function uiBetSuccess() {
  console.log(`${c.green}✅ BET SUCCESS${c.reset}`);
}

export function uiBetFail() {
  console.log(`${c.red}❌ BET FAILED${c.reset}`);
}

export function uiSkip(msg) {
  console.log(`${c.yellow}⚠️ ${msg}${c.reset}`);
}
