/**
 * SyncProvider — owns the sync polling lifecycle.
 * Extracted from DashboardContext to isolate network/polling concerns.
 */
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import * as api from '../app/components/api';
import type { Message } from '../app/components/api';
import type { SyncStatus } from '../types/dashboard';

// ── Types ────────────────────────────────────────────────────────────────────
export interface SyncState {
  data: api.SyncData | null;
  syncStatus: SyncStatus;
  lastSynced: Date | null;
  retrySync: () => void;
}

export function computeSyncStatus(status: SyncStatus, lastSynced: Date | null, now = Date.now(), staleThresholdMs = 5 * 60 * 1000): SyncStatus {
  if (status === 'failed' || status === 'loading') return status;
  return lastSynced && now - lastSynced.getTime() > staleThresholdMs ? 'stale' : 'fresh';
}

export function nextPollInterval(currentMs: number, failedAttempts: number, maxMs = 300_000): number {
  return failedAttempts > 0 ? Math.min(currentMs * 2, maxMs) : 15_000;
}

interface SyncProviderProps {
  children: React.ReactNode;
}

const SyncCtx = createContext<SyncState | null>(null);

export function useSync(): SyncState {
  const ctx = useContext(SyncCtx);
  if (!ctx) throw new Error('useSync must be used inside SyncProvider');
  return ctx;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function deduplicateSystemMessages(msgs: Message[]): Message[] {
  const seen = new Map<string, Message>();
  const result: Message[] = [];
  for (const m of msgs) {
    if (m.author === 'system') {
      const key = m.content?.trim() || '';
      const existing = seen.get(key);
      if (existing) {
        const existingTime = existing.created_at ? new Date(existing.created_at).getTime() : 0;
        const currentTime = m.created_at ? new Date(m.created_at).getTime() : 0;
        if (currentTime > existingTime) {
          const idx = result.indexOf(existing);
          if (idx >= 0) result[idx] = m;
          seen.set(key, m);
        }
      } else {
        seen.set(key, m);
        result.push(m);
      }
    } else {
      result.push(m);
    }
  }
  return result;
}

// ── Provider ─────────────────────────────────────────────────────────────────
export function SyncProvider({ children }: SyncProviderProps) {
  const [data, setData] = useState<api.SyncData | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('loading');
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const dataLoadedRef = useRef(false);
  const silentFailCount = useRef(0);
  const fetchSyncRef = useRef<((silent?: boolean) => Promise<void>) | undefined>(undefined);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function fetchSync(silent = false) {
      try {
        const data = await api.sync();
        // Deduplicate system messages before passing to consumers
        data.messages = deduplicateSystemMessages(data.messages || []);
        setData(data);
        setSyncStatus('fresh');
        setLastSynced(new Date());
        silentFailCount.current = 0;
        if (!dataLoadedRef.current) { dataLoadedRef.current = true; }
      } catch (e) {
        const isNetworkError = e instanceof TypeError &&
          (String((e as Error).message).includes('fetch') || String((e as Error).message).includes('network'));
        silentFailCount.current += 1;
        if (!isNetworkError) {
          console.error('Sync error:', e);
          if (silentFailCount.current >= 2) setSyncStatus('failed');
        }
        if (!dataLoadedRef.current) {
          dataLoadedRef.current = true;
          setSyncStatus('failed');
        }
      }
    }

    fetchSyncRef.current = fetchSync;
    fetchSync(false);

    let pollInterval = 15_000;
    const MAX_INTERVAL = 300_000;

    function schedulePoll() {
      pollRef.current = setTimeout(async () => {
        await fetchSyncRef.current?.(true);
        pollInterval = nextPollInterval(pollInterval, silentFailCount.current, MAX_INTERVAL);
        schedulePoll();
      }, pollInterval);
    }
    schedulePoll();

    return () => { if (pollRef.current) clearTimeout(pollRef.current as any); };
  }, []);

  // Compute stale status
  const computedSyncStatus = computeSyncStatus(syncStatus, lastSynced);

  const retrySync = useCallback(() => {
    fetchSyncRef.current?.(false);
  }, []);

  return (
    <SyncCtx.Provider value={{ data, syncStatus: computedSyncStatus, lastSynced, retrySync }}>
      {children}
    </SyncCtx.Provider>
  );
}
