"""Shared helpers for the e2e tests (test-only). Requires: local Postgres with stub+migration loaded, tests/e2e/server.js running on :5173."""
import json, math, random, time, urllib.request
BASE = 'http://127.0.0.1:5173'
PW = 'Passw0rd!x1'
COINS = {'BTC': 60000, 'ETH': 3000, 'SOL': 150, 'BNB': 580, 'XRP': 0.55, 'ADA': 0.45, 'DOGE': 0.15, 'AVAX': 35, 'LINK': 15, 'TON': 6}

def post(path, body):
    r = urllib.request.Request(BASE + path, data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'}, method='POST')
    return json.loads(urllib.request.urlopen(r, timeout=30).read() or b'{}')

def sql(q): return post('/__test/sql', {'sql': q})['out']

def seed_prices(scale=1.0, ticks=True):
    """Stand-in for the market-feed edge function: write fresh server prices + a short tick history."""
    vals = ','.join(f"('{c}/USDT','{c}',{p*scale},{p},{p*1.02},{p*0.98},{p*1e5},{(scale-1)*100})" for c, p in COINS.items())
    sql(f"insert into public.market_prices(symbol,base,price,open24h,high,low,volume,change24h) values {vals} on conflict(symbol) do update set price=excluded.price,updated_at=now(),change24h=excluded.change24h")
    if ticks:
        sql("delete from public.price_ticks")
        for c, p in COINS.items():
            sql(f"insert into public.price_ticks(symbol,ts,price) select '{c}/USDT', now()-(i||' minutes')::interval, {p*scale}*(1-i*0.0004) from generate_series(0,30) i")

def make_user(email, admin=False):
    return post('/__test/user', {'email': email, 'password': PW, 'admin': admin})['id']

def credit(uid, coin, net, amount, tx):
    sql(f"select set_config('request.jwt.claim.role','service_role',true); select public.admin_credit_deposit('{uid}','{coin}','{net}',{amount},'{tx}')")

# ---- synthetic stand-ins for the public Binance reference endpoints (the sandbox cannot reach the internet) ----
def klines(symbol, interval, limit):
    step = {'1m': 6e4, '5m': 3e5, '15m': 9e5, '1h': 36e5, '4h': 144e5, '1d': 864e5}[interval]
    base = COINS.get(symbol.replace('USDT', ''), 100); r = random.Random(hash(symbol + interval) & 0xffff); p = base * 0.9; out = []
    t0 = int(time.time() * 1000 // step * step) - (limit - 1) * step
    for i in range(limit):
        o = p; p = max(base * 0.5, p * (1 + (r.random() - .47) * .012 + math.sin(i / 9) * .002)); h = max(o, p) * (1 + r.random() * .004); l = min(o, p) * (1 - r.random() * .004)
        out.append([t0 + i * step, str(o), str(h), str(l), str(p), str(50 + r.random() * 500), t0 + i * step + step - 1])
    return out

def route_binance(route):
    from urllib.parse import urlparse, parse_qs
    u = urlparse(route.request.url); q = parse_qs(u.query); body = None
    if u.path.endswith('/klines'): body = klines(q['symbol'][0], q['interval'][0], int(q.get('limit', ['300'])[0]))
    elif u.path.endswith('/depth'):
        b = COINS.get(q['symbol'][0].replace('USDT', ''), 100); body = {'bids': [[str(b * (1 - .0004 * (i + 1))), str(1 + i * .3)] for i in range(20)], 'asks': [[str(b * (1 + .0004 * (i + 1))), str(1 + i * .25)] for i in range(20)]}
    elif u.path.endswith('/trades'):
        b = COINS.get(q['symbol'][0].replace('USDT', ''), 100); body = [{'id': i, 'price': str(b * (1 + ((i * 7) % 11 - 5) * 1e-4)), 'qty': str(0.1 + i * .02), 'time': int(time.time() * 1000) - i * 2000, 'isBuyerMaker': i % 2 == 0} for i in range(24)]
    elif u.path.endswith('/ticker/24hr'):
        syms = json.loads(q['symbols'][0]); body = [{'symbol': s, 'lastPrice': str(COINS[s[:-4]]), 'openPrice': str(COINS[s[:-4]] * .99), 'highPrice': str(COINS[s[:-4]] * 1.02), 'lowPrice': str(COINS[s[:-4]] * .97), 'quoteVolume': '1000000', 'priceChangePercent': '1.2'} for s in syms if s[:-4] in COINS]
    route.fulfill(status=200, content_type='application/json', body=json.dumps(body if body is not None else {}))
