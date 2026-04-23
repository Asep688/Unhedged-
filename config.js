export const CONFIG = {
  BET_AMOUNT: 20,

  MAX_BETS: 3,
  MAX_PER_COIN: 1,

  ENABLE: {
    SHORT: true,
    HOURLY: true,
    DAILY: false
  },

  TRIGGER: {
    SHORT: 5,
    HOURLY: 6,
    DAILY: 10
  },

  DIFF: {
    SHORT: {
      BTC: 0.004,
      ETH: 0.004,
      SOL: 0.004,
      BNB: 0.004,
      CC: 0.006
    },
    HOURLY: {
      BTC: 0.004,
      ETH: 0.004,
      SOL: 0.004,
      BNB: 0.004,
      CC: 0.006
    },
    DAILY: {
      BTC: 0.005,
      ETH: 0.006,
      SOL: 0.007,
      BNB: 0.007,
      CC: 0.008
    }
  },

  REFRESH_INTERVAL: 600000
};
