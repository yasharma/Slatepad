use tauri_plugin_sql::{Migration, MigrationKind};
use std::process::Command;

/// Write HTML to a temp file and open it in the default browser so the user
/// can use the browser's native "Print → Save as PDF" dialog.
#[tauri::command]
fn open_print_preview(html: String, title: String) -> Result<(), String> {
    let tmp_path = std::env::temp_dir().join(format!("slatepad-print-{}.html", uuid_simple()));
    std::fs::write(&tmp_path, html.as_bytes()).map_err(|e| e.to_string())?;

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

    let _ = title; // used in the HTML, not here
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
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:notes.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![open_print_preview])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
