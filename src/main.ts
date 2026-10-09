import './style.css';
import { invoke } from '@tauri-apps/api/core';
type Mood = 'idle' | 'thinking' | 'working' | 'happy' | 'alert' | 'error' | 'sleep';
let mood: Mood = 'idle';
const moodText: Record<Mood,string> = {idle:'منتظر کار بعدی',thinking:'در حال فکر کردن',working:'در حال کار',happy:'آفرین! انجام شد',alert:'نیازمند توجه',error:'مشکلی پیش آمد',sleep:'در حال استراحت'};
let lastHistory = 0;
let expanded = false;
type SourceStatus = {name:string;detected:boolean;last_event_unix:number|null;state:string};
let sources: SourceStatus[] = [];
type AgentEvent={agent:string;kind:string;label:string;observed_at:number};
let events:AgentEvent[]=[];
type BridgeActivity={title:string;kind:string;at:number|null};
type BridgeSnapshot={connected:boolean;source:string;activities:BridgeActivity[];message:string};
let bridge:BridgeSnapshot={connected:false,source:'dotpals-local',activities:[],message:'بررسی نشده'};
let eventError='';
const escapeHtml=(s:string)=>s.replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]??''));
async function refreshAgents(){ if (!('__TAURI_INTERNALS__' in window)) return; try { sources=await invoke<SourceStatus[]>('local_agent_status'); events=await invoke<AgentEvent[]>('recent_agent_events'); bridge=await invoke<BridgeSnapshot>('dotpals_snapshot'); eventError=''; const newest=Math.max(0,...sources.map(s=>s.last_event_unix??0));if(newest>lastHistory && lastHistory>0) mood='alert'; lastHistory=newest;render(); } catch(error){ eventError='خواندن رویدادهای محلی در دسترس نیست'; console.warn('Could not read local agent status',error); } }

let reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const app = document.querySelector<HTMLDivElement>('#app')!;
const agents = [
  { name: 'Claude Code', icon: 'C' },
  { name: 'Codex', icon: '◉' },
  { name: 'Gemini CLI', icon: '✦' },
  { name: 'OpenCode', icon: '⌘' },
];
function mascot() {
  return `<div id="mascot" class="mascot ${mood}" role="img" aria-label="شخصیت کیو، حالت ${mood}">
  <div class="shell"><div class="face"><div class="eyes"><span class="eye"><i></i></span><span class="eye"><i></i></span></div><span class="mouth"></span></div></div>
  <div class="shadow"></div></div>`;
}
function render() {
  app.innerHTML = `<div class="app">
  <header class="topbar" id="drag-region" title="برای جابه‌جایی بکشید"><span class="brand">کیو <small>Qio</small></span><button class="circle" id="collapse" title="${expanded?'بستن پنل':'بازکردن پنل'}" aria-label="${expanded?'بستن پنل':'بازکردن پنل'}">${expanded?'−':'+'}</button></header>
  <main><section class="island ${expanded?'open':''}" aria-label="جزیره کیو">
    ${mascot()}<p class="status">${expanded?'به کیو خوش اومدی!':'کنارت هستم ✨'}</p>
    <span class="substatus">${moodText[mood]} · تاریخچه محلی (نه وضعیت زنده)</span>
    <div class="actions"><button id="toggle"> ${expanded?'کوچک‌کردن':'نمایش فعالیت‌ها'} </button><button class="secondary" id="surprise">سلام کیو!</button></div>
  </section>
  ${expanded ? `<section class="panel"><div class="heading"><h2>عامل‌های هوش مصنوعی</h2><span class="muted">۴ اتصال آماده پیکربندی</span></div>
  <div class="agents">${agents.map(a=>`<div class="agent"><span class="agent-icon">${a.icon}</span><span class="agent-title">${a.name}</span><span class="agent-status">${sources.find(s=>s.name===a.name)?.last_event_unix ? "تاریخچه شناسایی شد" : sources.find(s=>s.name===a.name)?.detected ? "پوشه موجود است" : "شناسایی نشده"}</span></div>`).join('')}</div>
  <div class="events-panel"><strong>گزارش فعالیت و بررسی‌ها</strong><small>${bridge.connected?"اتصال محلی DotPals فعال":bridge.message}</small>${bridge.activities.slice(0,5).map(a=>`<div class="event-row"><span>${escapeHtml(a.kind.slice(0,24))}</span><span>${escapeHtml(a.title.slice(0,100))}</span></div>`).join("")}<strong>رویدادهای نشست‌ها</strong><small>فقط فراداده؛ بدون متن مکالمه یا کد</small>${eventError?`<p>${eventError}</p>`:events.length?events.slice(-8).reverse().map(e=>`<div class="event-row"><span>${e.agent}</span><span>${e.label}</span></div>`).join(""):`<p>رویدادی پیدا نشد</p>`}<p class="test-warning">وضعیت تست‌ها فقط در صورت ثبت شاهد معتبر در DotPals قابل بررسی است؛ اتصال تاریخچه به‌تنهایی تأیید تست نیست.</p></div><div class="mood-picker" role="group" aria-label="پیش‌نمایش حالت‌های کاراکتر">${(["idle","thinking","working","happy","alert","error","sleep"] as Mood[]).map(m=>`<button type="button" class="mood-btn ${mood===m?"selected":""}" data-mood="${m}" aria-pressed="${mood===m}">${moodText[m]}</button>`).join("")}</div><div class="notice" role="status">شناسایی پوشه و تاریخچه با اتصال زنده متفاوت است؛ تا زمان پیاده‌سازی Hook، تأیید دستورات و رویدادها فعال نیستند.</div>
  </section>` : ''}
  </main><footer><button id="quit" class="text-button" title="خروج از کیو">خروج</button><span class="dot"></span> نسخه اولیه رابط کاربری <button id="motion" class="text-button">${reducedMotion?'فعال‌کردن انیمیشن':'کاهش حرکت'}</button></footer>
  </div>`;
  document.querySelector('#drag-region')?.addEventListener('pointerdown',e=>{if ((e.target as HTMLElement).closest('button'))return;if ('__TAURI_INTERNALS__' in window) {void invoke('drag_island').catch(console.error);}});
  document.querySelector('#quit')?.addEventListener('click',()=>{if ('__TAURI_INTERNALS__' in window) {void invoke('quit_qio');} else {alert('خروج در نسخه دسکتاپ فعال است.');}});
  document.querySelectorAll<HTMLButtonElement>('[data-mood]').forEach(button=>button.addEventListener('click',()=>{mood=button.dataset.mood as Mood;render();}));
  document.querySelector('#collapse')?.addEventListener('click',toggle);
  document.querySelector('#toggle')?.addEventListener('click',toggle);
  document.querySelector('#surprise')?.addEventListener('click',()=>{ mood='happy'; render(); });
  document.querySelector('#motion')?.addEventListener('click',()=>{reducedMotion=!reducedMotion; document.documentElement.classList.toggle('reduced',reducedMotion);render();});
  const face=document.querySelector<HTMLElement>('.face');
  const shell=document.querySelector<HTMLElement>('.shell');
  document.querySelector('#mascot')?.addEventListener('pointermove',e=>{
     if(reducedMotion||!face||!shell)return;
     const rect=shell.getBoundingClientRect();
     const x=Math.max(-5,Math.min(5,(e.clientX-(rect.left+rect.width/2))/12));
     const y=Math.max(-4,Math.min(4,(e.clientY-(rect.top+rect.height/2))/12));
     face.style.setProperty('--look-x',x+'px');face.style.setProperty('--look-y',y+'px');
  });
  document.querySelector('#mascot')?.addEventListener('pointerleave',()=>{face?.style.setProperty('--look-x','0px');face?.style.setProperty('--look-y','0px');});
}
function toggle(){expanded=!expanded;render();if ('__TAURI_INTERNALS__' in window) { void invoke('set_island_expanded',{expanded}).catch((error)=>console.error('Window resize failed',error)); }}
if ('__TAURI_INTERNALS__' in window) { void invoke('set_island_expanded',{expanded}).catch((error)=>console.error('Island initialization failed',error)); }
document.documentElement.classList.toggle('reduced',reducedMotion);
render();

void refreshAgents();
window.setInterval(() => { if (document.visibilityState === 'visible') void refreshAgents(); }, 15000);
