"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * AURORA IDENTITY DIAGNOSTIC PAGE
 *
 * Open this page on BOTH phone and laptop after Google login:
 * https://aurora-memory-vault.netlify.app/debug-identity
 *
 * Compare the output. If user.id differs → Supabase auth identity is split.
 * If user.id is same but memories differ → data ownership bug.
 */

interface DiagResult {
  authUserId: string | null;
  authEmail: string | null;
  authProvider: string | null;
  sessionUserId: string | null;
  profileId: string | null;
  profileName: string | null;
  profileAvatar: string | null;
  memoryCount: number;
  memoryUserIds: string[];
  memorySample: { id: string; user_id: string; title: string; created_at: string }[];
  localStorageKeys: string[];
  rawError: string | null;
  timestamp: string;
}

export default function DebugIdentityPage() {
  const [result, setResult] = useState<DiagResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function run() {
      const out: DiagResult = {
        authUserId: null,
        authEmail: null,
        authProvider: null,
        sessionUserId: null,
        profileId: null,
        profileName: null,
        profileAvatar: null,
        memoryCount: 0,
        memoryUserIds: [],
        memorySample: [],
        localStorageKeys: [],
        rawError: null,
        timestamp: new Date().toISOString(),
      };

      try {
        const supabase = createClient();

        // ── 1. Auth identity ─────────────────────────────────────────────────
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr) out.rawError = userErr.message;
        const authUser = userData?.user;
        out.authUserId = authUser?.id ?? null;
        out.authEmail = authUser?.email ?? null;
        out.authProvider =
          authUser?.app_metadata?.provider ??
          authUser?.identities?.[0]?.provider ??
          null;

        const { data: sessionData } = await supabase.auth.getSession();
        out.sessionUserId = sessionData?.session?.user?.id ?? null;

        // ── 2. Profile ───────────────────────────────────────────────────────
        if (authUser?.id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .eq("id", authUser.id)
            .maybeSingle();

          out.profileId = profile?.id ?? null;
          out.profileName = profile?.full_name ?? null;
          out.profileAvatar = profile?.avatar_url
            ? profile.avatar_url.substring(0, 80) + "..."
            : null;
        }

        // ── 3. Memories ──────────────────────────────────────────────────────
        if (authUser?.id) {
          const { data: mems, error: memErr } = await supabase
            .from("memories")
            .select("id, user_id, title, created_at")
            .eq("user_id", authUser.id)
            .order("created_at", { ascending: false })
            .limit(10);

          if (memErr) out.rawError = (out.rawError ?? "") + " | memories: " + memErr.message;
          if (mems) {
            out.memoryCount = mems.length;
            out.memorySample = mems.map((m) => ({
              id: m.id,
              user_id: m.user_id,
              title: m.title,
              created_at: m.created_at,
            }));
            const uids = [...new Set(mems.map((m) => m.user_id))];
            out.memoryUserIds = uids;
          }
        }

        // ── 4. localStorage keys ─────────────────────────────────────────────
        try {
          out.localStorageKeys = Object.keys(localStorage).filter((k) =>
            k.startsWith("aurora_")
          );
        } catch {}
      } catch (e: any) {
        out.rawError = String(e?.message ?? e);
      }

      setResult(out);
      setLoading(false);
    }
    run();
  }, []);

  const Row = ({ label, value, highlight }: { label: string; value: string | null | number; highlight?: boolean }) => (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "8px 12px",
        background: highlight ? "rgba(56,189,248,0.12)" : "rgba(255,255,255,0.04)",
        borderRadius: 8,
        marginBottom: 4,
        borderLeft: highlight ? "3px solid #38bdf8" : "3px solid transparent",
      }}
    >
      <span style={{ color: "#94a3b8", minWidth: 200, fontSize: 12, fontWeight: 600, fontFamily: "monospace" }}>
        {label}
      </span>
      <span
        style={{
          color: value ? "#e2e8f0" : "#ef4444",
          fontSize: 12,
          fontFamily: "monospace",
          wordBreak: "break-all",
        }}
      >
        {value !== null && value !== undefined ? String(value) : "❌ NULL / MISSING"}
      </span>
    </div>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#030712",
        color: "white",
        padding: "24px 16px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, color: "#38bdf8" }}>
          🔍 Aurora Identity Diagnostic
        </h1>
        <p style={{ fontSize: 12, color: "#64748b", marginBottom: 24 }}>
          Open on BOTH phone and laptop. Compare all values. They MUST be identical for same Gmail.
        </p>

        {loading && (
          <p style={{ color: "#94a3b8", fontSize: 14 }}>Running diagnostics...</p>
        )}

        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Identity */}
            <section>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: "#38bdf8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                1 — Auth Identity (MUST MATCH on all devices)
              </h2>
              <Row label="auth.getUser().id" value={result.authUserId} highlight />
              <Row label="auth.getUser().email" value={result.authEmail} highlight />
              <Row label="auth.getUser().provider" value={result.authProvider} />
              <Row label="getSession().user.id" value={result.sessionUserId} />
              <Row label="Timestamp" value={result.timestamp} />

              {result.authUserId && result.sessionUserId && result.authUserId !== result.sessionUserId && (
                <div style={{ padding: 12, background: "#7f1d1d", borderRadius: 8, color: "#fca5a5", fontSize: 13, marginTop: 8 }}>
                  ⚠️ MISMATCH: getUser().id ≠ getSession().user.id — session may be stale
                </div>
              )}
            </section>

            {/* Profile */}
            <section>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                2 — Profile (MUST MATCH on all devices)
              </h2>
              <Row label="profile.id (cloud)" value={result.profileId} highlight />
              <Row label="profile.full_name" value={result.profileName} />
              <Row label="profile.avatar_url (truncated)" value={result.profileAvatar} />

              {result.authUserId && result.profileId && result.authUserId !== result.profileId && (
                <div style={{ padding: 12, background: "#7f1d1d", borderRadius: 8, color: "#fca5a5", fontSize: 13, marginTop: 8 }}>
                  🚨 CRITICAL: auth.user.id ≠ profile.id — wrong profile being loaded!
                </div>
              )}
              {result.authUserId && !result.profileId && (
                <div style={{ padding: 12, background: "#7f1d1d", borderRadius: 8, color: "#fca5a5", fontSize: 13, marginTop: 8 }}>
                  ⚠️ NO PROFILE FOUND in Supabase for this auth user.id
                </div>
              )}
            </section>

            {/* Memories */}
            <section>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                3 — Memories (MUST MATCH on all devices)
              </h2>
              <Row label="memories.count (cloud, eq user_id)" value={result.memoryCount} highlight />
              <Row label="distinct memory.user_id values" value={result.memoryUserIds.join(", ") || "none"} />
              {result.memorySample.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <p style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Last 10 memories from cloud (WHERE user_id = auth.user.id):</p>
                  {result.memorySample.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        padding: "6px 10px",
                        background: "rgba(255,255,255,0.03)",
                        borderRadius: 6,
                        marginBottom: 3,
                        fontSize: 11,
                        fontFamily: "monospace",
                        color: "#94a3b8",
                      }}
                    >
                      {m.id.substring(0, 8)}... | user_id: {m.user_id.substring(0, 8)}... | {m.title} | {new Date(m.created_at).toLocaleString("en-US", { hour12: true })}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* localStorage */}
            <section>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: "#fb923c", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                4 — LocalStorage Aurora Keys (this device only)
              </h2>
              {result.localStorageKeys.length === 0 ? (
                <Row label="aurora_* keys" value="none (clean)" />
              ) : (
                result.localStorageKeys.map((k) => (
                  <Row key={k} label={k} value="present" />
                ))
              )}
            </section>

            {/* Errors */}
            {result.rawError && (
              <section>
                <h2 style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                  Errors
                </h2>
                <div style={{ padding: 12, background: "#7f1d1d", borderRadius: 8, color: "#fca5a5", fontSize: 13 }}>
                  {result.rawError}
                </div>
              </section>
            )}

            {/* Summary verdict */}
            <section style={{ padding: 16, background: "rgba(255,255,255,0.04)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>
                📋 Copy this full block and share for comparison
              </h2>
              <pre
                style={{
                  fontSize: 11,
                  color: "#94a3b8",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                  fontFamily: "monospace",
                  lineHeight: 1.6,
                }}
              >
                {JSON.stringify(result, null, 2)}
              </pre>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
