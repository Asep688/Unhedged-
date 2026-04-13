export const CONFIG = {
  BET_AMOUNT: 5,

  // jumlah maksimal bet per cycle
  MAX_BETS: 3,

  // maksimal per coin (biar tidak spam BTC saja)
  MAX_PER_COIN: 1,

  TRIGGER_SHORT: 30,
  REFRESH_INTERVAL: 600000,

  // diff per coin
  DIFF: {
    BTC: 0.002,
    ETH: 0.0025,
    SOL: 0.003,
    BNB: 0.003,
    CC: 0.004
  }
};
