import { Position } from '../types';

// Precios en vivo para posiciones, con fuentes gratuitas y sin API key:
// - Cripto (USD): CoinGecko
// - Acciones/ETFs de EE.UU. (USD): data912.com
// - Acciones y CEDEARs argentinos (ARS): data912.com
// Si un ticker no aparece en su fuente, conserva el precio cargado a mano.

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price';
const DATA912_USA_URL = 'https://data912.com/live/usa_stocks';
const DATA912_ARG_URL = 'https://data912.com/live/arg_stocks';

// Tickers de cripto soportados → id de CoinGecko
const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  DOT: 'polkadot',
  LTC: 'litecoin',
  LINK: 'chainlink',
  AVAX: 'avalanche-2',
  USDT: 'tether',
  USDC: 'usd-coin',
};

async function fetchCryptoPrices(tickers: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  const ids = tickers.map((t) => COINGECKO_IDS[t]).filter(Boolean);
  if (ids.length === 0) return prices;
  const res = await fetch(`${COINGECKO_URL}?ids=${ids.join(',')}&vs_currencies=usd`);
  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
  const data = await res.json();
  for (const ticker of tickers) {
    const usd = data[COINGECKO_IDS[ticker]]?.usd;
    if (typeof usd === 'number' && usd > 0) prices.set(ticker, usd);
  }
  return prices;
}

async function fetchData912Prices(url: string): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`data912 HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) return prices;
  for (const row of data) {
    if (typeof row?.symbol === 'string' && typeof row?.c === 'number' && row.c > 0) {
      prices.set(row.symbol, row.c);
    }
  }
  return prices;
}

/**
 * Devuelve id de posición → precio actual para todas las posiciones que tengan
 * fuente en vivo. Las fuentes fallan de forma independiente: si una se cae,
 * las otras siguen aportando precios.
 */
export async function fetchLivePrices(positions: Position[]): Promise<Map<string, number>> {
  const cryptos = positions.filter((p) => p.kind === 'cripto' && p.currency === 'USD');
  const usaStocks = positions.filter((p) => p.kind === 'accion' && p.currency === 'USD');
  const argStocks = positions.filter((p) => p.kind === 'accion' && p.currency === 'ARS');

  const [cryptoRes, usaRes, argRes] = await Promise.allSettled([
    cryptos.length > 0
      ? fetchCryptoPrices(cryptos.map((p) => p.ticker))
      : Promise.resolve(new Map<string, number>()),
    usaStocks.length > 0 ? fetchData912Prices(DATA912_USA_URL) : Promise.resolve(new Map<string, number>()),
    argStocks.length > 0 ? fetchData912Prices(DATA912_ARG_URL) : Promise.resolve(new Map<string, number>()),
  ]);

  const byId = new Map<string, number>();
  const collect = (
    result: PromiseSettledResult<Map<string, number>>,
    group: Position[],
  ) => {
    if (result.status !== 'fulfilled') return;
    for (const position of group) {
      const price = result.value.get(position.ticker);
      if (price !== undefined) byId.set(position.id, price);
    }
  };
  collect(cryptoRes, cryptos);
  collect(usaRes, usaStocks);
  collect(argRes, argStocks);
  return byId;
}
