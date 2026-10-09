import './style.css';
import { invoke } from '@tauri-apps/api/core';
type Mood = 'idle' | 'thinking' | 'happy' | 'alert';
let mood: Mood = 'idle';
let expanded = false;
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
  <header class="topbar"><span class="brand">کیو <small>Qio</small></span><button class="circle" id="collapse" title="${expanded?'بستن پنل':'بازکردن پنل'}" aria-label="${expanded?'بستن پنل':'بازکردن پنل'}">${expanded?'−':'+'}</button></header>
  <main><section class="island ${expanded?'open':''}" aria-label="جزیره کیو">
    ${mascot()}<p class="status">${expanded?'به کیو خوش اومدی!':'کنارت هستم ✨'}</p>
    <span class="substatus">هنوز هیچ عامل هوش مصنوعی متصل نشده</span>
    <div class="actions"><button id="toggle"> ${expanded?'کوچک‌کردن':'نمایش فعالیت‌ها'} </button><button class="secondary" id="surprise">سلام کیو!</button></div>
  </section>
  ${expanded ? `<section class="panel"><div class="heading"><h2>عامل‌های هوش مصنوعی</h2><span class="muted">۴ اتصال آماده پیکربندی</span></div>
  <div class="agents">${agents.map(a=>`<div class="agent"><span class="agent-icon">${a.icon}</span><span class="agent-title">${a.name}</span><span class="agent-status">متصل نیست</span></div>`).join('')}</div>
  <div class="notice" role="status">این نسخه، پیش‌نمایش تعاملی رابط است. برای نمایش رویدادهای واقعی باید اتصال اختصاصی هر عامل پیاده‌سازی شود.</div>
  </section>` : ''}
  </main><footer><span class="dot"></span> نسخه اولیه رابط کاربری <button id="motion" class="text-button">${reducedMotion?'فعال‌کردن انیمیشن':'کاهش حرکت'}</button></footer>
  </div>`;
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
