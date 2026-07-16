
(function(){
  let client=null, session=null, timer=null;
  const cfg=window.FINANCE_CLOUD_CONFIG||{};
  const configured=Boolean(cfg.supabaseUrl&&cfg.supabaseAnonKey&&window.supabase);

  function el(id){return document.getElementById(id)}
  function setText(id,text){const n=el(id);if(n)n.textContent=text}
  function showSetup(){const n=el('cloudSetupWarning');if(n)n.style.display=configured?'none':'block'}
  function setLastSync(date){const v=date?new Date(date).toLocaleString('de-DE'):'Noch nie';setText('cloudLastSync',v);localStorage.setItem('finance_cloud_last_sync',date||'')}
  function email(){return (el('cloudEmail')?.value||'').trim()}
  function password(){return el('cloudPassword')?.value||''}
  function autoEnabled(){return Boolean(el('cloudAutoSync')?.checked)}

  async function init(){
    showSetup();
    if(!configured)return;
    client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
    const {data}=await client.auth.getSession();session=data.session;
    updateStatus();
    client.auth.onAuthStateChange((_event,newSession)=>{session=newSession;updateStatus()});
    const cb=el('cloudAutoSync');
    if(cb){
      cb.checked=localStorage.getItem('finance_cloud_auto')==='true';
      cb.addEventListener('change',()=>localStorage.setItem('finance_cloud_auto',String(cb.checked)));
    }
    const last=localStorage.getItem('finance_cloud_last_sync');if(last)setLastSync(last);
  }
  function updateStatus(){setText('cloudAuthStatus',session?.user?.email||'Nicht angemeldet')}
  function requireReady(){
    if(!configured){alert('Cloud ist noch nicht eingerichtet. Bitte EINRICHTUNG.md öffnen.');return false}
    if(!session){alert('Bitte zuerst anmelden.');return false}
    return true
  }

  window.cloudSignUp=async function(){
    if(!configured)return requireReady();
    if(!email()||!password()){alert('Bitte E-Mail und Passwort eingeben.');return}
    const {error}=await client.auth.signUp({email:email(),password:password()});
    if(error)alert(error.message);else alert('Konto angelegt. Je nach Supabase-Einstellung bitte die Bestätigungs-E-Mail öffnen.')
  };
  window.cloudSignIn=async function(){
    if(!configured){showSetup();alert('Cloud ist noch nicht eingerichtet.');return}
    const {error}=await client.auth.signInWithPassword({email:email(),password:password()});
    if(error)alert(error.message);else alert('Angemeldet.')
  };
  window.cloudSignOut=async function(){if(client)await client.auth.signOut();session=null;updateStatus()};
  window.cloudSaveNow=async function(silent=false){
    if(!requireReady())return;
    const payload=window.financeApp?.getState();
    const {error}=await client.from('finance_profiles').upsert({
      user_id:session.user.id,
      app_state:payload,
      updated_at:new Date().toISOString()
    },{onConflict:'user_id'});
    if(error){if(!silent)alert(error.message);return}
    setLastSync(new Date().toISOString());if(!silent)alert('Cloud-Daten gespeichert.')
  };
  window.cloudLoadNow=async function(){
    if(!requireReady())return;
    const {data,error}=await client.from('finance_profiles').select('app_state,updated_at').eq('user_id',session.user.id).maybeSingle();
    if(error){alert(error.message);return}
    if(!data){alert('Noch kein Cloud-Datensatz vorhanden. Speichere zuerst von einem Gerät.');return}
    if(confirm('Lokale Daten durch den Cloud-Stand ersetzen?')){
      window.financeApp?.setState(data.app_state);
      setLastSync(data.updated_at);alert('Cloud-Daten geladen.')
    }
  };
  window.cloudSync={
    queue(){
      if(!configured||!session||!autoEnabled())return;
      clearTimeout(timer);timer=setTimeout(()=>window.cloudSaveNow(true),1500);
    }
  };
  document.addEventListener('DOMContentLoaded',init);
})();
