//! Productivitree para Mac.
//!
//! The web app runs unchanged inside the window. This shell adds what a browser tab
//! cannot do: keep the tree in a file on the Mac, receive `productivitree://` activity
//! links from other apps, and listen to a global keyboard shortcut for quick logging.
//! Nothing here talks to the network.

use std::fs;
use std::io::ErrorKind;
use std::path::PathBuf;

use tauri::{AppHandle, Emitter, Manager, WindowEvent};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use tauri_plugin_opener::OpenerExt;

const STATE_FILE: &str = "productivitree.json";
const BACKUP_FILE: &str = "productivitree.anterior.json";
const MAIN_WINDOW: &str = "main";
/// Event sent to the page when the quick-log shortcut (⌃⌥R) is pressed.
const QUICK_LOG_EVENT: &str = "riego-rapido";

fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| format!("No puedo crear la carpeta de datos: {e}"))?;
    Ok(dir)
}

/// Reads the saved tree. `None` the first time the app runs.
#[tauri::command]
fn load_state(app: AppHandle) -> Result<Option<String>, String> {
    let path = data_dir(&app)?.join(STATE_FILE);
    match fs::read_to_string(&path) {
        Ok(text) => Ok(Some(text)),
        Err(e) if e.kind() == ErrorKind::NotFound => Ok(None),
        Err(e) => Err(format!("No puedo leer {}: {e}", path.display())),
    }
}

/// Saves the tree atomically: write a temp file, keep the previous copy, then rename.
#[tauri::command]
fn save_state(app: AppHandle, json: String) -> Result<(), String> {
    serde_json::from_str::<serde_json::Value>(&json).map_err(|e| format!("Datos no válidos: {e}"))?;
    let dir = data_dir(&app)?;
    let path = dir.join(STATE_FILE);
    let tmp = dir.join(format!("{STATE_FILE}.tmp"));
    fs::write(&tmp, json.as_bytes()).map_err(|e| format!("No puedo guardar: {e}"))?;
    if path.exists() {
        // Best effort: one previous version survives a bad write.
        let _ = fs::copy(&path, dir.join(BACKUP_FILE));
    }
    fs::rename(&tmp, &path).map_err(|e| format!("No puedo guardar: {e}"))
}

/// Where the data file lives, to show it in Settings.
#[tauri::command]
fn data_location(app: AppHandle) -> Result<String, String> {
    Ok(data_dir(&app)?.join(STATE_FILE).display().to_string())
}

/// Opens a link in the browser or in its own app (bear://, etc.). Never local files or scripts.
#[tauri::command]
fn open_external(app: AppHandle, url: String) -> Result<(), String> {
    if !is_safe_external_url(&url) {
        return Err("Enlace no permitido.".into());
    }
    app.opener().open_url(url, None::<&str>).map_err(|e| e.to_string())
}

fn is_safe_external_url(url: &str) -> bool {
    let Some((scheme, rest)) = url.trim().split_once(':') else {
        return false;
    };
    let scheme = scheme.to_ascii_lowercase();
    let valid = !scheme.is_empty()
        && scheme.chars().next().is_some_and(|c| c.is_ascii_alphabetic())
        && scheme.chars().all(|c| c.is_ascii_alphanumeric() || "+.-".contains(c));
    valid && !rest.is_empty() && !["javascript", "data", "vbscript", "file", "blob"].contains(&scheme.as_str())
}

fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn quick_log_shortcut() -> Shortcut {
    Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyR)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state() == ShortcutState::Pressed && *shortcut == quick_log_shortcut() {
                        show_main(app);
                        let _ = app.emit(QUICK_LOG_EVENT, ());
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![load_state, save_state, data_location, open_external])
        .setup(|app| {
            let handle = app.handle().clone();
            // The page reads the links itself (plugin JS API); here we only bring the window forward.
            app.deep_link().on_open_url(move |_event| show_main(&handle));
            if let Err(e) = app.global_shortcut().register(quick_log_shortcut()) {
                eprintln!("No se pudo registrar el atajo ⌃⌥R: {e}");
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            // Closing the window keeps Productivitree running, so the shortcut and links keep working.
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == MAIN_WINDOW {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error al arrancar Productivitree");

    app.run(|handle, event| {
        // Clicking the Dock icon brings the hidden window back.
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Reopen { .. } = event {
            show_main(handle);
        }
        #[cfg(not(target_os = "macos"))]
        let _ = (handle, event);
    });
}

#[cfg(test)]
mod tests {
    use super::is_safe_external_url;

    #[test]
    fn opens_web_and_app_links_only() {
        assert!(is_safe_external_url("https://writerslens.netlify.app/"));
        assert!(is_safe_external_url("bear://x-callback-url/search?tag=storytelling"));
        assert!(!is_safe_external_url("javascript:alert(1)"));
        assert!(!is_safe_external_url("FILE:///etc/passwd"));
        assert!(!is_safe_external_url("data:text/html,hi"));
        assert!(!is_safe_external_url("sin-esquema"));
        assert!(!is_safe_external_url("1abc:foo"));
    }
}
