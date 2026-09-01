import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export interface SystemNotice {
  tone?: 'system' | 'penalty';
  kind: string;
  huge?: string;
  lead?: string;
  deltas?: Array<{ text: string; color?: string }>;
  fine?: string;
}

interface NoticeValue {
  current: SystemNotice | null;
  push: (n: SystemNotice) => void;
  dismiss: () => void;
}

const Ctx = createContext<NoticeValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<SystemNotice[]>([]);
  const push = useCallback((n: SystemNotice) => setQueue((q) => [...q, n]), []);
  const dismiss = useCallback(() => setQueue((q) => q.slice(1)), []);
  const value = useMemo(
    () => ({ current: queue[0] ?? null, push, dismiss }), [queue, push, dismiss]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotices(): NoticeValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useNotices must be used inside <NotificationProvider>');
  return v;
}

export function useNotify(): (n: SystemNotice) => void {
  return useNotices().push;
}
