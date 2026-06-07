import { useEffect, useRef, useState } from "react";
import { QUICK_ACTIONS, type ChatMessage } from "../lib/aiChat";
import { renderMarkdownHtml } from "../lib/importMarkdown";
import type { AiSettings } from "../lib/aiSettings";
import type { Note } from "../lib/types";
import { AiSettingsForm } from "./AiSettingsForm";

interface AiChatPanelProps {
  open: boolean;
  onClose: () => void;
  activeNote: Note | null;
  messages: ChatMessage[];
  settings: AiSettings;
  onSettingsChange: (settings: AiSettings) => void;
  loading: boolean;
  error: string | null;
  onClearError: () => void;
  onSend: (text: string) => void;
  onClear: () => void;
  onCancel: () => void;
  onApply?: (markdown: string) => void;
}

interface AiChatToggleProps {
  open: boolean;
  onToggle: () => void;
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 3 13.5 8.5 19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z" />
      <path d="M5 3v3" />
      <path d="M3 5h3" />
      <path d="M19 17v3" />
      <path d="M17 19h3" />
    </svg>
  );
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function MessageBubble({
  message,
  canApply,
  onApply,
}: {
  message: ChatMessage;
  canApply: boolean;
  onApply?: (markdown: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[96%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? "bg-accent text-white whitespace-pre-wrap"
            : "border border-border-subtle bg-surface text-text-primary"
        }`}
      >
        {isUser ? (
          message.content
        ) : (
          <div
            className="tiptap ai-chat-markdown text-sm"
            dangerouslySetInnerHTML={{
              __html: renderMarkdownHtml(message.content),
            }}
          />
        )}
        {!isUser && (
          <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border-subtle pt-2">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="rounded-md border border-border px-2 py-0.5 text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            >
              {copied ? "Copied" : "Copy"}
            </button>
            {canApply && onApply && (
              <button
                type="button"
                onClick={() => onApply(message.content)}
                className="rounded-md border border-border px-2 py-0.5 text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              >
                Apply to note
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function AiChatToggle({ open, onToggle }: AiChatToggleProps) {
  if (open) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      title="AI assistant (⌘⇧A)"
      aria-label="Open AI assistant"
      className="no-print fixed bottom-4 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-modal-bg text-text-secondary shadow-lg transition-colors hover:bg-surface-hover hover:text-text-primary"
    >
      <SparkleIcon className="h-5 w-5" />
    </button>
  );
}

export function AiChatPanel({
  open,
  onClose,
  activeNote,
  messages,
  settings,
  onSettingsChange,
  loading,
  error,
  onClearError,
  onSend,
  onClear,
  onCancel,
  onApply,
}: AiChatPanelProps) {
  const [input, setInput] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, open]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const handleSubmit = () => {
    if (!input.trim() || loading) {
      return;
    }
    const text = input;
    setInput("");
    void onSend(text);
  };

  const noteLabel = activeNote
    ? activeNote.title?.trim() || "Untitled"
    : "No note open";

  if (!open) {
    return null;
  }

  const canApply = Boolean(activeNote && onApply);

  return (
    <aside
      className="no-print flex h-full w-[360px] shrink-0 flex-col border-l border-border bg-sidebar-bg"
      aria-label="AI assistant"
    >
      <div
        className="h-[28px] shrink-0 bg-sidebar-bg"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      />

      <div
        className="flex min-h-0 flex-1 flex-col"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border-subtle px-3 py-2.5">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-text-primary">AI assistant</h2>
            <p className="truncate text-xs text-text-muted" title={noteLabel}>
              Context: {noteLabel}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              title="Settings"
              onClick={() => setSettingsOpen((v) => !v)}
              className={`flex h-7 w-7 items-center justify-center rounded-md hover:bg-surface-hover ${
                settingsOpen ? "text-text-primary" : "text-text-muted"
              }`}
              aria-label="AI settings"
              aria-expanded={settingsOpen}
            >
              <GearIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Clear conversation"
              onClick={onClear}
              disabled={messages.length === 0 && !error}
              className="rounded-md px-2 py-1 text-xs text-text-muted hover:bg-surface-hover hover:text-text-secondary disabled:opacity-40"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-1.5 py-0.5 text-sm text-text-muted hover:bg-surface-hover hover:text-text-secondary"
              aria-label="Close AI assistant"
            >
              ✕
            </button>
          </div>
        </div>

        {settingsOpen && (
          <div className="max-h-[45%] shrink-0 overflow-y-auto border-b border-border-subtle px-3 py-2.5">
            <AiSettingsForm
              settings={settings}
              onChange={onSettingsChange}
              compact
            />
          </div>
        )}

        {activeNote && messages.length === 0 && !loading && !settingsOpen && (
          <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-border-subtle px-3 py-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => void onSend(action.prompt)}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {messages.length === 0 && !loading && (
            <p className="text-sm text-text-muted">
              Ask about your note, get writing help, or brainstorm ideas. Configure
              your model in settings (gear icon) or in app Settings → AI.
            </p>
          )}
          <div className="space-y-3">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                canApply={canApply}
                onApply={onApply}
              />
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-text-muted">
                  Thinking…
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </div>

        {error && (
          <div
            role="alert"
            className="mx-3 mb-2 flex items-start justify-between gap-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={onClearError}
              className="shrink-0 text-red-600 hover:text-red-800 dark:text-red-300"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        <div className="shrink-0 border-t border-border-subtle p-3">
          <div className="flex items-stretch gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Ask about this note…"
              rows={1}
              disabled={loading}
              className="box-border h-11 min-h-11 max-h-11 flex-1 resize-none overflow-y-auto rounded-md border border-border bg-input-bg px-2.5 py-2 text-sm leading-normal text-text-primary placeholder:text-placeholder focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
            />
            {loading ? (
              <button
                type="button"
                onClick={onCancel}
                className="box-border h-11 shrink-0 rounded-md border border-border px-3 text-sm text-text-secondary hover:bg-surface-hover"
              >
                Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!input.trim()}
                className="btn-primary box-border h-11 shrink-0 px-4 text-sm disabled:opacity-50"
              >
                Send
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
