use std::fs;
use std::path::PathBuf;
use std::process::Command;

use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

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

    if dest.exists() {
        let backup = dest.with_extension("db.bak");
        fs::copy(&dest, &backup).map_err(|e| format!("Could not backup current database: {e}"))?;
    }

    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    fs::copy(&source, &dest).map_err(|e| format!("Import failed: {e}"))?;
    Ok(())
}

fn uuid_simple() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let t = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    format!("{:x}", t)
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
        .invoke_handler(tauri::generate_handler![
            open_print_preview,
            get_database_path,
            export_database,
            import_database,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
