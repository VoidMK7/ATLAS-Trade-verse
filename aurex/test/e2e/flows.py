import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import *
from playwright.sync_api import sync_playwright
SHOTS = os.environ.get('SHOTS', '/tmp/claude-0/-home-claude/a888a2c8-adc8-5cf8-a2b0-1cdb2ff7fee9/scratchpad/shots')
sql("truncate public.balances,public.orders,public.activity,public.notifications,public.swaps,public.swap_quotes,public.withdrawals,public.deposits,public.agent_trades,public.agent_positions,public.rentals,public.agents,public.audit_log,public.profiles,public.notification_prefs,public.user_roles,public.price_alerts,public.login_events cascade; delete from auth.users")
seed_prices(); admin = make_user('admin@nova.test', True); u = make_user('trader@nova.test'); credit(u, 'USDT', 'TRC20', 10000, 'seed-1')
errors = []; fails = []
def check(name, cond, extra=''):
    print(('PASS ' if cond else 'FAIL ') + name, extra)
    if not cond: fails.append(name)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_context(viewport={'width': 1500, 'height': 900}).new_page()
    pg.route('**/data-api.binance.vision/**', route_binance)
    pg.on('pageerror', lambda e: errors.append(f'PAGEERROR {e}'))
    pg.goto(BASE + '/'); pg.wait_for_selector('#em'); pg.fill('#em', 'trader@nova.test'); pg.fill('#pw', PW); pg.click('#sb'); pg.wait_for_selector('#view'); pg.wait_for_timeout(1200)
    def confirm(label):
        pg.wait_for_selector('#modal.on', timeout=5000); pg.click(f'#ma button:has-text("{label}")'); pg.wait_for_timeout(1500)
        pg.screenshot(path=f'{SHOTS}/flow-result-{label}.png')
        if pg.query_selector('#modal.on'): pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
    # market buy
    pg.evaluate("location.hash='#/exchange/BTC-USDT'"); pg.wait_for_timeout(2000)
    pg.click('[data-ty="market"]'); pg.fill('#am', '0.01'); pg.click('#go')
    try:
        confirm('Confirm'); 
    except Exception as e:
        pg.screenshot(path=f'{SHOTS}/flow-buy-fail.png'); print('buy modal issue', e)
    n = sql("select count(*) from public.orders where status='filled'").strip()
    check('market buy filled in DB', '1' in n.split()[-2:] or n.endswith('1'), n[-20:])
    # limit order then cancel via DB check
    pg.click('[data-ty="limit"]'); pg.fill('#pr', '1000'); pg.fill('#am', '0.01'); pg.click('#go')
    try: confirm('Confirm')
    except Exception as e: print('limit modal issue', e)
    n = sql("select count(*) from public.orders where status='open'").strip()
    check('limit order open in DB', n.split()[-1] == '1' or '1' in n, n[-20:])
    # swap
    pg.evaluate("location.hash='#/swap'"); pg.wait_for_timeout(1500)
    pg.select_option('#fc', 'USDT'); pg.select_option('#tc', 'ETH'); pg.fill('#fa', '100'); pg.wait_for_timeout(1500)
    pg.click('#qb')
    try: confirm('Confirm')
    except Exception as e: pg.screenshot(path=f'{SHOTS}/flow-swap-fail.png'); print('swap modal issue', e)
    n = sql("select count(*) from public.swaps").strip()
    check('swap recorded', n.split()[-1] == '1' or '1' in n, n[-20:])
    pg.screenshot(path=f'{SHOTS}/flow-swap.png')
    b.close()
print('\n'.join(sorted(set(errors))) or 'NO PAGE ERRORS')
print('FAILS:', fails or 'none')
