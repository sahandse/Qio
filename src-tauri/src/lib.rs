use std::{env,fs,path::{Path,PathBuf},time::{SystemTime,UNIX_EPOCH}};
use tauri::{Manager,PhysicalPosition,LogicalSize,Size};
use tauri::menu::{Menu,MenuItem};
use tauri::tray::TrayIconBuilder;
use serde::Serialize;

#[derive(Serialize)]
struct AgentStatus {
    name: &'static str,
    source: &'static str,
    detected: bool,
    last_event_unix: Option<u64>,
    state: &'static str,
}
fn newest_file(path: &Path, depth: usize) -> Option<SystemTime> {
    if depth == 0 || !path.exists() { return None; }
    let mut latest = None;
    if path.is_file() { return fs::metadata(path).ok()?.modified().ok(); }
    for entry in fs::read_dir(path).ok()?.flatten().take(2500) {
        let item = entry.path();
        let current = if item.is_dir() { newest_file(&item,depth-1) }
          else if item.extension().and_then(|x|x.to_str()) == Some("jsonl") { fs::metadata(&item).ok().and_then(|m|m.modified().ok()) } else { None };
        if let Some(t) = current { if latest.map_or(true,|old|t>old){latest=Some(t);} }
    }
    latest
}
#[tauri::command]
fn local_agent_status() -> Vec<AgentStatus> {
    let home = env::var_os("USERPROFILE").or_else(||env::var_os("HOME")).map(PathBuf::from);
    let choices = [("Codex","~/.codex/sessions",".codex/sessions"),("Claude Code","~/.claude/projects",".claude/projects")];
    choices.iter().map(|&(name,source,relative)|{
        let path = home.as_ref().map(|h|h.join(relative));
        let detected = path.as_ref().is_some_and(|p|p.is_dir());
        let last = path.as_ref().and_then(|p|newest_file(p,7)).and_then(|t|t.duration_since(UNIX_EPOCH).ok()).map(|d|d.as_secs());
        AgentStatus{name,source,detected,last_event_unix:last,state:if last.is_some(){"history-found"}else if detected{"directory-found"}else{"not-found"}}
    }).collect()
}

#[derive(Serialize)]
struct RecentEvent {
    agent: &'static str,
    kind: String,
    label: String,
    observed_at: u64,
}
fn find_latest_jsonl(root: &Path, depth: usize, best: &mut Option<(PathBuf,SystemTime)>) {
    if depth==0 {return}
    if let Ok(iter)=fs::read_dir(root) {
        for entry in iter.flatten().take(1500) {
            let path=entry.path();
            if path.is_dir(){find_latest_jsonl(&path,depth-1,best)}
            else if path.extension().and_then(|x|x.to_str())==Some("jsonl") {
                if let Ok(time)=entry.metadata().and_then(|m|m.modified()){
                    if best.as_ref().is_none_or(|(_,old)|time>*old){*best=Some((path,time));}
                }
            }
        }
    }
}
fn recent_events_from(root:&Path, agent:&'static str)->Vec<RecentEvent>{
    let mut latest=None;
    find_latest_jsonl(root,7,&mut latest);
    let Some((path,modified))=latest else {return vec![]};
    let timestamp=modified.duration_since(UNIX_EPOCH).map(|d|d.as_secs()).unwrap_or(0);
    let Ok(file)=fs::File::open(path) else {return vec![]};
    use std::io::{BufRead,BufReader};
    let mut ring=std::collections::VecDeque::with_capacity(25);
    // Read structured metadata only. Never expose prompts, command arguments or file contents.
    for line in BufReader::new(file).lines().map_while(Result::ok){
        if line.len()>1_000_000{continue}
        if let Ok(value)=serde_json::from_str::<serde_json::Value>(&line){
            let event_type=value.get("type").and_then(|v|v.as_str()).unwrap_or("");
            let payload=value.get("payload").unwrap_or(&value);
            let subtype=payload.get("type").and_then(|v|v.as_str()).unwrap_or("");
            let (kind,label)=match (agent,event_type,subtype) {
                (_,"session_meta",_) => ("session","نشست شناسایی شد"),
                ("Codex","response_item","function_call") => ("tool-start","فراخوانی ابزار ثبت شد"),
                ("Codex","response_item","function_call_output") => ("tool-result","پاسخ ابزار ثبت شد (نتیجه تأیید نشده)"),
                ("Codex","event_msg","task_started") => ("thinking","وظیفه شروع شد"),
                ("Codex","event_msg","task_complete") => ("complete","پایان وظیفه ثبت شد (نه تأیید تست)"),
                ("Codex","response_item",_) => ("activity","فعالیت مدل ثبت شد"),
                ("Claude Code","assistant",_) => {
                    let has_tool=payload.pointer("/message/content").and_then(|v|v.as_array())
                       .is_some_and(|items|items.iter().any(|v|v.get("type").and_then(|x|x.as_str())==Some("tool_use")));
                    if has_tool {("tool-start","فراخوانی ابزار ثبت شد")}else{("activity","پاسخ مدل ثبت شد")}
                },
                ("Claude Code","user",_) => {
                    let has_result=payload.pointer("/message/content").and_then(|v|v.as_array())
                       .is_some_and(|items|items.iter().any(|v|v.get("type").and_then(|x|x.as_str())==Some("tool_result")));
                    if has_result {("tool-result","نتیجه ابزار دریافت شد (تست تأیید نشده)")}else{continue}
                },
                (_,"tool_result",_) => ("tool-result","پاسخ ابزار ثبت شد"),
                _ => continue,
            };
            ring.push_back(RecentEvent{agent,kind:kind.into(),label:label.into(),observed_at:timestamp});
            if ring.len()>25{ring.pop_front();}
        }
    }
    ring.into_iter().collect()
}
#[tauri::command]
fn recent_agent_events()->Vec<RecentEvent>{
    let Some(home)=env::var_os("USERPROFILE").or_else(||env::var_os("HOME")).map(PathBuf::from) else {return vec![]};
    let mut events=recent_events_from(&home.join(".codex/sessions"),"Codex");
    events.extend(recent_events_from(&home.join(".claude/projects"),"Claude Code"));
    events
}


#[derive(Serialize)]
struct ProviderInfo {
    id: &'static str,
    name: &'static str,
    region: &'static str,
    key_configured: bool,
}
fn provider_details(id: &str) -> Option<(&'static str, &'static str, &'static str, &'static str)> {
    match id {
        "hooshgar" => Some(("هوشگر (ایران)","ایرانی","https://api.hooshgar.ir/v1/chat/completions","HOOSHGAR_API_KEY")),
        "mistral" => Some(("Mistral AI","بین‌المللی","https://api.mistral.ai/v1/chat/completions","MISTRAL_API_KEY")),
        "xai" => Some(("xAI Grok","بین‌المللی","https://api.x.ai/v1/chat/completions","XAI_API_KEY")),
        "fireworks" => Some(("Fireworks AI","بین‌المللی","https://api.fireworks.ai/inference/v1/chat/completions","FIREWORKS_API_KEY")),
        "cerebras" => Some(("Cerebras","بین‌المللی","https://api.cerebras.ai/v1/chat/completions","CEREBRAS_API_KEY")),
        "avalai" => Some(("اول‌ای‌آی (ایران)","ایرانی","https://api.avalai.ir/v1/chat/completions","AVALAI_API_KEY")),
        "openai" => Some(("OpenAI","بین‌المللی","https://api.openai.com/v1/chat/completions","OPENAI_API_KEY")),
        "openrouter" => Some(("OpenRouter","بین‌المللی","https://openrouter.ai/api/v1/chat/completions","OPENROUTER_API_KEY")),
        "deepseek" => Some(("DeepSeek","بین‌المللی","https://api.deepseek.com/chat/completions","DEEPSEEK_API_KEY")),
        "groq" => Some(("Groq","بین‌المللی","https://api.groq.com/openai/v1/chat/completions","GROQ_API_KEY")),
        "together" => Some(("Together AI","بین‌المللی","https://api.together.xyz/v1/chat/completions","TOGETHER_API_KEY")),
        "ollama" => Some(("Ollama (آفلاین)","محلی","http://127.0.0.1:11434/v1/chat/completions","")),
        "lmstudio" => Some(("LM Studio (محلی)","محلی","http://127.0.0.1:1234/v1/chat/completions","")),
        _ => None
    }
}
#[tauri::command]
fn ai_providers()->Vec<ProviderInfo>{
    ["mistral","xai","fireworks","cerebras","hooshgar","avalai","openai","openrouter","deepseek","groq","together","ollama","lmstudio"]
        .iter().filter_map(|id|provider_details(id).map(|(name,region,_,key)|ProviderInfo {
            id:match *id {"mistral"=>"mistral","xai"=>"xai","fireworks"=>"fireworks","cerebras"=>"cerebras","hooshgar"=>"hooshgar","avalai"=>"avalai","openai"=>"openai","openrouter"=>"openrouter","deepseek"=>"deepseek","groq"=>"groq","together"=>"together","ollama"=>"ollama",_=>"lmstudio"},
            name,region,key_configured:key.is_empty()||env::var(key).is_ok_and(|v|!v.trim().is_empty())
        })).collect()
}
#[tauri::command]
async fn ai_chat(provider:String,model:String,message:String)->Result<String,String>{
    let (_,_,endpoint,key_name)=provider_details(&provider).ok_or("ارائه‌دهنده معتبر نیست")?;
    if model.trim().is_empty() || model.len()>160 {return Err("نام مدل را وارد کنید".into());}
    if message.trim().is_empty() || message.len()>10000 {return Err("متن پیام باید بین ۱ تا ۱۰۰۰۰ نویسه باشد".into());}
    let key=if key_name.is_empty(){String::new()}else{env::var(key_name).map_err(|_|format!("متغیر محیطی {} تنظیم نشده است",key_name))?};
    let client=reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(70))
        .redirect(reqwest::redirect::Policy::none())
        .build().map_err(|_|"ساخت اتصال ناموفق بود")?;
    let request=client.post(endpoint).json(&serde_json::json!({
        "model":model,
        "stream":false,
        "messages":[
            {"role":"system","content":"شما کیو، یک دستیار فارسی برای برنامه نویسی هستید. پاسخ‌های دقیق و روشن بدهید و درباره اجرای کاری که واقعاً انجام نداده‌اید ادعا نکنید."},
            {"role":"user","content":message}
        ]
    }));
    let request=if key_name.is_empty(){request}else{request.bearer_auth(key)};
    let response=request.send().await.map_err(|_|"ارتباط با سرویس برقرار نشد")?;
    let status=response.status();
    if !status.is_success(){return Err(format!("پاسخ سرویس ناموفق بود (HTTP {})",status.as_u16()));}
    let data:serde_json::Value=response.json().await.map_err(|_|"پاسخ سرویس قابل خواندن نبود")?;
    data.pointer("/choices/0/message/content").and_then(|v|v.as_str())
        .map(|s|s.chars().take(30000).collect())
        .ok_or_else(||"این مدل پاسخ متنی قابل‌نمایش برنگرداند".into())
}


#[tauri::command]
fn qio_hook_events() -> Vec<RecentEvent> {
    use std::io::{BufRead,BufReader,Seek,SeekFrom};
    let Some(home)=env::var_os("USERPROFILE").or_else(||env::var_os("HOME")).map(PathBuf::from) else{return vec![]};
    let path=home.join(".qio/events.jsonl");
    let Ok(mut file)=fs::File::open(path) else{return vec![]};
    let Ok(size)=file.metadata().map(|m|m.len()) else{return vec![]};
    let start=size.saturating_sub(262144);
    if file.seek(SeekFrom::Start(start)).is_err(){return vec![]}
    let mut lines=BufReader::new(file).lines();
    if start>0 {let _=lines.next();}
    let mut events=std::collections::VecDeque::with_capacity(30);
    for line in lines.map_while(Result::ok).take(3000){
        if line.len()>4096{continue}
        let Ok(event)=serde_json::from_str::<serde_json::Value>(&line) else{continue};
        let kind=event.get("kind").and_then(|v|v.as_str()).unwrap_or("");
        let agent=match event.get("agent").and_then(|v|v.as_str()).unwrap_or("") {
            "Claude Code"=>"Claude Code","Codex"=>"Codex","Gemini CLI"=>"Gemini CLI",
            "OpenCode"=>"OpenCode","Cursor"=>"Cursor",_=>"Other",
        };
        let (kind,label)=match kind {
            "SessionStart"=>("session","نشست جدید آغاز شد"),
            "UserPromptSubmit"=>("thinking","درخواست جدید ثبت شد"),
            "PreToolUse"=>("tool-start","ابزار در حال اجرا"),
            "PostToolUse"=>("tool-result","ابزار اجرا شد؛ نتیجه تست تأیید نشده"),
            "PostToolUseFailure"=>("error","اجرای ابزار با خطا مواجه شد"),
            "Stop"=>("complete","عامل متوقف شد"),
            "Notification"=>("alert","اعلان عامل ثبت شد"),
            "SubagentStart"=>("activity","عامل فرعی شروع شد"),
            "SubagentStop"=>("complete","عامل فرعی پایان یافت"),
            _=>continue,
        };
        let timestamp=event.get("at").and_then(|v|v.as_u64()).unwrap_or(0)/1000;
        events.push_back(RecentEvent{agent,kind:kind.to_string(),label:label.to_string(),observed_at:timestamp});
        if events.len()>30{events.pop_front();}
    }
    events.into_iter().collect()
}


#[derive(Serialize)]
struct TestEvidence {
    status: String,
    source: String,
    at: u64,
    freshness: &'static str,
}
#[tauri::command]
fn latest_test_evidence()->Option<TestEvidence>{
    use std::io::{BufRead,BufReader,Seek,SeekFrom};
    let home=env::var_os("USERPROFILE").or_else(||env::var_os("HOME")).map(PathBuf::from)?;
    let mut file=fs::File::open(home.join(".qio/test-results.jsonl")).ok()?;
    let length=file.metadata().ok()?.len();
    let start=length.saturating_sub(32768);
    file.seek(SeekFrom::Start(start)).ok()?;
    let mut lines=BufReader::new(file).lines();
    if start>0{lines.next();}
    let mut latest=None;
    for line in lines.map_while(Result::ok).take(500){
        let Ok(value)=serde_json::from_str::<serde_json::Value>(&line) else {continue};
        if value.get("source").and_then(|v|v.as_str())!=Some("qio-test-runner"){continue}
        let exit=value.get("exit_code").and_then(|v|v.as_i64());
        let status=match exit{Some(0)=>"passed",Some(_)=>"failed",None=>"unclear"};
        latest=Some(TestEvidence{status:status.into(),source:"qio-test-runner".into(),
            at:value.get("at").and_then(|v|v.as_u64()).unwrap_or(0),
            freshness:"not-checked-against-current-code"});
    }
    latest
}


#[derive(Serialize)]
struct PendingApproval {
    id: String,
    tool: String,
    preview: String,
    expires_at: u64,
}
fn qio_root()->Option<PathBuf>{
    env::var_os("USERPROFILE").or_else(||env::var_os("HOME")).map(PathBuf::from).map(|h|h.join(".qio"))
}
#[tauri::command]
fn qio_heartbeat() -> Result<(),String> {
    let root=qio_root().ok_or("پوشه کاربر پیدا نشد")?;
    fs::create_dir_all(&root).map_err(|e|e.to_string())?;
    let now=SystemTime::now().duration_since(UNIX_EPOCH).map_err(|e|e.to_string())?.as_secs();
    fs::write(root.join("heartbeat"),now.to_string()).map_err(|e|e.to_string())
}
#[tauri::command]
fn qio_pending_approvals()->Vec<PendingApproval>{
    let Some(root)=qio_root() else{return vec![]};
    let directory=root.join("approvals");
    let now=SystemTime::now().duration_since(UNIX_EPOCH).map(|d|d.as_millis() as u64).unwrap_or(0);
    let Ok(entries)=fs::read_dir(directory) else {return vec![]};
    let mut result=vec![];
    for item in entries.flatten().take(60){
        let path=item.path();
        if !path.file_name().and_then(|x|x.to_str()).is_some_and(|s|s.ends_with(".request.json")){continue}
        let Ok(raw)=fs::read_to_string(&path) else{continue};
        if raw.len()>4096{continue}
        let Ok(v)=serde_json::from_str::<serde_json::Value>(&raw) else{continue};
        let id=v.get("id").and_then(|x|x.as_str()).unwrap_or("");
        if id.len()!=36 || !id.bytes().all(|b|b.is_ascii_hexdigit()||b==b'-'){continue}
        let expires_at=v.get("expires_at").and_then(|x|x.as_u64()).unwrap_or(0);
        if expires_at<=now{continue}
        result.push(PendingApproval{
            id:id.into(),
            tool:v.get("tool").and_then(|x|x.as_str()).unwrap_or("").chars().take(100).collect(),
            preview:v.get("preview").and_then(|x|x.as_str()).unwrap_or("").chars().take(450).collect(),
            expires_at,
        });
    }
    result
}
#[tauri::command]
fn qio_decide_approval(id:String,decision:String)->Result<(),String>{
    if id.len()!=36 || !id.bytes().all(|b|b.is_ascii_hexdigit()||b==b'-'){return Err("شناسه نامعتبر است".into())}
    if decision!="allow" && decision!="deny"{return Err("تصمیم نامعتبر است".into())}
    let directory=qio_root().ok_or("پوشه کاربر پیدا نشد")?.join("approvals");
    let request=directory.join(format!("{id}.request.json"));
    let raw=fs::read_to_string(&request).map_err(|_|"درخواست دیگر معتبر نیست")?;
    let v:serde_json::Value=serde_json::from_str(&raw).map_err(|_|"درخواست معتبر نیست")?;
    if v.get("id").and_then(|x|x.as_str())!=Some(id.as_str()){return Err("شناسه درخواست تطبیق ندارد".into())}
    let expires_at=v.get("expires_at").and_then(|x|x.as_u64()).unwrap_or(0);
    let now=SystemTime::now().duration_since(UNIX_EPOCH).map_err(|e|e.to_string())?.as_millis() as u64;
    if now>=expires_at{return Err("مهلت درخواست تمام شده".into())}
    let path=directory.join(format!("{id}.answer.json"));
    let payload=serde_json::json!({"id":id,"decision":decision});
    let mut file=fs::OpenOptions::new().create_new(true).write(true).open(path).map_err(|_|"این درخواست قبلاً پاسخ داده شده")?;
    use std::io::Write;
    file.write_all(payload.to_string().as_bytes()).map_err(|e|e.to_string())
}

#[tauri::command]
fn set_island_expanded(window: tauri::Window,expanded: bool)->Result<(),String>{
    // Preserve the position chosen by the user. Only change the content size.
    let (w,h)=if expanded{(390.0,610.0)}else{(300.0,420.0)};
    window.set_size(Size::Logical(LogicalSize::new(w,h))).map_err(|e|e.to_string())?;
    window.set_always_on_top(true).map_err(|e|e.to_string())?;
    Ok(())
}
#[tauri::command]
fn drag_island(window:tauri::Window)->Result<(),String>{window.start_dragging().map_err(|e|e.to_string())}
#[tauri::command]
fn quit_qio(app:tauri::AppHandle){app.exit(0);}
#[cfg_attr(mobile,tauri::mobile_entry_point)]
pub fn run(){
    tauri::Builder::default()
      .plugin(tauri_plugin_notification::init())
      .invoke_handler(tauri::generate_handler![set_island_expanded,drag_island,quit_qio,local_agent_status,recent_agent_events,qio_hook_events,latest_test_evidence,qio_heartbeat,qio_pending_approvals,qio_decide_approval,ai_providers,ai_chat])
      .setup(|app|{
         let show=MenuItem::with_id(app,"show","نمایش کیو",true,None::<&str>)?;
         let hide=MenuItem::with_id(app,"hide","پنهان کردن",true,None::<&str>)?;
         let quit=MenuItem::with_id(app,"quit","خروج",true,None::<&str>)?;
         let menu=Menu::with_items(app,&[&show,&hide,&quit])?;
         let mut tray=TrayIconBuilder::new().menu(&menu).show_menu_on_left_click(false)
           .on_menu_event(|app,event|{
               match event.id.as_ref(){
                   "quit"=>app.exit(0),
                   "show"=>{if let Some(w)=app.get_webview_window("main"){let _=w.show();let _=w.set_focus();}},
                   "hide"=>{if let Some(w)=app.get_webview_window("main"){let _=w.hide();}},
                   _=>{}
               }
           });
         if let Some(icon)=app.default_window_icon(){tray=tray.icon(icon.clone());}
         tray.build(app)?;
         let window=app.get_webview_window("main").expect("main window missing");
         window.set_always_on_top(true)?;
         if let Some(monitor)=window.current_monitor()? {
             let size=monitor.size();
             let pos=monitor.position();
             let width=(300.0 * monitor.scale_factor()).round() as i32;
             window.set_position(PhysicalPosition::new(
                 pos.x+(size.width as i32-width)/2,
                 pos.y+12
             ))?;
         }
         Ok(())
      })
      .run(tauri::generate_context!())
      .expect("failed to start Qio");
}
