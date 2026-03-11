import { useCallback, useEffect, useMemo, useState } from "react";

const TTL_MS = 12 * 60 * 60 * 1000;

function prune(messages) {
  const now = Date.now();
  return messages.filter((message) => now - new Date(message.createdAt).getTime() <= TTL_MS);
}

export function useEphemeralMessages(conversationKey) {
  const storageKey = useMemo(() => `whispers_msgs_${conversationKey || "none"}`, [conversationKey]);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!conversationKey) {
      setMessages([]);
      return;
    }
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    setMessages(prune(parsed));
  }, [conversationKey, storageKey]);

  useEffect(() => {
    if (!conversationKey) {
      return;
    }
    const next = prune(messages);
    localStorage.setItem(storageKey, JSON.stringify(next));
  }, [conversationKey, messages, storageKey]);

  useEffect(() => {
    if (!conversationKey) {
      return undefined;
    }
    const id = setInterval(() => setMessages((prev) => prune(prev)), 60_000);
    return () => clearInterval(id);
  }, [conversationKey]);

  const addMessage = useCallback((message) => {
    setMessages((prev) => prune([...prev, message]));
  }, []);

  return { messages, addMessage };
}
