// Proxy server-side a CoinGecko: el navegador no puede pegarle directo
// (CoinGecko no manda Access-Control-Allow-Origin), pero un serverless
// function de Vercel sí puede, porque no corre en un navegador.
const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price';

// Mismo set que src/services/prices.ts — whitelist para no dejar esto como
// proxy abierto a cualquier id de CoinGecko.
const ALLOWED_IDS = new Set([
  'bitcoin',
  'ethereum',
  'solana',
  'binancecoin',
  'ripple',
  'cardano',
  'dogecoin',
  'polkadot',
  'litecoin',
  'chainlink',
  'avalanche-2',
  'tether',
  'usd-coin',
]);

module.exports = async function handler(req, res) {
  const idsParam = typeof req.query.ids === 'string' ? req.query.ids : '';
  const ids = idsParam
    .split(',')
    .map((id) => id.trim())
    .filter((id) => ALLOWED_IDS.has(id));

  if (ids.length === 0) {
    res.status(400).json({ error: 'No valid ids' });
    return;
  }

  try {
    const upstream = await fetch(`${COINGECKO_URL}?ids=${ids.join(',')}&vs_currencies=usd`);
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: `CoinGecko HTTP ${upstream.status}` });
      return;
    }
    const data = await upstream.json();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    res.status(200).json(data);
  } catch {
    res.status(502).json({ error: 'Upstream fetch failed' });
  }
};
