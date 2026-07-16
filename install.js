
let deferredPrompt=null;
const banner=document.getElementById('installBanner');
const button=document.getElementById('installButton');
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();deferredPrompt=e;
  banner?.classList.add('show');
});
button?.addEventListener('click',async()=>{
  if(!deferredPrompt)return;
  deferredPrompt.prompt();await deferredPrompt.userChoice;
  deferredPrompt=null;banner?.classList.remove('show');
});
window.addEventListener('appinstalled',()=>banner?.classList.remove('show'));
