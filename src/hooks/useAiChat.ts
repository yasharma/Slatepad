import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ChatMessage,
  sendChatCompletion,
} from "../lib/aiChat";
import {
  type AiSettings,
  getStoredAiSettings,
  saveAiSettings,
} from "../lib/aiSettings";
import type { Note } from "../lib/types";

function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
  };
}

export function useAiChat(activeNote: Note | null) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [settings, setSettingsState] = useState<AiSettings>(getStoredAiSettings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const setSettings = useCallback((next: AiSettings) => {
    setSettingsState(next);
    saveAiSettings(next);
  }, []);

  const toggleOpen = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const cancelRequest = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) {
        return;
      }

      setError(null);
      const userMessage = createMessage("user", trimmed);
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setLoading(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const reply = await sendChatCompletion(
          settings,
          nextMessages,
          activeNote,
          controller.signal,
        );
        setMessages((prev) => [...prev, createMessage("assistant", reply)]);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        const message =
          err instanceof Error ? err.message : "Could not reach AI server";
        setError(message);
      } finally {
        abortRef.current = null;
        setLoading(false);
      }
    },
    [activeNote, loading, messages, settings],
  );

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return {
    open,
    setOpen,
    toggleOpen,
    messages,
    settings,
    setSettings,
    loading,
    error,
    setError,
    sendMessage,
    clearMessages,
    cancelRequest,
  };
}
