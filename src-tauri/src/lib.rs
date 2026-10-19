use std::{env,fs,path::{Path,PathBuf},time::{SystemTime,UNIX_EPOCH}};
use tauri::{Manager,PhysicalPosition,LogicalSize,Size};
use tauri::menu::{Menu,MenuItem};
use tauri::tray::TrayIconBuilder;
use serde::{Deserialize,Serialize};

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
fn newest_qio_event(home: &Path, agent: &str) -> Option<u64> {
    let path = home.join(".qio").join("events.jsonl");
    use std::io::{Read, Seek, SeekFrom};
    let mut file = fs::File::open(path).ok()?;
    let length = file.metadata().ok()?.len();
    const MAX_TAIL_BYTES: u64 = 1_048_576;
    if length > MAX_TAIL_BYTES {
        file.seek(SeekFrom::End(-(MAX_TAIL_BYTES as i64))).ok()?;
    }
    let mut bytes = Vec::with_capacity(MAX_TAIL_BYTES as usize);
    file.take(MAX_TAIL_BYTES).read_to_end(&mut bytes).ok()?;
    // A seek can start in the middle of a UTF-8 character; lossy decoding keeps valid JSON lines usable.
    let content = String::from_utf8_lossy(&bytes);
    let mut latest = None;
    for line in content.lines().rev().take(5000) {
        if line.len() > 16_384 { continue; }
        if let Ok(value) = serde_json::from_str::<serde_json::Value>(line) {
            if value.get("agent").and_then(|v| v.as_str()) == Some(agent) {
                if let Some(at) = value.get("at").and_then(|v| v.as_u64()) {
                    let seconds = at / 1000;
                    if latest.map_or(true, |old| seconds > old) { latest = Some(seconds); }
                }
            }
        }
    }
    latest
}
#[tauri::command]
fn local_agent_status() -> Vec<AgentStatus> {
    let home = env::var_os("USERPROFILE").or_else(||env::var_os("HOME")).map(PathBuf::from);
    let choices = [
        ("Codex","~/.codex/sessions",".codex/sessions",None,None),
        ("Claude Code","~/.claude/projects",".claude/projects",Some(".claude/settings.json"),Some("qio-hook.mjs")),
        ("Cursor","~/.cursor/hooks.json",".cursor/hooks.json",Some(".cursor/hooks.json"),Some("qio-hook.mjs")),
        ("Qoder","~/.qoder/settings.json",".qoder/settings.json",Some(".qoder/settings.json"),Some("qio-qoder-hook.mjs")),
        // These are read-only history discovery for now; do not imply Qio hooks are installed.
        ("Gemini CLI","~/.gemini/tmp",".gemini/tmp",None,None),
        ("OpenCode","~/.local/share/opencode/storage",".local/share/opencode/storage",None,None)
    ];
    choices.iter().map(|&(name,source,relative,config_relative,marker)|{
        let path = home.as_ref().map(|h|h.join(relative));
        let config_path = home.as_ref().and_then(|h|config_relative.map(|r|h.join(r)));
        let hook_configured = config_path.as_ref().and_then(|p|fs::read_to_string(p).ok())
            .is_some_and(|contents|marker.is_some_and(|needle|contents.contains(needle)));
        let path_is_dir = path.as_ref().is_some_and(|p|p.is_dir());
        let path_is_file = path.as_ref().is_some_and(|p|p.is_file());
        let history = path.as_ref().filter(|p|p.is_dir()).and_then(|p|newest_file(p,7))
            .and_then(|t|t.duration_since(UNIX_EPOCH).ok()).map(|d|d.as_secs());
        let hook_event = home.as_ref().and_then(|h|newest_qio_event(h,name));
        let last = match (history, hook_event) {
            (Some(a),Some(b)) => Some(a.max(b)),
            (Some(a),None) => Some(a),
            (None,Some(b)) => Some(b),
            (None,None) => None,
        };
        let now = SystemTime::now().duration_since(UNIX_EPOCH).ok().map(|d|d.as_secs()).unwrap_or(0);
        let age = last.map(|at|now.saturating_sub(at));
        let detected = last.is_some() || hook_configured || path_is_dir || path_is_file;
        let state = if age.is_some_and(|seconds|seconds <= 120) {"active-event"}
            else if age.is_some_and(|seconds|seconds <= 1800) {"recent-event"}
            else if history.is_some() {"history-found"}
            else if hook_configured {"hooks-configured"}
            else if path_is_file {"config-found"}
            else if path_is_dir {"directory-found"}
            else {"not-found"};
        AgentStatus{name,source,detected,last_event_unix:last,state}
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
        "gemini" => Some(("Google Gemini","بین‌المللی","https://generativelanguage.googleapis.com/v1beta/openai/chat/completions","GEMINI_API_KEY")),
        "perplexity" => Some(("Perplexity AI","بین‌المللی","https://api.perplexity.ai/chat/completions","PERPLEXITY_API_KEY")),
        "sambanova" => Some(("SambaNova","بین‌المللی","https://api.sambanova.ai/v1/chat/completions","SAMBANOVA_API_KEY")),
        "nvidia" => Some(("NVIDIA NIM","بین‌المللی","https://integrate.api.nvidia.com/v1/chat/completions","NVIDIA_API_KEY")),
        "siliconflow" => Some(("SiliconFlow","بین‌المللی","https://api.siliconflow.com/v1/chat/completions","SILICONFLOW_API_KEY")),
        "huggingface" => Some(("Hugging Face","بین‌المللی","https://router.huggingface.co/v1/chat/completions","HF_TOKEN")),
        "githubmodels" => Some(("GitHub Models","بین‌المللی","https://models.github.ai/inference/chat/completions","GITHUB_TOKEN")),
        "cohere" => Some(("Cohere","بین‌المللی","https://api.cohere.com/compatibility/v1/chat/completions","COHERE_API_KEY")),
        "novita" => Some(("Novita AI","بین‌المللی","https://api.novita.ai/v3/openai/chat/completions","NOVITA_API_KEY")),
        "anthropic" => Some(("Claude (Anthropic API)","بین‌المللی","https://api.anthropic.com/v1/messages","ANTHROPIC_API_KEY")),
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
    ["anthropic","mistral","xai","fireworks","cerebras","hooshgar","gemini","perplexity","sambanova","nvidia","siliconflow","huggingface","githubmodels","cohere","novita","avalai","openai","openrouter","deepseek","groq","together","ollama","lmstudio"]
        .iter().filter_map(|id|provider_details(id).map(|(name,region,_,key)|ProviderInfo {
            id:match *id {"anthropic"=>"anthropic","mistral"=>"mistral","xai"=>"xai","fireworks"=>"fireworks","cerebras"=>"cerebras","hooshgar"=>"hooshgar","gemini"=>"gemini","perplexity"=>"perplexity","sambanova"=>"sambanova","nvidia"=>"nvidia","siliconflow"=>"siliconflow","huggingface"=>"huggingface","githubmodels"=>"githubmodels","cohere"=>"cohere","novita"=>"novita","avalai"=>"avalai","openai"=>"openai","openrouter"=>"openrouter","deepseek"=>"deepseek","groq"=>"groq","together"=>"together","ollama"=>"ollama",_=>"lmstudio"},
            name,region,key_configured:key.is_empty()||env::var(key).is_ok_and(|v|!v.trim().is_empty())
        })).collect()
}
#[tauri::command]
async fn ai_models(provider:String)->Result<Vec<String>,String>{
    let (_,_,endpoint,key_name)=provider_details(&provider).ok_or("ارائه‌دهنده معتبر نیست")?;
    let key=if key_name.is_empty(){String::new()}else{env::var(key_name).map_err(|_|format!("متغیر محیطی {} تنظیم نشده است",key_name))?};
    let models_url=if provider=="anthropic" {"https://api.anthropic.com/v1/models".to_string()}
    else if let Some(base)=endpoint.strip_suffix("chat/completions"){format!("{}models",base)}
    else{return Err("فهرست مدل برای این endpoint پشتیبانی نمی‌شود؛ شناسه مدل را دستی وارد کنید".into())};
    let client=reqwest::Client::builder().timeout(std::time::Duration::from_secs(12))
        .redirect(reqwest::redirect::Policy::none()).build().map_err(|_|"ساخت اتصال ناموفق بود")?;
    let mut request=client.get(models_url);
    if provider=="anthropic" && !key.is_empty(){request=request.header("x-api-key",key.as_str()).header("anthropic-version","2023-06-01");}
    else if !key.is_empty(){request=request.bearer_auth(key);}
    let response=request.send().await.map_err(|_|"دریافت فهرست مدل‌ها ناموفق بود؛ سرور و اتصال را بررسی کنید")?;
    if !response.status().is_success(){return Err(format!("سرویس فهرست مدل‌ها پاسخ ناموفق داد (HTTP {})",response.status().as_u16()))}
    let data:serde_json::Value=response.json().await.map_err(|_|"پاسخ فهرست مدل‌ها قابل خواندن نیست")?;
    let items=data.get("data").and_then(|v|v.as_array()).or_else(||data.get("models").and_then(|v|v.as_array()));
    let mut models:Vec<String>=items.into_iter().flatten().filter_map(|v|{
        v.get("id").or_else(||v.get("name")).and_then(|x|x.as_str())
            .map(|s|s.trim().to_string()).filter(|s|!s.is_empty()&&s.len()<=160)
    }).take(250).collect();
    models.sort();models.dedup();
    if models.is_empty(){return Err("سرویس فهرست مدل قابل انتخابی برنگرداند؛ شناسه مدل را دستی وارد کنید".into())}
    Ok(models)
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
    let request = if provider == "anthropic" {
        client.post(endpoint)
            .header("x-api-key", key.as_str())
            .header("anthropic-version", "2023-06-01")
            .json(&serde_json::json!({
                "model":model,
                "max_tokens":4096,
                "system":"شما کیو، یک دستیار فارسی برای برنامه نویسی هستید. پاسخ‌های دقیق و روشن بدهید و درباره اجرای کاری که واقعاً انجام نداده‌اید ادعا نکنید.",
                "messages":[{"role":"user","content":message}]
            }))
    } else {
        let request = client.post(endpoint).json(&serde_json::json!({
            "model":model,
            "stream":false,
            "messages":[
                {"role":"system","content":"شما کیو، یک دستیار فارسی برای برنامه نویسی هستید. پاسخ‌های دقیق و روشن بدهید و درباره اجرای کاری که واقعاً انجام نداده‌اید ادعا نکنید."},
                {"role":"user","content":message}
            ]
        }));
        if key_name.is_empty(){request}else{request.bearer_auth(key)}
    };
    let response=request.send().await.map_err(|_|"ارتباط با سرویس برقرار نشد")?;
    let status=response.status();
    if !status.is_success(){return Err(format!("پاسخ سرویس ناموفق بود (HTTP {})",status.as_u16()));}
    let data:serde_json::Value=response.json().await.map_err(|_|"پاسخ سرویس قابل خواندن نبود")?;
    let content = if provider == "anthropic" {
        data.pointer("/content/0/text").and_then(|v|v.as_str())
    } else {
        data.pointer("/choices/0/message/content").and_then(|v|v.as_str())
    };
    content.map(|s|s.chars().take(30000).collect())
        .ok_or_else(||"این مدل پاسخ متنی قابل‌نمایش برنگرداند".into())
}


#[tauri::command]
fn qio_event_logging_enabled()->bool{
    let Some(home)=env::var_os("USERPROFILE").or_else(||env::var_os("HOME")).map(PathBuf::from) else{return false};
    match fs::read_to_string(home.join(".qio/settings.json")){
        Ok(raw)=>serde_json::from_str::<serde_json::Value>(&raw).ok()
            .and_then(|v|v.get("event_logging_enabled").and_then(|x|x.as_bool())).unwrap_or(true),
        Err(error) if error.kind()==std::io::ErrorKind::NotFound=>true,
        Err(_)=>false,
    }
}
#[tauri::command]
fn qio_set_event_logging(enabled:bool)->Result<bool,String>{
    let home=env::var_os("USERPROFILE").or_else(||env::var_os("HOME")).map(PathBuf::from).ok_or("پوشه کاربر پیدا نشد")?;
    let directory=home.join(".qio");
    fs::create_dir_all(&directory).map_err(|e|e.to_string())?;
    let path=directory.join("settings.json");
    let mut settings=match fs::read_to_string(&path){
        Ok(raw)=>serde_json::from_str::<serde_json::Value>(&raw).map_err(|_|"تنظیمات حریم خصوصی معتبر نیست")?,
        Err(error) if error.kind()==std::io::ErrorKind::NotFound=>serde_json::json!({}),
        Err(error)=>return Err(error.to_string()),
    };
    if !settings.is_object(){return Err("ساختار تنظیمات معتبر نیست".into())}
    settings["event_logging_enabled"]=serde_json::json!(enabled);
    let temp=directory.join("settings.json.tmp");
    let encoded=serde_json::to_vec_pretty(&settings).map_err(|e|e.to_string())?;
    fs::write(&temp,encoded).map_err(|e|e.to_string())?;
    if path.exists(){fs::remove_file(&path).map_err(|e|e.to_string())?}
    fs::rename(&temp,&path).map_err(|e|e.to_string())?;
    Ok(enabled)
}

#[tauri::command]
fn qio_clear_hook_events()->Result<(),String>{
    let Some(home)=env::var_os("USERPROFILE").or_else(||env::var_os("HOME")).map(PathBuf::from) else{return Err("پوشه کاربر پیدا نشد".into())};
    let path=home.join(".qio/events.jsonl");
    match fs::remove_file(path){
        Ok(())=>Ok(()),
        Err(error) if error.kind()==std::io::ErrorKind::NotFound=>Ok(()),
        Err(error)=>Err(format!("پاک‌کردن تاریخچه انجام نشد: {error}")),
    }
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
            "OpenCode"=>"OpenCode","Cursor"=>"Cursor","Qoder"=>"Qoder",_=>"Other",
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
    diff_preview: Option<String>,
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
            diff_preview:v.get("diff_preview").and_then(|x|x.as_str()).map(|s|s.chars().take(1800).collect()),
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

#[derive(Serialize,Deserialize)]
struct GithubRun { id:u64, name:String, status:String, conclusion:Option<String>, html_url:String, created_at:String, run_number:u64, head_sha:String }
#[derive(Deserialize)]
struct GithubRunsResponse { workflow_runs:Vec<GithubRun> }
#[derive(Serialize)]
struct SystemSnapshot { cpu_usage_percent:f32, memory_used_bytes:u64, memory_total_bytes:u64, disks:Vec<DiskSnapshot>, network_received_bytes:u64, network_transmitted_bytes:u64 }
#[derive(Serialize)]
struct DiskSnapshot { name:String, total_bytes:u64, available_bytes:u64 }
#[tauri::command]
fn system_snapshot() -> Result<SystemSnapshot,String> {
 let mut system=sysinfo::System::new(); system.refresh_cpu_usage(); system.refresh_memory();
 let cpu_usage_percent=system.global_cpu_usage().clamp(0.0,100.0);
 let memory_total_bytes=system.total_memory(); let memory_used_bytes=system.used_memory();
 let disks=sysinfo::Disks::new_with_refreshed_list().iter().take(32).map(|d|DiskSnapshot{name:d.name().to_string_lossy().chars().take(120).collect(),total_bytes:d.total_space(),available_bytes:d.available_space()}).collect();
 let networks=sysinfo::Networks::new_with_refreshed_list();
 let network_received_bytes=networks.iter().fold(0_u64,|sum,(_,n)|sum.saturating_add(n.total_received()));
 let network_transmitted_bytes=networks.iter().fold(0_u64,|sum,(_,n)|sum.saturating_add(n.total_transmitted()));
 Ok(SystemSnapshot{cpu_usage_percent,memory_used_bytes,memory_total_bytes,disks,network_received_bytes,network_transmitted_bytes})
}

#[tauri::command]
async fn github_actions_status()->Result<Vec<GithubRun>,String>{
 let client=reqwest::Client::builder().user_agent("Qio-Desktop-App").timeout(std::time::Duration::from_secs(12)).build().map_err(|e|e.to_string())?;
 let response=client.get("https://api.github.com/repos/sahandse/Qio/actions/runs?per_page=8").header("Accept","application/vnd.github+json").send().await.map_err(|e|format!("اتصال به GitHub برقرار نشد: {e}"))?;
 if !response.status().is_success(){return Err(format!("GitHub API پاسخ {} داد؛ کمی بعد دوباره تلاش کن.",response.status()));}
 let payload=response.json::<GithubRunsResponse>().await.map_err(|e|format!("پاسخ GitHub قابل‌خواندن نبود: {e}"))?;
 Ok(payload.workflow_runs)
}
#[tauri::command]
fn set_island_expanded(window: tauri::Window,expanded: bool)->Result<(),String>{
    // Preserve the position chosen by the user. Only change the content size.
    let (w,h)=if expanded{(390.0,610.0)}else{(300.0,240.0)};
    window.set_size(Size::Logical(LogicalSize::new(w,h))).map_err(|e|e.to_string())?;
    window.set_always_on_top(true).map_err(|e|e.to_string())?;
    Ok(())
}
#[tauri::command]
fn set_mini_mode(window: tauri::Window, enabled: bool) -> Result<(), String> {
    let (w,h) = if enabled {(150.0,165.0)} else {(300.0,240.0)};
    window.set_size(Size::Logical(LogicalSize::new(w,h))).map_err(|e|e.to_string())?;
    window.set_always_on_top(true).map_err(|e|e.to_string())
}
#[tauri::command]
fn drag_island(window:tauri::Window)->Result<(),String>{window.start_dragging().map_err(|e|e.to_string())}
#[tauri::command]
fn quit_qio(app:tauri::AppHandle){app.exit(0);}
#[cfg_attr(mobile,tauri::mobile_entry_point)]
pub fn run(){
    tauri::Builder::default()
      .plugin(tauri_plugin_notification::init())
      .plugin(tauri_plugin_opener::init())
      .invoke_handler(tauri::generate_handler![set_island_expanded,set_mini_mode,drag_island,quit_qio,local_agent_status,recent_agent_events,qio_hook_events,latest_test_evidence,qio_heartbeat,qio_clear_hook_events,qio_pending_approvals,qio_decide_approval,qio_event_logging_enabled,qio_set_event_logging,ai_providers,ai_models,ai_chat,github_actions_status,system_snapshot])
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
