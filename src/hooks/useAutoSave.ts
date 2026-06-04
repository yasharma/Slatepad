import { useCallback, useEffect, useRef, useState } from "react";
import type { SaveStatus } from "../lib/types";

export function useAutoSave(saveFn: () => Promise<void>, delay = 500) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveFnRef = useRef(saveFn);
  saveFnRef.current = saveFn;

  const flushSave = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    setStatus("saving");
    try {
      await saveFnRef.current();
      setStatus("saved");
    } catch {
      setStatus("idle");
      throw new Error("Failed to save note");
    }
  }, []);

  const scheduleSave = useCallback(() => {
    setStatus("saving");
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      void flushSave();
    }, delay);
  }, [delay, flushSave]);

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    [],
  );

  return { scheduleSave, flushSave, status };
}
