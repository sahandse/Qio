import './style.css';
import { invoke } from '@tauri-apps/api/core';
import {isPermissionGranted,requestPermission,sendNotification} from '@tauri-apps/plugin-notification';
type Mood = 'idle' | 'thinking' | 'working' | 'happy' | 'alert' | 'error' | 'sleep';
let mood: Mood = 'idle';
const moodText: Record<Mood,string> = {idle:'منتظر کار بعدی',thinking:'در حال فکر کردن',working:'در حال کار',happy:'آفرین! انجام شد',alert:'نیازمند توجه',error:'مشکلی پیش آمد',sleep:'در حال استراحت'};
let lastHistory = 0;
let notificationsEnabled=false;
async function enableNotifications(){if(!('__TAURI_INTERNALS__' in window))return;try{notificationsEnabled=await isPermissionGranted()||(await requestPermission())==='granted';if(notificationsEnabled)sendNotification({title:'کیو',body:'اعلان‌ها فعال شدند'});render()}catch(e){console.warn('Notifications unavailable',e)}}
let expanded = false;
type SourceStatus = {name:string;detected:boolean;last_event_unix:number|null;state:string};
let sources: SourceStatus[] = [];
type AgentEvent={agent:string;kind:string;label:string;observed_at:number};
let events:AgentEvent[]=[];
let hookEvents:AgentEvent[]=[];
type AIProvider={id:string;name:string;region:string;key_configured:boolean};
let providers:AIProvider[]=[];
let providerId='avalai';let modelId='';let promptText='';let aiResponse='';let aiBusy=false;let aiError='';
let eventError='';
const escapeHtml=(s:string)=>s.replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]??''));
async function refreshAgents(){ if (!('__TAURI_INTERNALS__' in window)) return; try { sources=await invoke<SourceStatus[]>('local_agent_status'); events=await invoke<AgentEvent[]>('recent_agent_events'); hookEvents=await invoke<AgentEvent[]>('qio_hook_events'); eventError=''; const newest=Math.max(0,...sources.map(s=>s.last_event_unix??0),...hookEvents.map(e=>e.observed_at||0));if(newest>lastHistory && lastHistory>0){mood='alert';if(notificationsEnabled)sendNotification({title:'کیو',body:'فعالیت جدید در نشست هوش مصنوعی ثبت شد'});} lastHistory=newest; if (!document.activeElement?.matches('input,textarea,select')) render(); } catch(error){ eventError='خواندن رویدادهای محلی در دسترس نیست'; console.warn('Could not read local agent status',error); if (!document.activeElement?.matches('input,textarea,select')) render(); } }

async function fetchProviders(){if(!('__TAURI_INTERNALS__' in window))return;try{providers=await invoke<AIProvider[]>('ai_providers');render()}catch(e){console.warn(e)}}
async function sendChat(){if(aiBusy||!('__TAURI_INTERNALS__' in window))return;aiBusy=true;aiError='';render();try{aiResponse=await invoke<string>('ai_chat',{provider:providerId,model:modelId,message:promptText})}catch(error){aiError=String(error)}finally{aiBusy=false;render()}}
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
    <span class="substatus">${moodText[mood]} · رویدادهای محلی (دریافت زنده با Hook)</span>
    <div class="actions"><button id="toggle"> ${expanded?'کوچک‌کردن':'نمایش فعالیت‌ها'} </button><button class="secondary" id="surprise">سلام کیو!</button></div>
  </section>
  ${expanded ? `<section class="panel"><div class="heading"><h2>عامل‌های هوش مصنوعی</h2><span class="muted">۴ اتصال آماده پیکربندی</span></div>
  <div class="agents">${agents.map(a=>`<div class="agent"><span class="agent-icon">${a.icon}</span><span class="agent-title">${a.name}</span><span class="agent-status">${sources.find(s=>s.name===a.name)?.last_event_unix ? "تاریخچه شناسایی شد" : sources.find(s=>s.name===a.name)?.detected ? "پوشه موجود است" : "شناسایی نشده"}</span></div>`).join('')}</div>
  <div class="ai-chat"><strong>گفت‌وگو با هوش مصنوعی</strong><small>اتصال مستقیم کیو؛ بدون وابستگی به DotPals</small><label>ارائه‌دهنده<select id="ai-provider">${providers.map(x=>`<option value="${x.id}" ${providerId===x.id?'selected':''}>${escapeHtml(x.name)} — ${x.key_configured?'آماده':'نیازمند کلید'}</option>`).join('')}</select></label><label>شناسه مدل<input id="ai-model" placeholder="شناسه دقیق مدل را وارد کنید" value="${escapeHtml(modelId)}"></label><label>پیام<textarea id="ai-prompt" rows="3" placeholder="از کیو سؤال بپرس...">${escapeHtml(promptText)}</textarea></label><button id="ai-send" ${aiBusy?'disabled':''}>${aiBusy?'در حال دریافت پاسخ...':'ارسال پیام'}</button>${aiError?`<p class="ai-error">${escapeHtml(aiError)}</p>`:''}${aiResponse?`<div class="ai-answer">${escapeHtml(aiResponse)}</div>`:''}</div><div class="events-panel"><strong>رویدادهای مستقل کیو</strong><small>Hookهای متصل، بدون متن مکالمه یا محتوای فایل</small>${hookEvents.length?hookEvents.slice(-8).reverse().map(e=>`<div class="event-row"><span>${escapeHtml(e.agent)}</span><span>${escapeHtml(e.label)}</span></div>`).join(""):`<p>برای دریافت زنده، Hook مربوط به Agent را فعال کنید.</p>`}<strong>تاریخچه نشست‌ها</strong><small>فقط فراداده؛ بدون متن مکالمه یا کد</small>${eventError?`<p>${eventError}</p>`:events.length?events.slice(-8).reverse().map(e=>`<div class="event-row"><span>${e.agent}</span><span>${e.label}</span></div>`).join(""):`<p>رویدادی پیدا نشد</p>`}<p class="test-warning">وضعیت تست‌ها هنوز تأیید نشده است؛ تا وقتی نتیجه واقعی اجرا ثبت نشود، کیو موفقیت تست را اعلام نمی‌کند.</p></div><div class="mood-picker" role="group" aria-label="پیش‌نمایش حالت‌های کاراکتر">${(["idle","thinking","working","happy","alert","error","sleep"] as Mood[]).map(m=>`<button type="button" class="mood-btn ${mood===m?"selected":""}" data-mood="${m}" aria-pressed="${mood===m}">${moodText[m]}</button>`).join("")}</div><div class="notice" role="status">گفت‌وگوی AI مستقیم انجام می‌شود؛ شناسایی تاریخچه Agentها هنوز به معنی اتصال زنده و کنترل دستورات آن‌ها نیست.</div>
  </section>` : ''}
  </main><footer><button id="notifications" class="text-button">اعلان‌ها</button><button id="quit" class="text-button" title="خروج از کیو">خروج</button><span class="dot"></span> نسخه اولیه رابط کاربری <button id="motion" class="text-button">${reducedMotion?'فعال‌کردن انیمیشن':'کاهش حرکت'}</button></footer>
  </div>`;
  document.querySelector('#drag-region')?.addEventListener('pointerdown',e=>{if ((e.target as HTMLElement).closest('button'))return;if ('__TAURI_INTERNALS__' in window) {void invoke('drag_island').catch(console.error);}});
  document.querySelector('#notifications')?.addEventListener('click',()=>void enableNotifications());
  document.querySelector('#quit')?.addEventListener('click',()=>{if ('__TAURI_INTERNALS__' in window) {void invoke('quit_qio');} else {alert('خروج در نسخه دسکتاپ فعال است.');}});
  document.querySelectorAll<HTMLButtonElement>('[data-mood]').forEach(button=>button.addEventListener('click',()=>{mood=button.dataset.mood as Mood;render();}));
  document.querySelector<HTMLSelectElement>('#ai-provider')?.addEventListener('change',e=>{providerId=(e.target as HTMLSelectElement).value;});
  document.querySelector<HTMLInputElement>('#ai-model')?.addEventListener('input',e=>{modelId=(e.target as HTMLInputElement).value;});
  document.querySelector<HTMLTextAreaElement>('#ai-prompt')?.addEventListener('input',e=>{promptText=(e.target as HTMLTextAreaElement).value;});
  document.querySelector('#ai-send')?.addEventListener('click',()=>void sendChat());
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

void fetchProviders();
