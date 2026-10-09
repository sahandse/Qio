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
      .invoke_handler(tauri::generate_handler![set_island_expanded,drag_island,quit_qio,local_agent_status])
      .setup(|app|{
         let window=app.get_webview_window("main").expect("main window missing");
         window.set_always_on_top(true)?;
         Ok(())
      })
      .run(tauri::generate_context!())
      .expect("failed to start Qio");
}
