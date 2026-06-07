import { useRef, useState } from "react";
import { testConnection } from "../lib/aiChat";
import type { AiSettings } from "../lib/aiSettings";

interface AiSettingsFormProps {
  settings: AiSettings;
  onChange: (settings: AiSettings) => void;
  compact?: boolean;
}

export function AiSettingsForm({
  settings,
  onChange,
  compact = false,
}: AiSettingsFormProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fieldClass = compact ? "mt-2" : "mt-3";
  const inputClass =
    "mt-1 w-full rounded-md border border-border bg-input-bg px-2.5 py-1.5 text-sm text-text-primary placeholder:text-placeholder focus:outline-none focus:ring-1 focus:ring-accent";

  const handleTest = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setTesting(true);
    setTestResult(null);

    try {
      const message = await testConnection(settings, controller.signal);
      setTestResult({ ok: true, message });
    } catch (err) {
      if (controller.signal.aborted) {
        return;
      }
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : "Connection failed",
      });
    } finally {
      if (abortRef.current === controller) {
        setTesting(false);
        abortRef.current = null;
      }
    }
  };

  return (
    <div className={compact ? "space-y-2" : "space-y-1"}>
      <div className={fieldClass}>
        <label className="text-xs text-text-secondary" htmlFor="ai-base-url">
          API base URL
        </label>
        <input
          id="ai-base-url"
          type="url"
          value={settings.litellmBaseUrl}
          onChange={(e) => {
            setTestResult(null);
            onChange({ ...settings, litellmBaseUrl: e.target.value });
          }}
          placeholder="http://localhost:11434/v1"
          className={inputClass}
          spellCheck={false}
        />
        <p className="mt-1 text-[11px] text-text-muted">
          OpenAI-compatible endpoint (LiteLLM proxy or Ollama).
        </p>
      </div>

      <div className={fieldClass}>
        <label className="text-xs text-text-secondary" htmlFor="ai-api-key">
          API key (optional)
        </label>
        <input
          id="ai-api-key"
          type="password"
          value={settings.apiKey}
          onChange={(e) => {
            setTestResult(null);
            onChange({ ...settings, apiKey: e.target.value });
          }}
          placeholder="sk-… or leave blank for local"
          className={inputClass}
          autoComplete="off"
        />
      </div>

      <div className={fieldClass}>
        <label className="text-xs text-text-secondary" htmlFor="ai-model">
          Model
        </label>
        <input
          id="ai-model"
          type="text"
          value={settings.model}
          onChange={(e) => {
            setTestResult(null);
            onChange({ ...settings, model: e.target.value });
          }}
          placeholder="llama3.2"
          className={inputClass}
          spellCheck={false}
        />
      </div>

      {!compact && (
        <div className={fieldClass}>
          <label className="text-xs text-text-secondary" htmlFor="ai-system-prompt">
            System prompt
          </label>
          <textarea
            id="ai-system-prompt"
            value={settings.systemPrompt}
            onChange={(e) =>
              onChange({ ...settings, systemPrompt: e.target.value })
            }
            rows={4}
            className={`${inputClass} resize-y`}
          />
        </div>
      )}

      <div className={`${fieldClass} flex flex-wrap items-center gap-2`}>
        <button
          type="button"
          onClick={() => void handleTest()}
          disabled={testing || !settings.litellmBaseUrl.trim() || !settings.model.trim()}
          className="rounded-md border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary disabled:opacity-50"
        >
          {testing ? "Testing…" : "Test connection"}
        </button>
        {testResult && (
          <span
            className={`text-xs ${testResult.ok ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
            role="status"
          >
            {testResult.message}
          </span>
        )}
      </div>
    </div>
  );
}
