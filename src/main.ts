import './style.css';
import {providerGuides} from './providerGuides';
import { invoke } from '@tauri-apps/api/core';
import {openUrl} from '@tauri-apps/plugin-opener';
import {isPermissionGranted,requestPermission,sendNotification} from '@tauri-apps/plugin-notification';
type Mood = 'idle' | 'thinking' | 'working' | 'happy' | 'alert' | 'error' | 'sleep';
let mood: Mood = 'idle';
const moodText: Record<Mood,string> = {idle:'منتظر کار بعدی',thinking:'در حال فکر کردن',working:'در حال کار',happy:'آفرین! انجام شد',alert:'نیازمند توجه',error:'مشکلی پیش آمد',sleep:'در حال استراحت'};
let lastHistory = 0;
let lastApprovalCount=0;
let notificationsEnabled=false;
async function enableNotifications(){if(!('__TAURI_INTERNALS__' in window))return;try{notificationsEnabled=await isPermissionGranted()||(await requestPermission())==='granted';if(notificationsEnabled)sendNotification({title:'کیو',body:'اعلان‌ها فعال شدند'});render()}catch(e){console.warn('Notifications unavailable',e)}}
let expanded = false;
type PanelTab = 'chat'|'agents'|'guide'|'settings';
let panelTab:PanelTab='chat';
let scrollTop=0;
function openTab(tab:PanelTab){panelTab=tab;guideOpen=tab==='guide';scrollTop=0;render();document.querySelector<HTMLElement>('.app')?.scrollTo(0,0);}
type SourceStatus = {name:string;detected:boolean;last_event_unix:number|null;state:string};
let sources: SourceStatus[] = [];
type AgentEvent={agent:string;kind:string;label:string;observed_at:number};
let events:AgentEvent[]=[];
let hookEvents:AgentEvent[]=[];
type PendingApproval={id:string;tool:string;preview:string;expires_at:number};
let pendingApprovals:PendingApproval[]=[];
type TestEvidence={status:string;source:string;at:number;freshness:string};
let testEvidence:TestEvidence|null=null;
type AIProvider={id:string;name:string;region:string;key_configured:boolean};
let providers:AIProvider[]=[];
let guideOpen=true;let guideCategory='همه';let selectedGuide='avalai';
let soundEnabled=localStorage.getItem('qio-sounds')==='yes';
let miniMode=false;
let providerId='avalai';let modelId='';let promptText='';let aiResponse='';let aiBusy=false;let aiError='';
let showHelp=false;
let idleHide=localStorage.getItem('qio-idle-hide')==='yes';
let lastActivityAt=Date.now();
let eventError='';
const escapeHtml=(s:string)=>s.replace(/[&<>"']/g,ch=>( {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as Record<string,string> )[ch]??'');
async function refreshAgents(){ if (!('__TAURI_INTERNALS__' in window)) return; try {await invoke('qio_heartbeat');pendingApprovals=await invoke<PendingApproval[]>('qio_pending_approvals');if(pendingApprovals.length)lastActivityAt=Date.now(); sources=await invoke<SourceStatus[]>('local_agent_status'); events=await invoke<AgentEvent[]>('recent_agent_events'); hookEvents=await invoke<AgentEvent[]>('qio_hook_events');if(hookEvents.length)lastActivityAt=Math.max(lastActivityAt,hookEvents[hookEvents.length-1].observed_at*1000);testEvidence=await invoke<TestEvidence|null>('latest_test_evidence'); eventError=''; const newest=Math.max(0,...sources.map(s=>s.last_event_unix??0),...hookEvents.map(e=>e.observed_at||0));if(newest>lastHistory && lastHistory>0){mood='alert';chime('alert');if(notificationsEnabled)sendNotification({title:'کیو',body:'فعالیت جدید در نشست هوش مصنوعی ثبت شد'});} lastHistory=newest; if (!document.activeElement?.matches('input,textarea,select')) render(); } catch(error){ eventError='خواندن رویدادهای محلی در دسترس نیست'; console.warn('Could not read local agent status',error); if (!document.activeElement?.matches('input,textarea,select')) render(); } }

async function fetchProviders(){if(!('__TAURI_INTERNALS__' in window))return;try{providers=await invoke<AIProvider[]>('ai_providers');render()}catch(e){console.warn(e)}}
function chime(type:'success'|'alert'='success'){if(!soundEnabled)return;try{const AudioCtx=window.AudioContext;const ctx=new AudioCtx();const osc=ctx.createOscillator();const gain=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(type==='success'?660:440,ctx.currentTime);osc.frequency.exponentialRampToValueAtTime(type==='success'?880:520,ctx.currentTime+.13);gain.gain.setValueAtTime(.0001,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.065,ctx.currentTime+.02);gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.21);osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.22);osc.onended=()=>{void ctx.close().catch(()=>{})};}catch{}}
async function sendChat(){if(aiBusy||!('__TAURI_INTERNALS__' in window))return;aiBusy=true;aiError='';render();try{aiResponse=await invoke<string>('ai_chat',{provider:providerId,model:modelId,message:promptText});mood='happy';chime()}catch(error){aiError=String(error)}finally{aiBusy=false;render()}}
async function decideApproval(id:string,decision:'allow'|'deny'){try{await invoke('qio_decide_approval',{id,decision});pendingApprovals=pendingApprovals.filter(p=>p.id!==id);render()}catch(e){alert('پاسخ درخواست ثبت نشد: '+String(e))}}
let reducedMotion = localStorage.getItem('qio-reduced-motion') === 'yes' || (localStorage.getItem('qio-reduced-motion')===null && matchMedia('(prefers-reduced-motion: reduce)').matches);
let lightTheme = localStorage.getItem('qio-theme')==='light';
const app = document.querySelector<HTMLDivElement>('#app')!;
const agents = [
  { name: 'Claude Code', icon: 'C' },
  { name: 'Codex', icon: '◉' },
  { name: 'Gemini CLI', icon: '✦' },
  { name: 'OpenCode', icon: '⌘' },
];
function mascot() {
  return `<div id="mascot" class="mascot ${mood}" role="img" aria-label="شخصیت کیو، حالت ${mood}">
  <div class="shell"><span class="ear ear-left"></span><span class="ear ear-right"></span><div class="face"><span class="cheek cheek-left"></span><span class="cheek cheek-right"></span><div class="eyes"><span class="eye"><i></i></span><span class="eye"><i></i></span></div><span class="mouth"></span></div></div>
  <span class="mascot-spark spark-one">✦</span><span class="mascot-spark spark-two">✧</span><div class="shadow"></div></div>`;
}
function render() {
  const prev=document.querySelector<HTMLElement>('.app');
  const lastScroll=prev?.scrollTop??scrollTop;
  app.innerHTML = `<div class="app">
  <header class="topbar" id="drag-region" title="برای جابه‌جایی بکشید"><span class="brand"><span class="brand-signal"></span>کیو <small>Qio</small></span><button class="circle" id="collapse" title="${expanded?'بستن پنل':'بازکردن پنل'}" aria-label="${expanded?'بستن پنل':'بازکردن پنل'}">${expanded?'−':'+'}</button></header>
  <main><section class="island ${expanded?'open':''} mood-${mood}" aria-label="جزیره کیو">
    ${mascot()}<p class="status">${expanded?'به کیو خوش اومدی!':'کنارت هستم ✨'}</p>
    <span class="substatus"><span class="mood-dot"></span>${pendingApprovals.length?'درخواست تأیید منتظر شماست':moodText[mood]}</span>
    ${!expanded&&hookEvents.length?`<div class="compact-live"><span class="live-led"></span>${escapeHtml(hookEvents[hookEvents.length-1].agent)} · ${escapeHtml(hookEvents[hookEvents.length-1].label)}</div>`:''}
    <div class="actions"><button id="toggle"> ${expanded?'کوچک‌کردن':'نمایش فعالیت‌ها'} </button><button class="secondary" id="surprise">سلام کیو!</button></div>
  </section>
  ${expanded ? `<nav class="tab-bar" aria-label="بخش‌های کیو">${([["chat","گفت‌وگو"],["agents","فعالیت‌ها"],["guide","راهنما"],["settings","تنظیمات"]] as const).map(([id,title])=>`<button class="tab ${panelTab===id?"active":""}" data-tab="${id}" aria-current="${panelTab===id?"page":"false"}">${title}</button>`).join("")}</nav><section class="panel">${panelTab==="agents"?`<div class="heading"><h2>عامل‌های هوش مصنوعی</h2><span class="muted">وضعیت اتصال محلی</span></div>
  <div class="agents">${agents.map(a=>`<div class="agent"><span class="agent-icon">${a.icon}</span><span class="agent-title">${a.name}</span><span class="agent-status"><span class="agent-led ${sources.find(s=>s.name===a.name)?.detected?'detected':''}"></span>${sources.find(s=>s.name===a.name)?.last_event_unix ? "تاریخچه ثبت‌شده" : sources.find(s=>s.name===a.name)?.detected ? "شناسایی‌شده" : "بدون اتصال"}</span></div>`).join('')}</div>
  `:``}${panelTab==="guide"?`<section class="guide-section"><div class="guide-head"><div><strong>راهنمای اتصال هوش مصنوعی‌ها</strong><small>آموزش اختصاصی با تصویر برای هر سرویس</small></div><button id="guide-toggle" class="guide-toggle">${guideOpen?'بستن راهنما':'مشاهده راهنما'}</button></div>${guideOpen?`<img class="guide-hero" src="/qio-guide-hero.svg" alt="کیو در کنار کارت‌های اتصال هوش مصنوعی" loading="lazy"/><div class="guide-filter">${['همه','ایرانی','جهانی','آفلاین'].map(label=>`<button data-guide-category="${label}" class="${guideCategory===label?'active':''}">${label}</button>`).join('')}</div><div class="guide-gallery">${providerGuides.filter(g=>guideCategory==='همه'||g.category===guideCategory).map(g=>`<button class="guide-card ${selectedGuide===g.id?'chosen':''}" data-guide-id="${g.id}"><span class="guide-illustration" style="--guide-color:${g.accent}"><span class="guide-orbit"></span><b>${escapeHtml(g.symbol)}</b></span><b>${escapeHtml(g.name)}</b><small>${g.category}</small></button>`).join('')}</div>${(()=>{const g=providerGuides.find(x=>x.id===selectedGuide)||providerGuides[0];return `<article class="guide-detail"><div class="guide-detail-head"><span class="guide-illustration large" style="--guide-color:${g.accent}"><span class="guide-orbit"></span><b>${escapeHtml(g.symbol)}</b></span><div><strong>${escapeHtml(g.name)}</strong><p>${escapeHtml(g.description)}</p></div></div><ol>${g.steps.map(step=>`<li>${escapeHtml(step)}</li>`).join('')}</ol>${g.env?`<p class="guide-env">نام متغیر محیطی: <code dir="ltr">${escapeHtml(g.env)}</code></p>`:''}<p class="guide-tip">💡 ${escapeHtml(g.tips)}</p><div class="guide-links"><button data-guide-select="${g.id}">انتخاب در کیو</button><a href="${g.url}" target="_blank" rel="noreferrer noopener">وب‌سایت رسمی ↗</a></div></article>`})()}</div>`:''}</section>`:``}${panelTab==="chat"?`<div class="ai-chat"><div class="chat-heading"><span class="chat-avatar">✧</span><div><strong>گفت‌وگو با کیو</strong><small>دستیار مستقیم و مستقل</small></div><button id="clear-chat" type="button" title="پاک‌کردن پاسخ">پاک‌کردن</button></div><label>ارائه‌دهنده<select id="ai-provider">${providers.map(x=>`<option value="${x.id}" ${providerId===x.id?'selected':''}>${escapeHtml(x.name)} — ${x.key_configured?'آماده':'نیازمند کلید'}</option>`).join('')}</select></label><label>شناسه مدل<input id="ai-model" placeholder="شناسه دقیق مدل را وارد کنید" value="${escapeHtml(modelId)}"></label><label>پیام<textarea id="ai-prompt" rows="3" placeholder="از کیو سؤال بپرس...">${escapeHtml(promptText)}</textarea></label><button id="ai-send" class="send-glow" ${aiBusy?'disabled':''}>${aiBusy?'در حال دریافت پاسخ...':'ارسال پیام'}</button>${aiError?`<p class="ai-error">${escapeHtml(aiError)}</p>`:''}${aiResponse?`<div class="ai-answer" role="status">${escapeHtml(aiResponse)}<button type="button" id="copy-answer" class="copy-answer">کپی پاسخ</button></div>`:''}</div>`:``}${panelTab==="agents"?`<div class="approvals"><div class="approval-heading"><span>✦</span><strong>درخواست‌های تأیید</strong><small>${pendingApprovals.length?`${pendingApprovals.length} درخواست منتظر`: "همه‌چیز آرومه"}</small></div>${pendingApprovals.length?pendingApprovals.map(a=>`<div class="approval-card"><b>${escapeHtml(a.tool)}</b><p dir="auto">${escapeHtml(a.preview)||'بدون جزئیات قابل نمایش'}</p><div class="approval-actions"><button data-approve="${a.id}">تأیید همین درخواست</button><button class="deny" data-deny="${a.id}">رد درخواست</button></div></div>`).join(''):'<small>درخواستی در انتظار نیست.</small>'}</div><div class="events-panel"><strong>رویدادهای مستقل کیو</strong><small>Hookهای متصل، بدون متن مکالمه یا محتوای فایل</small>${hookEvents.length?hookEvents.slice(-8).reverse().map(e=>`<div class="event-row"><span>${escapeHtml(e.agent)}</span><span>${escapeHtml(e.label)}</span></div>`).join(""):`<p>برای دریافت زنده، Hook مربوط به Agent را فعال کنید.</p>`}<strong>تاریخچه نشست‌ها</strong><small>فقط فراداده؛ بدون متن مکالمه یا کد</small>${eventError?`<p>${eventError}</p>`:events.length?events.slice(-8).reverse().map(e=>`<div class="event-row"><span>${e.agent}</span><span>${e.label}</span></div>`).join(""):`<p>رویدادی پیدا نشد</p>`}<p class="test-warning">${testEvidence?`آخرین اجرای تست: ${testEvidence.status==='passed'?'کد خروج ۰':testEvidence.status==='failed'?'ناموفق':'نامشخص'}؛ تطابق با آخرین تغییرات کد بررسی نشده است.`:'هیچ شاهد اجرایی از تست‌ها ثبت نشده است.'}</p></div>`:``}${panelTab==="settings"?`<div class="appearance-controls"><button id="mini-toggle" type="button">حالت همراه کوچک</button><button id="idle-toggle" type="button">${idleHide?'غیرفعال‌کردن آرامش خودکار':'فعال‌کردن آرامش خودکار'}</button><button id="help-toggle" type="button" aria-expanded="${showHelp}">! راهنما و رفع مشکل</button>${showHelp?`<div class="settings-help"><strong>راهنمای کیو</strong><p>سبز: تاریخچه یا رویداد شناسایی شده؛ به معنی اتصال زنده قطعی نیست. برای رویدادهای زنده Hook مخصوص Agent لازم است.</p><p>بدون مدل محلی یا API معتبر، پاسخ هوش مصنوعی ارائه نمی‌شود. وضعیت تست فقط از اجرای واقعی خوانده می‌شود.</p><p>برای مشکلات نصب و اتصال، راهنمای فارسی مخزن را ببین.</p><a href="https://github.com/sahandse/Qio/blob/main/docs/DESKTOP_SETUP_FA.md" target="_blank" rel="noopener noreferrer">راهنمای کامل ↗</a><a class="telegram-link" href="https://t.me/sahandse" target="_blank" rel="noopener noreferrer"><span>✈</span> تلگرام و پشتیبانی · @sahandse</a></div>`:''}<button id="sound-toggle" type="button">${soundEnabled?"قطع صدا 🔈":"فعال‌کردن صدا 🔔"}</button><button id="theme-toggle" type="button">${lightTheme?"تم تاریک 🌙":"تم روشن ☀️"}</button><p>تم و انیمیشن‌ها برای همین دستگاه ذخیره می‌شوند.</p></div><div class="mood-picker" role="group" aria-label="پیش‌نمایش حالت‌های کاراکتر">${(["idle","thinking","working","happy","alert","error","sleep"] as Mood[]).map(m=>`<button type="button" class="mood-btn ${mood===m?"selected":""}" data-mood="${m}" aria-pressed="${mood===m}">${moodText[m]}</button>`).join("")}</div><div class="notice" role="status">کیو در حالت توسعه است؛ تاریخچه Agentها و نتیجه تست‌ها فقط بر اساس داده ثبت‌شده گزارش می‌شوند.</div>`:``}
  </section>` : ''}
  </main><footer><button id="notifications" class="text-button">اعلان‌ها</button><button id="quit" class="text-button" title="خروج از کیو">خروج</button><span class="dot"></span> نسخه اولیه رابط کاربری <button id="motion" class="text-button">${reducedMotion?'فعال‌کردن انیمیشن':'کاهش حرکت'}</button></footer>
  </div>`;
  document.querySelector('#drag-region')?.addEventListener('pointerdown',e=>{if ((e.target as HTMLElement).closest('button'))return;if ('__TAURI_INTERNALS__' in window) {void invoke('drag_island').catch(console.error);}});
  document.querySelector('#notifications')?.addEventListener('click',()=>void enableNotifications());
  document.querySelector('#quit')?.addEventListener('click',()=>{if ('__TAURI_INTERNALS__' in window) {void invoke('quit_qio');} else {alert('خروج در نسخه دسکتاپ فعال است.');}});
  document.querySelectorAll<HTMLButtonElement>('[data-mood]').forEach(button=>button.addEventListener('click',()=>{mood=button.dataset.mood as Mood;render();}));
  document.querySelector('#guide-toggle')?.addEventListener('click',()=>{guideOpen=!guideOpen;render()});
  document.querySelectorAll<HTMLElement>('[data-guide-category]').forEach(b=>b.addEventListener('click',()=>{guideCategory=b.dataset.guideCategory||'همه';const visible=providerGuides.filter(g=>guideCategory==='همه'||g.category===guideCategory);if(!visible.some(g=>g.id===selectedGuide))selectedGuide=visible[0]?.id??selectedGuide;render()}));
  document.querySelectorAll<HTMLElement>('[data-guide-id]').forEach(b=>b.addEventListener('click',()=>{selectedGuide=b.dataset.guideId||'avalai';render()}));
  document.querySelectorAll<HTMLElement>('[data-guide-select]').forEach(b=>b.addEventListener('click',()=>{providerId=b.dataset.guideSelect||'avalai';openTab('chat')}));
  document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(b=>b.addEventListener('click',()=>openTab(b.dataset.tab as PanelTab)));
  document.querySelector<HTMLSelectElement>('#ai-provider')?.addEventListener('change',e=>{providerId=(e.target as HTMLSelectElement).value;});
  document.querySelector<HTMLInputElement>('#ai-model')?.addEventListener('input',e=>{modelId=(e.target as HTMLInputElement).value;});
  document.querySelector<HTMLTextAreaElement>('#ai-prompt')?.addEventListener('input',e=>{promptText=(e.target as HTMLTextAreaElement).value;});
  document.querySelector('#ai-send')?.addEventListener('click',()=>void sendChat());
  document.querySelector('#clear-chat')?.addEventListener('click',()=>{aiResponse='';aiError='';render()});
  document.querySelector('#copy-answer')?.addEventListener('click',()=>void navigator.clipboard.writeText(aiResponse).catch(console.warn));
  document.querySelector('#sound-toggle')?.addEventListener('click',()=>{soundEnabled=!soundEnabled;localStorage.setItem('qio-sounds',soundEnabled?'yes':'no');if(soundEnabled)chime();render()});
  document.querySelectorAll<HTMLAnchorElement>('a.telegram-link').forEach(link=>link.addEventListener('click',event=>{if(!('__TAURI_INTERNALS__' in window))return;event.preventDefault();void openUrl('https://t.me/sahandse').catch(console.error)}));
  document.querySelector('#help-toggle')?.addEventListener('click',()=>{showHelp=!showHelp;render()});
  document.querySelector('#idle-toggle')?.addEventListener('click',()=>{idleHide=!idleHide;localStorage.setItem('qio-idle-hide',idleHide?'yes':'no');render()});
  document.querySelector('#mini-toggle')?.addEventListener('click',()=>{miniMode=!miniMode;expanded=false;document.documentElement.classList.toggle('qio-mini',miniMode);render();if('__TAURI_INTERNALS__' in window)void invoke('set_mini_mode',{enabled:miniMode}).catch(console.error)});
  document.querySelectorAll<HTMLElement>('[data-approve]').forEach(b=>b.addEventListener('click',()=>void decideApproval(b.dataset.approve!,'allow')));
  document.querySelectorAll<HTMLElement>('[data-deny]').forEach(b=>b.addEventListener('click',()=>void decideApproval(b.dataset.deny!,'deny')));
  document.querySelector('#collapse')?.addEventListener('click',toggle);
  document.querySelector('#toggle')?.addEventListener('click',toggle);
  document.querySelector('#surprise')?.addEventListener('click',()=>{ mood='happy'; render(); });
  document.querySelector('#motion')?.addEventListener('click',()=>{reducedMotion=!reducedMotion; localStorage.setItem('qio-reduced-motion',reducedMotion?'yes':'no');document.documentElement.classList.toggle('reduced',reducedMotion);render();});
  document.querySelector('#theme-toggle')?.addEventListener('click',()=>{lightTheme=!lightTheme;localStorage.setItem('qio-theme',lightTheme?'light':'dark');document.documentElement.classList.toggle('light-theme',lightTheme);render();});
  document.querySelector<HTMLElement>('.app')?.classList.toggle('quiet-island',idleHide&&!expanded&&pendingApprovals.length===0&&(Date.now()-lastActivityAt)>60000);
  const scroll=document.querySelector<HTMLElement>('.app'); if(scroll)scroll.scrollTop=lastScroll;
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
  document.querySelector('#mascot')?.addEventListener('click',()=>{if(miniMode){toggle();return;}
    if(mood==='happy')mood='thinking';
    else mood='happy';
    render();
  });
}
function toggle(){if(miniMode){miniMode=false;document.documentElement.classList.remove('qio-mini');expanded=true;}else{expanded=!expanded;}render();if('__TAURI_INTERNALS__' in window)void invoke('set_island_expanded',{expanded}).catch((error)=>console.error('Window resize failed',error));}
if ('__TAURI_INTERNALS__' in window) { void invoke('set_island_expanded',{expanded}).catch((error)=>console.error('Island initialization failed',error)); }
document.documentElement.classList.toggle('reduced',reducedMotion);
document.documentElement.classList.toggle('light-theme',lightTheme);
render();

async function refreshApprovals(){if(!('__TAURI_INTERNALS__' in window))return;try{
 const next=await invoke<PendingApproval[]>('qio_pending_approvals');
 const oldIds=pendingApprovals.map(x=>x.id).join(',');
 const newIds=next.map(x=>x.id).join(',');
 if(oldIds!==newIds){const added=next.some(x=>!pendingApprovals.some(old=>old.id===x.id));pendingApprovals=next;if(added){mood='alert';if(notificationsEnabled)sendNotification({title:'کیو',body:'Claude Code درخواست تأیید جدید دارد'});}if(!document.activeElement?.matches('input,textarea,select'))render()}
}catch(error){console.warn('Approval polling failed',error)}}
void refreshAgents();
window.setInterval(()=>void refreshApprovals(),1500);
window.setInterval(() => { if (document.visibilityState === 'visible') void refreshAgents(); }, 15000);

void fetchProviders();
