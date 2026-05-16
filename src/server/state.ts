// @ts-nocheck
const COOKIE_SECRET = process.env.COOKIE_SECRET || 'squi?mb!o';
const yesodWinKeys = new Map();
const YESOD_KEY_TTL_MS = 5 * 60 * 1000;
const winnerKeys = new Map();
const WINNER_KEY_TTL_MS = 2 * 60 * 1000;
const wsAuthTokens = new Map();
const WS_AUTH_TTL_MS = 60 * 1000;

function pruneWsAuthTokens() {
    const now = Date.now();
    for (const [k, v] of wsAuthTokens) {
        if (v.exp <= now) wsAuthTokens.delete(k);
    }
}
const yesodJourneyRuns = new Map();
const YESOD_JOURNEY_WIN_TTL_MS = 10 * 60 * 1000;
module.exports = {
  COOKIE_SECRET,
  yesodWinKeys,
  YESOD_KEY_TTL_MS,
  winnerKeys,
  WINNER_KEY_TTL_MS,
  wsAuthTokens,
  WS_AUTH_TTL_MS,
  pruneWsAuthTokens,
  yesodJourneyRuns,
  YESOD_JOURNEY_WIN_TTL_MS,
};
