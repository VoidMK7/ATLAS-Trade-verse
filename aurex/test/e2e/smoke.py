import os, sys, json
sys.path.insert(0, os.path.dirname(__file__))
from common import *
from playwright.sync_api import sync_playwright
SHOTS = os.environ.get('SHOTS', '/tmp/claude-0/-home-claude/a888a2c8-adc8-5cf8-a2b0-1cdb2ff7fee9/scratchpad/shots'); os.makedirs(SHOTS, exist_ok=True)
sql("truncate public.balances,public.orders,public.activity,public.notifications,public.swaps,public.swap_quotes,public.withdrawals,public.deposits,public.agent_trades,public.agent_positions,public.rentals,public.agents,public.audit_log,public.profiles,public.notification_prefs,public.user_roles,public.price_alerts,public.login_events cascade; delete from auth.users")
seed_prices(); admin = make_user('admin@nova.test', True); u = make_user('trader@nova.test'); credit(u, 'USDT', 'TRC20', 10000, 'seed-1')
PAGES = ['dashboard','exchange','exchange/ETH-USDT','swap','wallet','wallet?t=deposit','wallet?t=withdraw','ai','bots','analytics','activity','notifications','news','account']
errors = []
def run(email, pages, tag, w=1366, h=860):
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = b.new_context(viewport={'width': w, 'height': h}).new_page()
        pg.route('**/data-api.binance.vision/**', route_binance)
        pg.on('pageerror', lambda e: errors.append(f'[{tag}] PAGEERROR {e}'))
        pg.on('console', lambda m: errors.append(f'[{tag}] CONSOLE {m.text[:200]}') if m.type == 'error' and 'WebSocket' not in m.text and 'websocket' not in m.text and 'ERR_' not in m.text else None)
        pg.goto(BASE + '/'); pg.wait_for_selector('#em', timeout=15000); pg.screenshot(path=f'{SHOTS}/{tag}-login.png')
        pg.fill('#em', email); pg.fill('#pw', PW); pg.click('#sb'); pg.wait_for_selector('#view', timeout=15000); pg.wait_for_timeout(1500)
        for r in pages:
            pg.evaluate(f"location.hash='#/{r}'"); pg.wait_for_timeout(1800)
            t = pg.inner_text('#view'); bad = 'Something went wrong' in t or 'Setup required' in t
            print(('FAIL ' if bad else 'ok   ') + tag + ' ' + r, len(t), (t[:140].replace('\n', ' | ') if bad else ''))
            pg.screenshot(path=f'{SHOTS}/{tag}-{r.replace("/","_").replace("?","_").replace("=","")}.png')
        b.close()
run('trader@nova.test', PAGES, 'desk')
run('trader@nova.test', ['dashboard','exchange','swap','wallet','ai','bots','account'], 'mob', 390, 800)
run('admin@nova.test', ['admin/overview','admin/users','admin/withdrawals','admin/deposits','admin/bots','admin/coins','admin/fees','admin/transactions','admin/orders','admin/health','admin/jobs','admin/audit','admin/news'], 'adm')
print('\n'.join(sorted(set(errors))) or 'NO CONSOLE/PAGE ERRORS')
