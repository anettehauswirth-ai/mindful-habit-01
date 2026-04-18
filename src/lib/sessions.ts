export type Session = {
  id: string;
  date: string; // ISO yyyy-mm-dd
  createdAt: string;
  durationMin: number;
  presence: number; // 1-5
  notes: string;
};

const KEY = "mindfulness.sessions.v1";

export function loadSessions(): Session[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Session[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: Session[]) {
  localStorage.setItem(KEY, JSON.stringify(sessions));
  window.dispatchEvent(new CustomEvent("sessions:updated"));
}

export function addSession(s: Session) {
  const all = loadSessions();
  all.push(s);
  saveSessions(all);
}

export function todayISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function computeStreak(sessions: Session[]): number {
  const days = new Set(sessions.map((s) => s.date));
  let streak = 0;
  const cur = new Date();
  // If today not present, streak can still count from yesterday
  if (!days.has(todayISO(cur))) {
    cur.setDate(cur.getDate() - 1);
  }
  while (days.has(todayISO(cur))) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}
