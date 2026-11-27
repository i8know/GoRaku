// Server Supabase tiruan di memori untuk pengujian unit & integrasi dua perangkat.
// Mencerminkan semantik RPC `202611270001_sync_b2.sql`, RLS per user_id, constraint ukuran/rentang,
// FK cards -> decks, serta paginasi keyset `(updated_at, pk)` & `review_logs.id`.

import type { SupabaseClient } from "@supabase/supabase-js";
import { mergeCounterRecord, mergeLwwRecord, mergeSrsRecord } from "../merge";
import { parseDeletedAtMs } from "../mappers";
import type { SRSCard } from "../../srs";

interface StoredServerSettings {
  user_id: string;
  data: Record<string, unknown>;
  client_updated_at: number;
  updated_at: string;
}

interface StoredServerDeck {
  user_id: string;
  id: string;
  parent_id: string | null;
  title: string;
  kanji: string;
  category: string;
  meta: Record<string, unknown> | null;
  deleted_at: string | null;
  client_updated_at: number;
  updated_at: string;
}

interface StoredServerCard {
  user_id: string;
  deck_id: string;
  id: string;
  data: Record<string, unknown>;
  deleted_at: string | null;
  client_updated_at: number;
  updated_at: string;
}

interface StoredServerSrs {
  user_id: string;
  deck_id: string;
  card_id: string;
  data: Record<string, unknown>;
  last_review: number | null;
  reps: number;
  deleted_at: number | null;
  updated_at: string;
}

interface StoredServerCounter {
  user_id: string;
  deck_id: string;
  study_day: string;
  new_introduced: number;
  extra_new: number;
  reviewed_count: number;
  last_activity: number | null;
  reset_at: number;
  updated_at: string;
}

interface StoredServerLog {
  id: number;
  user_id: string;
  device_id: string;
  deck_id: string;
  card_id: string;
  rating: number;
  state: number;
  due: number;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reviewed_at: number;
  updated_at: string;
}

export interface MockSyncServerOptions {
  onRpc?: (fn: string, rows: unknown[], callIndex: number) => { data?: unknown; error?: unknown } | void;
  onSelect?: (table: string, callIndex: number) => { data?: unknown[]; error?: unknown } | void;
  onRefreshSession?: () => Promise<{ error: unknown }>;
}

export class MockSyncServer {
  settings = new Map<string, StoredServerSettings>();
  decks = new Map<string, StoredServerDeck>();
  cards = new Map<string, StoredServerCard>();
  srs = new Map<string, StoredServerSrs>();
  counters = new Map<string, StoredServerCounter>();
  logs: StoredServerLog[] = [];
  nextLogId = 1;
  clockMs = 1_764_200_000_000;
  rpcCallCount = 0;
  selectCallCount = 0;
  refreshCalls = 0;

  private tickIso(): string {
    this.clockMs += 10;
    return new Date(this.clockMs).toISOString();
  }

  createClientForUser(userId: string, opts: MockSyncServerOptions = {}): SupabaseClient {
    const server = this;

    const rpc = async (fn: string, args: { p_rows?: unknown[] }) => {
      server.rpcCallCount += 1;
      const rows = Array.isArray(args?.p_rows) ? args.p_rows : [];
      const hooked = opts.onRpc?.(fn, rows, server.rpcCallCount);
      if (hooked) return { data: hooked.data ?? null, error: hooked.error ?? null };

      let applied = 0;
      let skipped = 0;
      const rejected: Array<{ key: string; code: string; reason: string }> = [];

      if (fn === "sync_upsert_settings") {
        for (const raw of rows) {
          const r = raw as Record<string, unknown>;
          const data = (r.data ?? {}) as Record<string, unknown>;
          if (JSON.stringify(data).length > 65536) {
            rejected.push({ key: "settings", code: "23514", reason: "user_settings_data_size_chk" });
            continue;
          }
          const incomingTs = Math.max(0, Math.round(Number(r.client_updated_at ?? 0)));
          const existing = server.settings.get(userId);
          const merged = mergeLwwRecord(
            existing ? { client_updated_at: existing.client_updated_at } : null,
            { client_updated_at: incomingTs },
          );
          if (merged.winner === "incoming") {
            server.settings.set(userId, {
              user_id: userId,
              data,
              client_updated_at: incomingTs,
              updated_at: server.tickIso(),
            });
            applied += 1;
          } else {
            skipped += 1;
          }
        }
      } else if (fn === "sync_upsert_decks") {
        for (const raw of rows) {
          const r = raw as Record<string, unknown>;
          const id = String(r.id ?? "");
          const title = String(r.title ?? "");
          if (!id || id.length > 128) {
            rejected.push({ key: id, code: "23514", reason: "decks_id_len_chk" });
            continue;
          }
          if (title.length > 200) {
            rejected.push({ key: id, code: "23514", reason: "decks_title_len_chk" });
            continue;
          }
          const incomingTs = Math.max(0, Math.round(Number(r.client_updated_at ?? 0)));
          const delMs = parseDeletedAtMs(r.deleted_at);
          const pk = `${userId}::${id}`;
          const existing = server.decks.get(pk);
          const merged = mergeLwwRecord(
            existing ? { client_updated_at: existing.client_updated_at } : null,
            { client_updated_at: incomingTs },
          );
          if (merged.winner === "incoming") {
            server.decks.set(pk, {
              user_id: userId,
              id,
              parent_id: r.parent_id ? String(r.parent_id) : null,
              title,
              kanji: String(r.kanji ?? ""),
              category: String(r.category ?? ""),
              meta: (r.meta as Record<string, unknown> | null) ?? null,
              deleted_at: delMs !== null ? new Date(delMs).toISOString() : null,
              client_updated_at: incomingTs,
              updated_at: server.tickIso(),
            });
            applied += 1;
          } else {
            skipped += 1;
          }
        }
      } else if (fn === "sync_upsert_cards") {
        for (const raw of rows) {
          const r = raw as Record<string, unknown>;
          const deckId = String(r.deck_id ?? "");
          const id = String(r.id ?? "");
          const key = `${deckId}::${id}`;
          const data = (r.data ?? {}) as Record<string, unknown>;
          if (!deckId || !id || deckId.length > 128 || id.length > 128) {
            rejected.push({ key, code: "23514", reason: "cards_id_len_chk" });
            continue;
          }
          if (!server.decks.has(`${userId}::${deckId}`)) {
            rejected.push({ key, code: "23503", reason: "cards_user_id_deck_id_fkey" });
            continue;
          }
          if (JSON.stringify(data).length > 65536) {
            rejected.push({ key, code: "23514", reason: "cards_data_size_chk" });
            continue;
          }
          const incomingTs = Math.max(0, Math.round(Number(r.client_updated_at ?? 0)));
          const delMs = parseDeletedAtMs(r.deleted_at);
          const pk = `${userId}::${key}`;
          const existing = server.cards.get(pk);
          const merged = mergeLwwRecord(
            existing ? { client_updated_at: existing.client_updated_at } : null,
            { client_updated_at: incomingTs },
          );
          if (merged.winner === "incoming") {
            server.cards.set(pk, {
              user_id: userId,
              deck_id: deckId,
              id,
              data,
              deleted_at: delMs !== null ? new Date(delMs).toISOString() : null,
              client_updated_at: incomingTs,
              updated_at: server.tickIso(),
            });
            applied += 1;
          } else {
            skipped += 1;
          }
        }
      } else if (fn === "sync_upsert_srs") {
        for (const raw of rows) {
          const r = raw as Record<string, unknown>;
          const deckId = String(r.deck_id ?? "");
          const cardId = String(r.card_id ?? "");
          const key = `${deckId}::${cardId}`;
          const reps = Number(r.reps ?? 0);
          if (!deckId || !cardId || reps < 0) {
            rejected.push({ key, code: "23514", reason: "srs_cards_check" });
            continue;
          }
          const pk = `${userId}::${key}`;
          const existing = server.srs.get(pk);
          const incomingLr = r.last_review === null || r.last_review === undefined ? null : Number(r.last_review);
          const incomingDel = r.deleted_at === null || r.deleted_at === undefined ? null : Number(r.deleted_at);
          const incomingData = (r.data ?? {}) as Record<string, unknown>;

          const { merged, changed } = mergeSrsRecord(
            existing
              ? {
                  card: Object.keys(existing.data).length > 0 ? (existing.data as unknown as SRSCard) : null,
                  lastReview: existing.last_review,
                  reps: existing.reps,
                  deletedAt: existing.deleted_at,
                }
              : null,
            {
              card: Object.keys(incomingData).length > 0 ? (incomingData as unknown as SRSCard) : null,
              lastReview: incomingLr,
              reps,
              deletedAt: incomingDel,
            },
          );
          if (changed) {
            server.srs.set(pk, {
              user_id: userId,
              deck_id: deckId,
              card_id: cardId,
              data: merged.card ? (merged.card as unknown as Record<string, unknown>) : {},
              last_review: merged.lastReview,
              reps: merged.reps,
              deleted_at: merged.deletedAt,
              updated_at: server.tickIso(),
            });
            applied += 1;
          } else {
            skipped += 1;
          }
        }
      } else if (fn === "sync_upsert_counters") {
        for (const raw of rows) {
          const r = raw as Record<string, unknown>;
          const deckId = String(r.deck_id ?? "");
          const studyDay = String(r.study_day ?? "");
          const key = `${deckId}::${studyDay}`;
          if (!deckId || studyDay.length < 8) {
            rejected.push({ key, code: "23514", reason: "daily_counters_check" });
            continue;
          }
          const pk = `${userId}::${key}`;
          const existing = server.counters.get(pk);
          const { merged, changed } = mergeCounterRecord(
            existing
              ? {
                  newIntroduced: existing.new_introduced,
                  extraNew: existing.extra_new,
                  reviewedCount: existing.reviewed_count,
                  lastActivity: existing.last_activity,
                  resetAt: existing.reset_at,
                }
              : null,
            {
              newIntroduced: Number(r.new_introduced ?? 0),
              extraNew: Number(r.extra_new ?? 0),
              reviewedCount: Number(r.reviewed_count ?? 0),
              lastActivity: r.last_activity === null || r.last_activity === undefined ? null : Number(r.last_activity),
              resetAt: Number(r.reset_at ?? 0),
            },
          );
          if (changed) {
            server.counters.set(pk, {
              user_id: userId,
              deck_id: deckId,
              study_day: studyDay,
              new_introduced: merged.newIntroduced,
              extra_new: merged.extraNew,
              reviewed_count: merged.reviewedCount,
              last_activity: merged.lastActivity,
              reset_at: merged.resetAt,
              updated_at: server.tickIso(),
            });
            applied += 1;
          } else {
            skipped += 1;
          }
        }
      } else if (fn === "sync_insert_review_logs") {
        for (const raw of rows) {
          const r = raw as Record<string, unknown>;
          const deviceId = String(r.device_id ?? "");
          const deckId = String(r.deck_id ?? "");
          const cardId = String(r.card_id ?? "");
          const rating = Number(r.rating);
          const state = Number(r.state);
          const reviewedAt = Number(r.reviewed_at);
          const key = `${deviceId}::${cardId}::${reviewedAt}`;
          if (!deviceId || !deckId || !cardId || rating < 1 || rating > 4 || state < 0 || state > 3) {
            rejected.push({ key, code: "23514", reason: "review_logs_check" });
            continue;
          }
          const dup = server.logs.some(
            (l) =>
              l.user_id === userId &&
              l.device_id === deviceId &&
              l.card_id === cardId &&
              l.reviewed_at === reviewedAt,
          );
          if (dup) {
            skipped += 1;
            continue;
          }
          server.logs.push({
            id: server.nextLogId++,
            user_id: userId,
            device_id: deviceId,
            deck_id: deckId,
            card_id: cardId,
            rating,
            state,
            due: Number(r.due),
            stability: Number(r.stability),
            difficulty: Number(r.difficulty),
            elapsed_days: Number(r.elapsed_days),
            scheduled_days: Number(r.scheduled_days),
            reviewed_at: reviewedAt,
            updated_at: server.tickIso(),
          });
          applied += 1;
        }
      }

      return { data: { applied, skipped, rejected }, error: null };
    };

    const from = (table: string) => {
      const filters: Array<(row: Record<string, unknown>) => boolean> = [];
      const orders: Array<{ col: string; ascending: boolean }> = [];
      let limitNum = Infinity;

      const execSelect = async () => {
        server.selectCallCount += 1;
        const hooked = opts.onSelect?.(table, server.selectCallCount);
        if (hooked) return { data: hooked.data ?? null, error: hooked.error ?? null };

        let rows: Record<string, unknown>[] = [];
        if (table === "user_settings") {
          const s = server.settings.get(userId);
          rows = s ? [{ ...s }] : [];
        } else if (table === "decks") {
          rows = [...server.decks.values()].filter((r) => r.user_id === userId).map((r) => ({ ...r }));
        } else if (table === "cards") {
          rows = [...server.cards.values()].filter((r) => r.user_id === userId).map((r) => ({ ...r }));
        } else if (table === "srs_cards") {
          rows = [...server.srs.values()].filter((r) => r.user_id === userId).map((r) => ({ ...r }));
        } else if (table === "daily_counters") {
          rows = [...server.counters.values()].filter((r) => r.user_id === userId).map((r) => ({ ...r }));
        } else if (table === "review_logs") {
          rows = server.logs.filter((r) => r.user_id === userId).map((r) => ({ ...r }));
        }

        rows = rows.filter((row) => filters.every((f) => f(row)));
        if (orders.length > 0) {
          rows.sort((a, b) => {
            for (const o of orders) {
              const av = a[o.col];
              const bv = b[o.col];
              let cmp = 0;
              if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
              else cmp = String(av ?? "").localeCompare(String(bv ?? ""));
              if (cmp !== 0) return o.ascending ? cmp : -cmp;
            }
            return 0;
          });
        }
        if (Number.isFinite(limitNum)) {
          rows = rows.slice(0, limitNum);
        }
        return { data: rows, error: null };
      };

      const parseQuotedVal = (raw: string) =>
        raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1).replace(/\\"/g, '"') : raw;

      const evalSimpleExpr = (expr: string, row: Record<string, unknown>): boolean => {
        const m = expr.match(/^([a-z_]+)\.(gt|gte|eq)\.(.+)$/);
        if (!m) return true;
        const [, col, op, rawVal] = m;
        const val = parseQuotedVal(rawVal);
        const cur = String(row[col] ?? "");
        if (op === "gt") return cur > val;
        if (op === "gte") return cur >= val;
        return cur === val;
      };

      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: (col: string, val: unknown) => {
          filters.push((r) => r[col] === val);
          return builder;
        },
        gt: (col: string, val: unknown) => {
          filters.push((r) =>
            typeof r[col] === "number" && typeof val === "number"
              ? (r[col] as number) > val
              : String(r[col] ?? "") > String(val),
          );
          return builder;
        },
        gte: (col: string, val: unknown) => {
          filters.push((r) =>
            typeof r[col] === "number" && typeof val === "number"
              ? (r[col] as number) >= val
              : String(r[col] ?? "") >= String(val),
          );
          return builder;
        },
        or: (clause: string) => {
          // Split top-level comma-separated OR branches (respecting nested and(...))
          const branches: string[] = [];
          let depth = 0;
          let buf = "";
          for (const ch of clause) {
            if (ch === "(") depth++;
            if (ch === ")") depth--;
            if (ch === "," && depth === 0) {
              branches.push(buf.trim());
              buf = "";
            } else {
              buf += ch;
            }
          }
          if (buf.trim()) branches.push(buf.trim());

          filters.push((row) =>
            branches.some((b) => {
              if (b.startsWith("and(") && b.endsWith(")")) {
                const inner = b.slice(4, -1);
                const parts = inner.split(",").map((s) => s.trim());
                return parts.every((p) => evalSimpleExpr(p, row));
              }
              return evalSimpleExpr(b, row);
            }),
          );
          return builder;
        },
        order: (col: string, optsArg?: { ascending?: boolean }) => {
          orders.push({ col, ascending: optsArg?.ascending !== false });
          return builder;
        },
        limit: (n: number) => {
          limitNum = n;
          return builder;
        },
        then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
          execSelect().then(resolve, reject),
      };
      return builder;
    };

    return {
      rpc,
      from,
      auth: {
        refreshSession: async () => {
          server.refreshCalls += 1;
          if (opts.onRefreshSession) return opts.onRefreshSession();
          return { error: null };
        },
      },
    } as unknown as SupabaseClient;
  }

  /** Simulasikan penghapusan akun CASCADE di server (untuk uji Task 7). */
  deleteAllUserData(userId: string): void {
    this.settings.delete(userId);
    for (const k of [...this.decks.keys()]) if (k.startsWith(`${userId}::`)) this.decks.delete(k);
    for (const k of [...this.cards.keys()]) if (k.startsWith(`${userId}::`)) this.cards.delete(k);
    for (const k of [...this.srs.keys()]) if (k.startsWith(`${userId}::`)) this.srs.delete(k);
    for (const k of [...this.counters.keys()]) if (k.startsWith(`${userId}::`)) this.counters.delete(k);
    this.logs = this.logs.filter((l) => l.user_id !== userId);
  }

  countAllRowsForUser(userId: string): number {
    let n = this.settings.has(userId) ? 1 : 0;
    for (const r of this.decks.values()) if (r.user_id === userId) n++;
    for (const r of this.cards.values()) if (r.user_id === userId) n++;
    for (const r of this.srs.values()) if (r.user_id === userId) n++;
    for (const r of this.counters.values()) if (r.user_id === userId) n++;
    n += this.logs.filter((l) => l.user_id === userId).length;
    return n;
  }
}
