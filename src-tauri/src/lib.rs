use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command as StdCommand;

// ============================================================
// Tauri Commands — exposed to the React frontend via invoke()
// ============================================================

/// Get the user's home directory
#[tauri::command]
fn get_home_dir() -> Result<String, String> {
    dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "Could not determine home directory".to_string())
}

/// Get the app data directory (for local Node.js + OpenClaw install)
#[tauri::command]
fn get_app_data_dir(app: tauri::AppHandle) -> Result<String, String> {
    app.path()
        .app_data_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| format!("Failed to get app data dir: {}", e))
}

/// Get current OS platform
#[tauri::command]
fn get_platform() -> String {
    if cfg!(target_os = "windows") {
        "windows".to_string()
    } else if cfg!(target_os = "macos") {
        "mac".to_string()
    } else {
        "linux".to_string()
    }
}

/// Create directory recursively
#[tauri::command]
fn ensure_dir(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory {}: {}", path, e))
}

/// Write string content to a file
#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    // Ensure parent directory exists
    if let Some(parent) = PathBuf::from(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create parent dir: {}", e))?;
    }
    fs::write(&path, &content).map_err(|e| format!("Failed to write file {}: {}", path, e))
}

/// Read string content from a file
#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file {}: {}", path, e))
}

/// Check if a file or directory exists
#[tauri::command]
fn file_exists(path: String) -> bool {
    PathBuf::from(&path).exists()
}

/// Copy a file
#[tauri::command]
fn copy_file(from: String, to: String) -> Result<(), String> {
    fs::copy(&from, &to)
        .map(|_| ())
        .map_err(|e| format!("Failed to copy {} to {}: {}", from, to, e))
}

/// Kill process on a specific port (Windows)
#[tauri::command]
fn kill_port(port: u16) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        // Use netstat to find PID, then taskkill
        let output = StdCommand::new("cmd")
            .args(["/c", &format!(
                "for /f \"tokens=5\" %a in ('netstat -ano ^| findstr :{} ^| findstr LISTENING') do taskkill /F /PID %a 2>nul",
                port
            )])
            .output()
            .map_err(|e| format!("Failed to kill port: {}", e))?;

        // It's OK if nothing was killed
        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = StdCommand::new("sh")
            .args([
                "-c",
                &format!("kill -9 $(lsof -ti:{}) 2>/dev/null || true", port),
            ])
            .output();
        Ok(())
    }
}

/// Run a command synchronously and return stdout
#[tauri::command]
fn run_sync_command(cmd: String, args: Vec<String>, cwd: Option<String>) -> Result<String, String> {
    let mut command = StdCommand::new(&cmd);
    command.args(&args);
    if let Some(dir) = cwd {
        command.current_dir(dir);
    }

    let output = command
        .output()
        .map_err(|e| format!("Failed to run command '{}': {}", cmd, e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        Err(format!(
            "Command failed (exit {}): {} {}",
            output.status.code().unwrap_or(-1),
            stderr,
            stdout
        ))
    }
}

/// Detect if Chrome/Brave is installed (for browser tool)
#[tauri::command]
fn detect_chrome() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        let paths = vec![
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe",
        ];
        for p in paths {
            if PathBuf::from(p).exists() {
                return Some(p.to_string());
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        let paths = vec![
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
        ];
        for p in paths {
            if PathBuf::from(p).exists() {
                return Some(p.to_string());
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        let paths = vec![
            "/usr/bin/google-chrome-stable",
            "/usr/bin/chromium-browser",
            "/usr/bin/chromium",
        ];
        for p in paths {
            if PathBuf::from(p).exists() {
                return Some(p.to_string());
            }
        }
    }

    None
}

/// Spawn gateway process detached
#[tauri::command]
fn spawn_gateway_process(
    cmd: String,
    args: Vec<String>,
    env_key: String,
    env_val: String,
) -> Result<(), String> {
    let mut command = StdCommand::new(&cmd);
    command.args(&args);
    command.env(&env_key, &env_val);

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    match command.spawn() {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to spawn process '{}': {}", cmd, e)),
    }
}

// ============================================================
// App Setup
// ============================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            get_home_dir,
            get_app_data_dir,
            get_platform,
            ensure_dir,
            write_file,
            read_file,
            file_exists,
            copy_file,
            kill_port,
            run_sync_command,
            detect_chrome,
            spawn_gateway_process,
            respond_to_exec,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn respond_to_exec(id: String, approved: bool) -> Result<(), String> {
    // In a real implementation, this would send an event or a signal to the OpenClaw process.
    // For now, we log it and provide the endpoint for the frontend.
    println!(
        "Command confirmation response: id={}, approved={}",
        id, approved
    );
    Ok(())
}
