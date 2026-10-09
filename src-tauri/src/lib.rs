use tauri::{Manager, PhysicalPosition, LogicalSize, Size};
#[tauri::command]
fn set_island_expanded(window: tauri::Window, expanded: bool) -> Result<(), String> {
    let (w, h) = if expanded { (390.0, 610.0) } else { (300.0, 450.0) };
    window.set_size(Size::Logical(LogicalSize::new(w, h))).map_err(|e| e.to_string())?;
    window.set_always_on_top(true).map_err(|e| e.to_string())?;
    if let Some(monitor) = window.current_monitor().map_err(|e| e.to_string())? {
        let size = monitor.size();
        let pos = monitor.position();
        let scale = monitor.scale_factor();
        let width = (w * scale).round() as i32;
        let x = pos.x + (size.width as i32 - width) / 2;
        window.set_position(PhysicalPosition::new(x, pos.y + 10)).map_err(|e| e.to_string())?;
    }
    Ok(())
}
#[tauri::command]
fn drag_island(window: tauri::Window) -> Result<(), String> {
    window.start_dragging().map_err(|e| e.to_string())
}
#[tauri::command]
fn quit_qio(app: tauri::AppHandle) {
    app.exit(0);
}
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![set_island_expanded, drag_island, quit_qio])
        .setup(|app| {
            let window = app.get_webview_window("main").expect("main window missing");
            window.set_always_on_top(true)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to start Qio");
}
