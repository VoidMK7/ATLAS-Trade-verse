/* ============ boot ============ */
(function boot(){
  if(!CFG.url||!CFG.key){
    $('#root').innerHTML=`<div class="auth"><div class="card"><div class="brand"><div class="logo"><svg viewBox="0 0 32 32"><path d="M16 5l9 21h-4.6l-1.9-4.6h-5.0L11.6 26H7z"/></svg></div>NovaTrade</div><h1>Configuration missing</h1><p class="mut">Set your Supabase project URL and public (anon) key in <code>config.js</code>, then reload.</p></div></div>`;return}
  Market.init().catch(e=>console.warn('market init',e));
  route();
  setInterval(()=>{if(Auth.tok&&!document.hidden)refreshUnread()},30000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Auth.tok)Market.poll().catch(()=>{})});
})();
