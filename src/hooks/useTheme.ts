import { useCallback, useEffect, useState } from "react";

export const STORAGE_KEY = "slatepad-theme";
const LEGACY_STORAGE_KEY = "local-plus-theme";

export type ThemePreference = "light" | "dark" | "system";
export type EffectiveTheme = "light" | "dark";

function readThemePreference(key: string): ThemePreference | null {
  const stored = localStorage.getItem(key);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return null;
}

export function getStoredPreference(): ThemePreference {
  const stored = readThemePreference(STORAGE_KEY);
  if (stored) {
    return stored;
  }

  const legacy = readThemePreference(LEGACY_STORAGE_KEY);
  if (legacy) {
    localStorage.setItem(STORAGE_KEY, legacy);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return legacy;
  }

  return "system";
}

export function getSystemTheme(): EffectiveTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function resolveEffectiveTheme(
  preference: ThemePreference,
): EffectiveTheme {
  if (preference === "system") {
    return getSystemTheme();
  }
  return preference;
}

export function applyThemeClass(effective: EffectiveTheme): void {
  document.documentElement.classList.toggle("dark", effective === "dark");
}

export function useTheme() {
  const [preference, setPreferenceState] =
    useState<ThemePreference>(getStoredPreference);
  const [systemTheme, setSystemTheme] =
    useState<EffectiveTheme>(getSystemTheme);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemTheme(getSystemTheme());
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const effectiveTheme =
    preference === "system" ? systemTheme : preference;

  useEffect(() => {
    applyThemeClass(effectiveTheme);
    localStorage.setItem(STORAGE_KEY, preference);
  }, [preference, effectiveTheme]);

  const setThemePreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
  }, []);

  return { preference, effectiveTheme, setThemePreference };
}
