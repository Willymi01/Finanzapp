
(function(){
 const cfg=window.FINANCE_CLOUD_CONFIG||{};let client=null,session=null,timer=null;
 const configured=Boolean(cfg.supabaseUrl&&cfg.supabaseAnonKey&&window.supabase);
 const $=id=>document.getElementById(id);
 function status(t,k='neutral'){window.financeApp?.setSyncStatus(t,k)}
 async function init(){
  if(!configured){$('cloudWarning').classList.remove('hidden');return}
  client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
  const {data}=await client.auth.getSession();session=data.session;renderAuth();
  client.auth.onAuthStateChange((_e,s)=>{session=s;renderAuth()});
  $('autoSync').checked=localStorage.getItem('finance_v7_autosync')==='true';
  $('autoSync').onchange=()=>localStorage.setItem('finance_v7_autosync',String($('autoSync').checked));
  $('signInBtn').onclick=signIn;$('signUpBtn').onclick=signUp;$('signOutBtn').onclick=signOut;$('cloudSaveBtn').onclick=()=>saveCloud(false);$('cloudLoadBtn').onclick=loadCloud;
 }
 function renderAuth(){$('authStatus').textContent=session?.user?.email||'Nicht angemeldet';status(session?'Cloud bereit':'Lokal',session?'good':'neutral')}
 async function signUp(){const {error}=await client.auth.signUp({email:$('cloudEmail').value,password:$('cloudPassword').value});alert(error?error.message:'Konto angelegt. Bitte ggf. E-Mail bestätigen.')}
 async function signIn(){const {data,error}=await client.auth.signInWithPassword({email:$('cloudEmail').value,password:$('cloudPassword').value});if(error)alert(error.message);else{session=data.session;localStorage.setItem('finance_v7_email',$('cloudEmail').value);renderAuth()}}
 async function signOut(){await client.auth.signOut();session=null;renderAuth()}
 async function saveCloud(silent=true){if(!session){if(!silent)alert('Bitte anmelden.');return}status('Synchronisiert…','warn');const {error}=await client.from('finance_profiles').upsert({user_id:session.user.id,app_state:window.financeApp.getState(),updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error){status('Cloud-Fehler','warn');if(!silent)alert(error.message);return}$('lastSync').textContent=new Date().toLocaleString('de-DE');status('Synchronisiert','good');if(!silent)alert('Cloud gespeichert.')}
 async function loadCloud(){if(!session){alert('Bitte anmelden.');return}const {data,error}=await client.from('finance_profiles').select('app_state,updated_at').eq('user_id',session.user.id).maybeSingle();if(error)return alert(error.message);if(!data)return alert('Noch kein Cloud-Stand vorhanden.');if(confirm('Lokale Daten durch Cloud-Stand ersetzen?')){window.financeApp.setState(data.app_state);$('lastSync').textContent=new Date(data.updated_at).toLocaleString('de-DE')}}
 window.cloudBridge={queue(){if(!session||!$('autoSync')?.checked)return;clearTimeout(timer);timer=setTimeout(()=>saveCloud(true),1200)}};
 document.addEventListener('DOMContentLoaded',()=>{const e=localStorage.getItem('finance_v7_email');if(e)$('cloudEmail').value=e;init()});
})();
