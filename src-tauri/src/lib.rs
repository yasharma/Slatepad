use tauri_plugin_sql::{Migration, MigrationKind};

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
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
