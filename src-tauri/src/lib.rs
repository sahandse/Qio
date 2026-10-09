use std::{env,fs,path::{Path,PathBuf},time::{SystemTime,UNIX_EPOCH}};
use tauri::{Manager,PhysicalPosition,LogicalSize,Size};
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
            let kind=match event_type {
                "session_meta" => "session",
                "assistant" | "response_item" => "activity",
                "tool_result" => "tool-result",
                "event_msg" => "activity",
                _ => continue,
            };
            ring.push_back(RecentEvent{agent,kind:kind.into(),label:match kind{
                "session"=>"نشست شناسایی شد",
                "tool-result"=>"پاسخ ابزار ثبت شد",
                _=>"فعالیت ثبت شد",
            }.into(),observed_at:timestamp});
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
struct BridgeSnapshot {
    connected: bool,
    source: &'static str,
    activities: Vec<BridgeActivity>,
    message: String,
}
#[derive(Serialize)]
struct BridgeActivity {
    title: String,
    kind: String,
    at: Option<u64>,
}
fn allowed_short(value:&str)->String { value.chars().filter(|c|!c.is_control()).take(100).collect() }
#[tauri::command]
fn dotpals_snapshot()->BridgeSnapshot {
    use std::io::{Read,Write};
    use std::net::{TcpStream,ToSocketAddrs};
    use std::time::Duration;
    let mut result=BridgeSnapshot{connected:false,source:"dotpals-local",activities:vec![],message:"پل محلی DotPals پیدا نشد".into()};
    // A fixed loopback address avoids accessing remote services or user-controlled URLs.
    let Some(addr)=("127.0.0.1",5175).to_socket_addrs().ok().and_then(|mut a|a.next()) else {return result};
    let Ok(mut stream)=TcpStream::connect_timeout(&addr,Duration::from_millis(400)) else {return result};
    let _=stream.set_read_timeout(Some(Duration::from_millis(800)));
    let _=stream.set_write_timeout(Some(Duration::from_millis(800)));
    if stream.write_all(b"GET /api/activity HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n").is_err(){return result}
    let mut bytes=Vec::new();let mut limited=stream.take(524288);
    if limited.read_to_end(&mut bytes).is_err(){return result}
    let response=String::from_utf8_lossy(&bytes);
    let Some((header,body))=response.split_once("\r\n\r\n") else{return result};
    if !header.starts_with("HTTP/1.1 200") && !header.starts_with("HTTP/1.0 200"){return result}
    let decoded = if header.to_ascii_lowercase().contains("transfer-encoding: chunked") {
        let mut payload=Vec::new();
        let mut rest=body.as_bytes();
        loop {
            let Some(index)=rest.windows(2).position(|x|x==b"\r\n") else {return result};
            let Ok(size)=std::str::from_utf8(&rest[..index]).ok().and_then(|v|usize::from_str_radix(v.split(';').next().unwrap_or(""),16).ok()).ok_or(()) else{return result};
            rest=&rest[index+2..];
            if size==0{break}
            if rest.len()<size+2{return result}
            payload.extend_from_slice(&rest[..size]);
            rest=&rest[size+2..];
        }
        String::from_utf8_lossy(&payload).into_owned()
    } else {body.to_owned()};
    let Ok(parsed)=serde_json::from_str::<serde_json::Value>(&decoded) else{return result};
    let Some(entries)=parsed.get("entries").and_then(|v|v.as_array()) else{return result};
    result.connected=true;
    result.message="DotPals محلی متصل است".into();
    for entry in entries.iter().rev().take(12) {
        let kind=entry.get("kind").and_then(|v|v.as_str()).unwrap_or("activity");
        let title=entry.get("title").and_then(|v|v.as_str()).unwrap_or("فعالیت ثبت‌شده");
        let at=entry.get("at").and_then(|v|v.as_u64());
        // Display labels only; ignore tool arguments, paths, outputs and prompts.
        result.activities.push(BridgeActivity{kind:allowed_short(kind),title:allowed_short(title),at});
    }
    result
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
    ["avalai","openai","openrouter","deepseek","groq","together","ollama","lmstudio"]
        .iter().filter_map(|id|provider_details(id).map(|(name,region,_,key)|ProviderInfo {
            id:match *id {"avalai"=>"avalai","openai"=>"openai","openrouter"=>"openrouter","deepseek"=>"deepseek","groq"=>"groq","together"=>"together","ollama"=>"ollama",_=>"lmstudio"},
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
fn set_island_expanded(window: tauri::Window,expanded: bool)->Result<(),String>{
    let(w,h)=if expanded{(390.0,610.0)}else{(300.0,420.0)};
    window.set_size(Size::Logical(LogicalSize::new(w,h))).map_err(|e|e.to_string())?;
    window.set_always_on_top(true).map_err(|e|e.to_string())?;
    if let Some(monitor)=window.current_monitor().map_err(|e|e.to_string())? {
        let size=monitor.size(); let pos=monitor.position(); let scale=monitor.scale_factor();
        let width=(w*scale).round() as i32;
        window.set_position(PhysicalPosition::new(pos.x+(size.width as i32-width)/2,pos.y+10)).map_err(|e|e.to_string())?;
    }
    Ok(())
}
#[tauri::command]
fn drag_island(window:tauri::Window)->Result<(),String>{window.start_dragging().map_err(|e|e.to_string())}
#[tauri::command]
fn quit_qio(app:tauri::AppHandle){app.exit(0);}
#[cfg_attr(mobile,tauri::mobile_entry_point)]
pub fn run(){
    tauri::Builder::default()
      .invoke_handler(tauri::generate_handler![set_island_expanded,drag_island,quit_qio,local_agent_status,recent_agent_events,dotpals_snapshot,ai_providers,ai_chat])
      .setup(|app|{
         let window=app.get_webview_window("main").expect("main window missing");
         window.set_always_on_top(true)?;
         Ok(())
      })
      .run(tauri::generate_context!())
      .expect("failed to start Qio");
}
