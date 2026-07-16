
const fmt=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(n)||0);
const fmt2=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(n)||0);
const pct=n=>new Intl.NumberFormat('de-DE',{style:'percent',maximumFractionDigits:1}).format(Number(n)||0);
const KEY='finanzzentrale_v7';

const defaults={
  project:{start:'2026-07-01',target:'2031-07-01',goal:90000,purchasePrice:450000,ancillaryRate:.10,furnishing:20000,emergency:10000},
  assumptions:{salaryGrowth:.05,investmentReturn:.05,pensionGrowth:.015,kfw:150000,kfwInterest:.025,kfwRepayment:.02,bankInterest:.035,bankRepayment:.02,ownerCosts:250,maintenance:100,specialAnnual:1500},
  assets:{home:5000,pension:15000,emergency:5000},
  budget:{
    income:[{name:'Nettoeinkommen',amount:3300}],
    fixed:[
      {name:'Warmmiete',factor:1,cost:910},{name:'Private Rente',factor:1,cost:109.15},{name:'Hausrat',factor:1,cost:8.26},
      {name:'Fitnessstudio',factor:1,cost:63},{name:'Autokredit',factor:1,cost:468.52},{name:'GEZ',factor:3,cost:55.08},
      {name:'Strom',factor:1,cost:75},{name:'Handy',factor:1,cost:16.98},{name:'Kabel/Internet',factor:1,cost:44.98},
      {name:'Kfz-Versicherung',factor:3,cost:296.32},{name:'Kfz-Steuer',factor:12,cost:109},
      {name:'Haftpflicht',factor:12,cost:59.32},{name:'Zahnreinigung',factor:6,cost:100},
      {name:'Heizkosten-Rücklage',factor:12,cost:400},{name:'Auto-Inspektion',factor:14,cost:700}
    ],
    variable:[{name:'Lebensmittel',amount:400},{name:'Benzin',amount:180},{name:'Lotto',amount:85},{name:'Freizeit',amount:200}],
    annualIncome:[{name:'Weihnachts-/Urlaubsgeld (Wohnungsanteil)',amount:1500}],
    annualExpense:[]
  },
  monthlySavings:[
    Array(12).fill(300),Array(12).fill(450),Array(12).fill(600),Array(12).fill(750),Array(12).fill(900)
  ],
  snapshots:[],
  properties:[],
  security:{pin:''},
  meta:{updatedAt:null}
};
let state=merge(defaults,JSON.parse(localStorage.getItem(KEY)||'{}'));

function merge(a,b){if(Array.isArray(a))return Array.isArray(b)?b:a;if(a&&typeof a==='object'){const o={...a};for(const k of Object.keys(b||{}))o[k]=k in a?merge(a[k],b[k]):b[k];return o}return b??a}
function save(){state.meta.updatedAt=new Date().toISOString();localStorage.setItem(KEY,JSON.stringify(state));window.cloudBridge?.queue();renderAll()}
function currentIncome(){return state.budget.income.reduce((s,x)=>s+Number(x.amount||0),0)}
function fixedTotal(){return state.budget.fixed.reduce((s,x)=>s+Number(x.cost||0)/Math.max(1,Number(x.factor||1)),0)}
function variableTotal(){return state.budget.variable.reduce((s,x)=>s+Number(x.amount||0),0)}
function surplus(){return currentIncome()-fixedTotal()-variableTotal()}
function addMonths(d,n){return new Date(d.getFullYear(),d.getMonth()+n,1)}
function monthDiff(a,b){return (b.getFullYear()-a.getFullYear())*12+b.getMonth()-a.getMonth()}
function latestSnapshot(){return [...state.snapshots].sort((a,b)=>new Date(a.date)-new Date(b.date)).at(-1)||null}
function projection(){
  const start=new Date(state.project.start+'T12:00:00'), snap=latestSnapshot();
  let home=snap?Number(snap.home):state.assets.home, pension=snap?Number(snap.pension):state.assets.pension;
  const base=snap?new Date(snap.date+'T12:00:00'):start, rows=[];
  for(let i=0;i<60;i++){
    const date=addMonths(start,i);
    if(date<new Date(base.getFullYear(),base.getMonth(),1)){rows.push({date,total:null,home:null,pension:null});continue}
    if(snap&&date.getFullYear()===base.getFullYear()&&date.getMonth()===base.getMonth()){rows.push({date,home,pension,total:home+pension});continue}
    const saveAmt=Number(state.monthlySavings[Math.floor(i/12)]?.[i%12]||0);
    home=home*(1+state.assumptions.investmentReturn/12)+saveAmt;
    pension=pension*(1+state.assumptions.pensionGrowth/12);
    if(i%12===11)home+=Number(state.assumptions.specialAnnual||0);
    rows.push({date,home,pension,total:home+pension});
  }
  return rows;
}
function finance(){
  const final=projection().filter(x=>x.total!==null).at(-1);
  const equity=final?.total||state.assets.home+state.assets.pension;
  const ancillary=state.project.purchasePrice*state.project.ancillaryRate;
  const usable=Math.max(0,equity-state.project.furnishing-state.project.emergency);
  const need=Math.max(0,state.project.purchasePrice+ancillary-usable);
  const kfw=Math.min(state.assumptions.kfw,need),bank=Math.max(0,need-kfw);
  const rate=kfw*(state.assumptions.kfwInterest+state.assumptions.kfwRepayment)/12+bank*(state.assumptions.bankInterest+state.assumptions.bankRepayment)/12;
  const targetNet=currentIncome()*Math.pow(1+state.assumptions.salaryGrowth,5);
  const housing=rate+state.assumptions.ownerCosts+state.assumptions.maintenance;
  return{equity,ancillary,usable,need,kfw,bank,rate,housing,targetNet,ratio:housing/targetNet}
}

const views={dashboard:'Dashboard',budget:'Finanzplan',savings:'Sparplan',assets:'Vermögen',financing:'Finanzierung',properties:'Wohnungen',cloud:'Cloud & Login',settings:'Einstellungen'};
document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#nav button').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));document.getElementById(b.dataset.view).classList.add('active');viewTitle.textContent=views[b.dataset.view];setTimeout(drawCharts,20)});
todayLabel.textContent=new Date().toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});

function renderAll(){renderDashboard();renderBudget();renderSavings();renderAssets();renderFinancing();renderProperties();renderSettings();drawCharts()}
function renderDashboard(){
  const f=finance(),current=state.assets.home+state.assets.pension,progress=current/state.project.goal;
  heroEquity.textContent=fmt(current);heroEquityGoal.textContent=`von ${fmt(state.project.goal)}`;heroProgress.style.width=Math.min(100,progress*100)+'%';
  heroPurchasePrice.textContent=fmt(state.project.purchasePrice);heroTargetDate.textContent=`Ziel: ${new Date(state.project.target).toLocaleDateString('de-DE',{month:'long',year:'numeric'})}`;
  heroSurplus.textContent=fmt(surplus());heroRate.textContent=fmt(f.rate);heroHousingRatio.textContent=`Wohnkostenquote ${pct(f.ratio)}`;
  const gap=Math.max(0,state.project.goal-f.equity),avg=state.monthlySavings.flat().reduce((a,b)=>a+Number(b||0),0)/60;
  coachCard.innerHTML=gap===0?`<strong>Ziel erreicht.</strong><br>Dein Plan liegt aktuell über dem Eigenkapitalziel.`:`Diesen Monat sind <strong>${fmt(state.monthlySavings[0][new Date().getMonth()]||avg)}</strong> eingeplant.<br>Noch fehlen rechnerisch <strong>${fmt(gap)}</strong> bis zum Ziel.`;
  const years=[];const p=projection();for(let y=0;y<5;y++){const x=p[(y+1)*12-1];years.push(x?.total||0)}
  yearProgress.innerHTML=years.map((v,i)=>`<div class="year-row"><span>Jahr ${i+1}</span><div class="year-bar"><div style="width:${Math.min(100,v/state.project.goal*100)}%"></div></div><strong>${fmt(v)}</strong></div>`).join('')
}
function renderBudget(){
  budgetIncome.textContent=fmt(currentIncome());budgetFixed.textContent=fmt(fixedTotal());budgetVariable.textContent=fmt(variableTotal());budgetSurplus.textContent=fmt(surplus());
  incomeTable.innerHTML=state.budget.income.map((x,i)=>rowSimple('income',x,i)).join('');
  fixedTable.innerHTML=state.budget.fixed.map((x,i)=>`<tr><td><input value="${esc(x.name)}" onchange="editBudget('fixed',${i},'name',this.value)"></td><td><input type="number" value="${x.factor}" onchange="editBudget('fixed',${i},'factor',this.value)"></td><td><input type="number" value="${x.cost}" onchange="editBudget('fixed',${i},'cost',this.value)"></td><td>${fmt2(x.cost/Math.max(1,x.factor))}</td><td><button class="icon-btn" onclick="removeBudget('fixed',${i})">×</button></td></tr>`).join('');
  variableTable.innerHTML=state.budget.variable.map((x,i)=>rowSimple('variable',x,i)).join('');
  annualIncomeList.innerHTML=state.budget.annualIncome.map((x,i)=>inlineRow('annualIncome',x,i)).join('');
  annualExpenseList.innerHTML=state.budget.annualExpense.map((x,i)=>inlineRow('annualExpense',x,i)).join('');
}
function rowSimple(t,x,i){return `<tr><td><input value="${esc(x.name)}" onchange="editBudget('${t}',${i},'name',this.value)"></td><td><input type="number" value="${x.amount}" onchange="editBudget('${t}',${i},'amount',this.value)"></td><td><button class="icon-btn" onclick="removeBudget('${t}',${i})">×</button></td></tr>`}
function inlineRow(t,x,i){return `<div class="inline-row"><input value="${esc(x.name)}" onchange="editBudget('${t}',${i},'name',this.value)"><input type="number" value="${x.amount}" onchange="editBudget('${t}',${i},'amount',this.value)"><button class="icon-btn" onclick="removeBudget('${t}',${i})">×</button></div>`}
function esc(s){return String(s??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;')}
window.editBudget=(t,i,k,v)=>{state.budget[t][i][k]=k==='name'?v:Number(v);save()}
window.removeBudget=(t,i)=>{state.budget[t].splice(i,1);save()}
document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{const t=b.dataset.add;state.budget[t].push(t==='fixed'?{name:'Neue Ausgabe',factor:1,cost:0}:{name:'Neue Position',amount:0});save()})

function renderSavings(){
  const start=new Date(state.project.start+'T12:00:00'),today=new Date(),months=['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
  let grand=0;
  savingsGrid.innerHTML=`<div class="savings-wrap"><table class="savings-table"><thead><tr><th>Jahr</th>${Array.from({length:12},(_,m)=>`<th>${months[addMonths(start,m).getMonth()]}</th>`).join('')}<th>Gesamt</th></tr></thead><tbody>${state.monthlySavings.map((yr,y)=>{const total=yr.reduce((a,b)=>a+Number(b||0),0);grand+=total;return `<tr><td>Jahr ${y+1}</td>${yr.map((v,m)=>{const d=addMonths(start,y*12+m),cls=d<new Date(today.getFullYear(),today.getMonth(),1)?'past':d.getMonth()===today.getMonth()&&d.getFullYear()===today.getFullYear()?'current':'future';return `<td class="${cls}"><input type="number" value="${v}" onchange="editSaving(${y},${m},this.value)"></td>`}).join('')}<td><strong>${fmt(total)}</strong></td></tr>`}).join('')}</tbody></table></div><p>Gesamte geplante Sparraten: <strong>${fmt(grand)}</strong></p>`;
  const snap=latestSnapshot();snapshotDate.value=new Date().toISOString().slice(0,10);snapshotHome.value=snap?.home??state.assets.home;snapshotPension.value=snap?.pension??state.assets.pension;snapshotNet.value=snap?.net??currentIncome();
  snapshotTable.innerHTML=[...state.snapshots].reverse().map((s,i)=>`<tr><td>${new Date(s.date).toLocaleDateString('de-DE')}</td><td>${fmt(s.home)}</td><td>${fmt(s.pension)}</td><td>${fmt(s.net)}</td><td><button class="icon-btn" onclick="removeSnapshot('${s.id}')">×</button></td></tr>`).join('');
}
window.editSaving=(y,m,v)=>{state.monthlySavings[y][m]=Math.max(0,Number(v));save()}
saveSnapshotBtn.onclick=()=>{const s={id:String(Date.now()),date:snapshotDate.value,home:Number(snapshotHome.value),pension:Number(snapshotPension.value),net:Number(snapshotNet.value)};state.snapshots.push(s);state.assets.home=s.home;state.assets.pension=s.pension;state.budget.income[0].amount=s.net;save()}
window.removeSnapshot=id=>{state.snapshots=state.snapshots.filter(x=>x.id!==id);save()}

function renderAssets(){assetHome.textContent=fmt(state.assets.home);assetPension.textContent=fmt(state.assets.pension);assetEmergency.textContent=fmt(state.assets.emergency);assetTotal.textContent=fmt(state.assets.home+state.assets.pension+state.assets.emergency)}
function renderFinancing(){
  const fields=[['Kaufpreis','project.purchasePrice'],['Nebenkostenquote %','project.ancillaryRate'],['Einrichtung','project.furnishing'],['Notgroschen','project.emergency'],['KfW','assumptions.kfw'],['Bankzins %','assumptions.bankInterest']];
  financeInputs.innerHTML=fields.map(([l,p])=>`<label>${l}<input type="number" value="${getPath(p)*(p.includes('Rate')||p.includes('Interest')?100:1)}" onchange="setFinance('${p}',this.value)"></label>`).join('');
  const f=finance();financeResult.innerHTML=[['Eigenkapital am Ziel',f.equity],['Einsetzbares Eigenkapital',f.usable],['Finanzierungsbedarf',f.need],['KfW-Anteil',f.kfw],['Bankdarlehen',f.bank],['Kreditrate',f.rate],['Gesamt-Wohnkosten',f.housing],['Wohnkostenquote',pct(f.ratio)]].map(([l,v])=>`<div class="result-box"><span>${l}</span><strong>${typeof v==='string'?v:fmt(v)}</strong></div>`).join('')
}
function getPath(p){return p.split('.').reduce((o,k)=>o[k],state)}
window.setFinance=(p,v)=>{const a=p.split('.'),last=a.pop(),o=a.reduce((x,k)=>x[k],state);o[last]=p.includes('Rate')||p.includes('Interest')?Number(v)/100:Number(v);save()}

function renderProperties(){propertyCards.innerHTML=state.properties.map((p,i)=>`<div class="property-card ${p.favorite?'favorite':''}"><h3>${esc(p.name)}</h3><div class="meta"><span>${esc(p.location)}</span><span>Kaufpreis ${fmt(p.price)}</span><span>Hausgeld ${fmt(p.hausgeld)}</span><span>${p.energy||'Energieklasse offen'}</span></div><div class="button-row"><button class="btn small" onclick="toggleFavorite(${i})">${p.favorite?'★ Favorit':'☆ Favorit'}</button><button class="btn small danger" onclick="removeProperty(${i})">Löschen</button></div></div>`).join('')||'<p class="note">Noch keine Wohnung gespeichert.</p>'}
addPropertyBtn.onclick=()=>{const name=prompt('Name der Wohnung?','Wohnung A');if(!name)return;state.properties.push({name,location:prompt('Lage?','Berlin 12555')||'',price:Number(prompt('Kaufpreis?','450000'))||0,hausgeld:Number(prompt('Hausgeld monatlich?','300'))||0,energy:prompt('Energieklasse / KfW?','KfW-förderfähig')||'',favorite:false});save()}
window.toggleFavorite=i=>{state.properties[i].favorite=!state.properties[i].favorite;save()}
window.removeProperty=i=>{state.properties.splice(i,1);save()}

function renderSettings(){
  const fields=[['Projektstart','project.start','date'],['Kaufdatum','project.target','date'],['Eigenkapitalziel','project.goal','number'],['Kaufpreis','project.purchasePrice','number'],['Renditeannahme %','assumptions.investmentReturn','number'],['Gehaltssteigerung %','assumptions.salaryGrowth','number'],['Notgroschen aktuell','assets.emergency','number']];
  projectInputs.innerHTML=fields.map(([l,p,t])=>`<label>${l}<input type="${t}" value="${t==='number'&&(p.includes('Return')||p.includes('Growth'))?getPath(p)*100:getPath(p)}" onchange="setSetting('${p}',this.value)"></label>`).join('');
  pinSetting.value=state.security.pin||''
}
window.setSetting=(p,v)=>{const a=p.split('.'),last=a.pop(),o=a.reduce((x,k)=>x[k],state);o[last]=p.includes('Return')||p.includes('Growth')?Number(v)/100:(p.includes('start')||p.includes('target')?v:Number(v));save()}
savePinBtn.onclick=()=>{state.security.pin=pinSetting.value.trim();save();alert('PIN gespeichert.')}
quickSaveBtn.onclick=()=>{save();alert('Gespeichert.')}
exportBtn.onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='finanzzentrale-v7.json';a.click()}
importInput.onchange=async e=>{const f=e.target.files[0];if(f){state=merge(defaults,JSON.parse(await f.text()));save()}}
resetBtn.onclick=()=>{if(confirm('Alle Daten zurücksetzen?')){state=structuredClone(defaults);save()}}

function drawCharts(){
  lineChart(wealthChart,projection().filter(x=>x.total!==null).map(x=>x.total));
  lineChart(assetChart,projection().filter(x=>x.total!==null).map(x=>x.total));
  donut(expenseChart,[fixedTotal(),variableTotal(),Math.max(0,surplus())],['#ef6461','#ffd166','#92d050'])
}
function lineChart(c,vals){if(!c||!vals.length)return;const dpr=devicePixelRatio||1,w=c.clientWidth,h=Number(c.getAttribute('height'))||280;c.width=w*dpr;c.height=h*dpr;const x=c.getContext('2d');x.scale(dpr,dpr);x.clearRect(0,0,w,h);const p={l:48,r:15,t:18,b:30},max=Math.max(state.project.goal,...vals)*1.08;x.strokeStyle='#2c3540';x.fillStyle='#9ba7b4';x.font='11px system-ui';for(let i=0;i<=4;i++){const y=p.t+(h-p.t-p.b)*i/4;x.beginPath();x.moveTo(p.l,y);x.lineTo(w-p.r,y);x.stroke();x.fillText(fmt(max*(1-i/4)),2,y+4)}x.strokeStyle='#92d050';x.lineWidth=3;x.beginPath();vals.forEach((v,i)=>{const px=p.l+(w-p.l-p.r)*i/(vals.length-1),py=p.t+(h-p.t-p.b)*(1-v/max);i?x.lineTo(px,py):x.moveTo(px,py)});x.stroke()}
function donut(c,vals,colors){if(!c)return;const dpr=devicePixelRatio||1,w=c.clientWidth,h=250;c.width=w*dpr;c.height=h*dpr;const x=c.getContext('2d');x.scale(dpr,dpr);x.clearRect(0,0,w,h);const total=vals.reduce((a,b)=>a+b,0)||1,cx=w*.42,cy=h/2,r=82;let a=-Math.PI/2;vals.forEach((v,i)=>{const da=v/total*Math.PI*2;x.beginPath();x.moveTo(cx,cy);x.arc(cx,cy,r,a,a+da);x.fillStyle=colors[i];x.fill();a+=da});x.beginPath();x.arc(cx,cy,47,0,Math.PI*2);x.fillStyle='#13181e';x.fill();x.fillStyle='#fff';x.textAlign='center';x.font='bold 17px system-ui';x.fillText(fmt(total),cx,cy+5)}
function handleLock(){if(state.security.pin){lockScreen.classList.remove('hidden');unlockBtn.onclick=()=>{if(pinInput.value===state.security.pin)lockScreen.classList.add('hidden');else lockError.textContent='PIN ist nicht korrekt.'};skipPinBtn.classList.add('hidden')}}
window.financeApp={getState:()=>structuredClone(state),setState:s=>{state=merge(defaults,s);save()},setSyncStatus:(text,kind='neutral')=>{syncBadge.textContent=text;syncBadge.className='badge '+kind}};
window.addEventListener('resize',drawCharts);
renderAll();handleLock();
if('serviceWorker' in navigator)navigator.serviceWorker.register('./service-worker.js');
