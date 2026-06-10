use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::sync::Mutex;

use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

mod audio;

use audio::{AudioPermissions, AudioState, RecordingStatusResponse};

#[cfg(target_os = "macos")]
use audio::RecordingResult;

#[cfg(not(target_os = "macos"))]
#[derive(serde::Serialize)]
struct RecordingResult {
    path: String,
}

/// Write HTML to a temp file and open it in the default browser so the user
/// can use the browser's native "Print → Save as PDF" dialog.
#[tauri::command]
fn open_print_preview(html: String, title: String) -> Result<(), String> {
    let tmp_path = std::env::temp_dir().join(format!("slatepad-print-{}.html", uuid_simple()));
    fs::write(&tmp_path, html.as_bytes()).map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    Command::new("open")
        .arg(tmp_path.to_str().unwrap_or(""))
        .spawn()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "windows")]
    Command::new("cmd")
        .args(["/c", "start", tmp_path.to_str().unwrap_or("")])
        .spawn()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "linux")]
    Command::new("xdg-open")
        .arg(tmp_path.to_str().unwrap_or(""))
        .spawn()
        .map_err(|e| e.to_string())?;

    let _ = title;
    Ok(())
}

fn database_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| e.to_string())
        .map(|dir| dir.join("notes.db"))
}

#[tauri::command]
fn get_database_path(app: tauri::AppHandle) -> Result<String, String> {
    database_path(&app).map(|p| p.to_string_lossy().into_owned())
}

#[tauri::command]
fn export_database(app: tauri::AppHandle, dest_path: String) -> Result<(), String> {
    let src = database_path(&app)?;
    if !src.exists() {
        return Err("Database file not found.".into());
    }

    // Checkpoint the WAL so all recent writes are flushed into the main .db
    // file before we copy it. Without this, notes written since the last
    // checkpoint only exist in the .db-wal file and would be missing from
    // the exported backup.
    {
        let conn = rusqlite::Connection::open(&src)
            .map_err(|e| format!("Could not open DB for checkpoint: {e}"))?;
        conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")
            .map_err(|e| format!("WAL checkpoint failed: {e}"))?;
    }

    fs::copy(&src, &dest_path).map_err(|e| format!("Export failed: {e}"))?;
    Ok(())
}

#[tauri::command]
fn import_database(app: tauri::AppHandle, source_path: String) -> Result<(), String> {
    let dest = database_path(&app)?;
    let source = PathBuf::from(&source_path);

    if !source.exists() {
        return Err("Backup file not found.".into());
    }

    let meta = fs::metadata(&source).map_err(|e| e.to_string())?;
    if meta.len() < 512 {
        return Err("File is too small to be a valid SQLite backup.".into());
    }

    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    // Stage the backup as a pending import file. The actual swap happens at
    // the next startup (see apply_pending_import) BEFORE tauri-plugin-sql
    // opens the database. This avoids the race where the current process's
    // open SQLite connection flushes a stale WAL after we copy the file.
    let pending = dest.with_extension("db.pending-import");
    fs::copy(&source, &pending).map_err(|e| format!("Import staging failed: {e}"))?;
    Ok(())
}

/// Called at startup before any SQLite plugin opens the DB.
/// If a pending import file exists, swaps it in atomically.
fn apply_pending_import(app: &tauri::AppHandle) {
    let dest = match database_path(app) {
        Ok(p) => p,
        Err(_) => return,
    };
    let pending = dest.with_extension("db.pending-import");
    if !pending.exists() {
        return;
    }

    // Backup the current DB before overwriting
    if dest.exists() {
        let backup = dest.with_extension("db.bak");
        let _ = fs::copy(&dest, &backup);
    }

    // Remove stale WAL/SHM from the old database
    let _ = fs::remove_file(dest.with_extension("db-shm"));
    let _ = fs::remove_file(dest.with_extension("db-wal"));

    // Swap in the pending import
    if let Err(e) = fs::rename(&pending, &dest) {
        // rename may fail across filesystems; fall back to copy+delete
        if fs::copy(&pending, &dest).is_ok() {
            let _ = fs::remove_file(&pending);
        } else {
            eprintln!("Slatepad: failed to apply pending import: {e}");
        }
    }
}

fn uuid_simple() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let t = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    format!("{:x}", t)
}

#[tauri::command]
async fn start_meeting_detection(
    app: tauri::AppHandle,
    state: tauri::State<'_, Mutex<AudioState>>,
) -> Result<(), String> {
    state
        .lock()
        .map_err(|e| e.to_string())?
        .start_meeting_detection(app)
}

#[tauri::command]
async fn stop_meeting_detection(state: tauri::State<'_, Mutex<AudioState>>) -> Result<(), String> {
    state
        .lock()
        .map_err(|e| e.to_string())?
        .stop_meeting_detection()
}

#[tauri::command]
async fn start_recording(
    app: tauri::AppHandle,
    pid: Option<u32>,
    state: tauri::State<'_, Mutex<AudioState>>,
) -> Result<(), String> {
    state
        .lock()
        .map_err(|e| e.to_string())?
        .start_recording(app, pid)
}

#[tauri::command]
async fn stop_recording(
    app: tauri::AppHandle,
    state: tauri::State<'_, Mutex<AudioState>>,
) -> Result<RecordingResult, String> {
    state
        .lock()
        .map_err(|e| e.to_string())?
        .stop_recording(app)
}

#[tauri::command]
fn get_recording_status(state: tauri::State<'_, Mutex<AudioState>>) -> RecordingStatusResponse {
    state
        .lock()
        .map(|audio_state| audio_state.get_recording_status())
        .unwrap_or(RecordingStatusResponse::Idle)
}

#[tauri::command]
fn check_audio_permissions(state: tauri::State<'_, Mutex<AudioState>>) -> AudioPermissions {
    state
        .lock()
        .map(|audio_state| audio_state.check_audio_permissions())
        .unwrap_or(AudioPermissions {
            microphone: false,
            system_audio: false,
        })
}

#[tauri::command]
async fn request_microphone_permission(
    app: tauri::AppHandle,
    state: tauri::State<'_, Mutex<AudioState>>,
) -> Result<bool, String> {
    state
        .lock()
        .map_err(|e| e.to_string())?
        .request_microphone_permission(app)
}

#[tauri::command]
async fn request_system_audio_permission(
    app: tauri::AppHandle,
    state: tauri::State<'_, Mutex<AudioState>>,
) -> Result<bool, String> {
    state
        .lock()
        .map_err(|e| e.to_string())?
        .request_system_audio_permission(app)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_notes_table",
            sql: "
            CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY NOT NULL,
                title TEXT NOT NULL DEFAULT 'Untitled',
                content TEXT NOT NULL DEFAULT '{\"type\":\"doc\",\"content\":[]}',
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);
        ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_pinned_tags_archive",
            sql: "
                ALTER TABLE notes ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;
                ALTER TABLE notes ADD COLUMN tags TEXT NOT NULL DEFAULT '';
                ALTER TABLE notes ADD COLUMN archived_at INTEGER;
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add_icon_column",
            sql: "ALTER TABLE notes ADD COLUMN icon TEXT NOT NULL DEFAULT '';",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "add_folders",
            sql: "
                CREATE TABLE IF NOT EXISTS folders (
                    id TEXT PRIMARY KEY NOT NULL,
                    name TEXT NOT NULL,
                    sort_order INTEGER NOT NULL DEFAULT 0,
                    created_at INTEGER NOT NULL
                );
                ALTER TABLE notes ADD COLUMN folder_id TEXT;
                CREATE INDEX IF NOT EXISTS idx_notes_folder_id ON notes(folder_id);
            ",
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:notes.db", migrations)
                .build(),
        )
        .setup(|app| {
            // Apply any staged import BEFORE the SQL plugin opens the DB.
            apply_pending_import(&app.handle());
            Ok(())
        })
        .manage(Mutex::new(AudioState::new()))
        .invoke_handler(tauri::generate_handler![
            open_print_preview,
            get_database_path,
            export_database,
            import_database,
            start_meeting_detection,
            stop_meeting_detection,
            start_recording,
            stop_recording,
            get_recording_status,
            check_audio_permissions,
            request_microphone_permission,
            request_system_audio_permission,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
