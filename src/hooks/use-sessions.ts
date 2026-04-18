import { useEffect, useState, useCallback } from "react";
import { loadSessions, saveSessions, type Session } from "@/lib/sessions";

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    setSessions(loadSessions());
    const handler = () => setSessions(loadSessions());
    window.addEventListener("sessions:updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("sessions:updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const add = useCallback((s: Session) => {
    const all = loadSessions();
    all.push(s);
    saveSessions(all);
    setSessions(all);
  }, []);

  return { sessions, add };
}
