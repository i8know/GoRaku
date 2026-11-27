// Kontrol penekanan tangkapan sinkronisasi (echo suppression) dan sinyal dirty outbox.
// Modul ini sengaja bebas ketergantungan store/Supabase agar aman diimpor oleh deckDb.ts
// baik pada main thread maupun di dalam Web Worker (apkgImport.worker.ts).

let syncCaptureSuppressionCount = 0;

type OutboxDirtyListener = () => void;
const dirtyListeners = new Set<OutboxDirtyListener>();

export function isSyncCaptureSuppressed(): boolean {
  return syncCaptureSuppressionCount > 0;
}

export async function withSyncCaptureSuppressed<T>(fn: () => Promise<T> | T): Promise<T> {
  syncCaptureSuppressionCount += 1;
  try {
    return await fn();
  } finally {
    syncCaptureSuppressionCount = Math.max(0, syncCaptureSuppressionCount - 1);
  }
}

export function withSyncCaptureSuppressedSync<T>(fn: () => T): T {
  syncCaptureSuppressionCount += 1;
  try {
    return fn();
  } finally {
    syncCaptureSuppressionCount = Math.max(0, syncCaptureSuppressionCount - 1);
  }
}

export function registerOutboxDirtyListener(listener: OutboxDirtyListener): () => void {
  dirtyListeners.add(listener);
  return () => {
    dirtyListeners.delete(listener);
  };
}

export function notifyOutboxDirty(): void {
  for (const listener of dirtyListeners) {
    try {
      listener();
    } catch {
      // Abaikan galat pendengar agar tidak mengganggu penulisan lokal
    }
  }
}
