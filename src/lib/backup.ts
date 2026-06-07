import { invoke } from "@tauri-apps/api/core";
import { save, open, ask } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export async function exportDatabaseBackup(): Promise<string | null> {
  const dest = await save({
    defaultPath: `slatepad-backup-${timestamp()}.db`,
    filters: [{ name: "SQLite database", extensions: ["db"] }],
  });

  if (!dest) {
    return null;
  }

  await invoke("export_database", { destPath: dest });
  return dest;
}

export async function importDatabaseBackup(): Promise<boolean> {
  const confirmed = await ask(
    "This replaces all current notes with the backup. Your existing database will be saved as notes.db.bak. The app will restart.",
    { title: "Import backup?", kind: "warning", okLabel: "Import", cancelLabel: "Cancel" },
  );

  if (!confirmed) {
    return false;
  }

  const source = await open({
    multiple: false,
    filters: [{ name: "SQLite database", extensions: ["db"] }],
  });

  if (!source || typeof source !== "string") {
    return false;
  }

  await invoke("import_database", { sourcePath: source });
  await relaunch();
  return true;
}
