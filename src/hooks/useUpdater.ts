import { useCallback, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";

export type UpdateStatus = "idle" | "checking" | "available" | "downloading" | "ready" | "error";

const RELEASES_API =
  "https://api.github.com/repos/yasharma/Slatepad/releases/latest";

interface LatestRelease {
  version: string;
  url: string;
}

function parseVersion(v: string): number[] {
  return v.replace(/^v/i, "").split(".").map((n) => parseInt(n, 10) || 0);
}

function isNewer(latest: string, current: string): boolean {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff > 0) return true;
    if (diff < 0) return false;
  }
  return false;
}

async function fetchLatestRelease(): Promise<LatestRelease> {
  const res = await fetch(RELEASES_API, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) {
    throw new Error("Could not reach GitHub Releases.");
  }
  const data = (await res.json()) as { tag_name?: string; html_url?: string };
  const tag = data.tag_name?.replace(/^v/i, "") ?? "";
  const url = data.html_url ?? "https://github.com/yasharma/Slatepad/releases/latest";
  if (!tag) {
    throw new Error("Invalid release info from GitHub.");
  }
  return { version: tag, url };
}

export function useUpdater() {
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [version, setVersion] = useState<string | null>(null);
  const [releaseUrl, setReleaseUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upToDateMessage, setUpToDateMessage] = useState<string | null>(null);

  const checkForUpdates = useCallback(async () => {
    setStatus("checking");
    setError(null);
    setUpToDateMessage(null);
    setVersion(null);
    setReleaseUrl(null);

    try {
      const current = await getVersion();
      const latest = await fetchLatestRelease();

      if (isNewer(latest.version, current)) {
        setVersion(latest.version);
        setReleaseUrl(latest.url);
        setStatus("available");
        return latest;
      }

      setStatus("idle");
      setUpToDateMessage(`You're on the latest version (v${current}).`);
      return null;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Update check failed";
      setError(message);
      setStatus("error");
      return null;
    }
  }, []);

  const downloadAndInstall = useCallback(async () => {
    if (!releaseUrl) {
      await checkForUpdates();
      return;
    }
    window.open(releaseUrl, "_blank", "noopener,noreferrer");
  }, [releaseUrl, checkForUpdates]);

  return {
    status,
    version,
    error,
    upToDateMessage,
    checkForUpdates,
    downloadAndInstall,
  };
}
