import { useState } from "react";
import { Link } from "react-router-dom";
import { CURRENT_CONSENT_VERSION, type ProfileRecord } from "../lib/supabase";
import { Button, Icon } from "../ui";

import type { ProfileLoadState } from "../store/useAuthStore";

export interface ConsentCheckOptions {
  profileLoadState?: ProfileLoadState;
  userMetadataConsentVersion?: unknown;
}

export function needsConsentUpdate(
  profile: ProfileRecord | null,
  options?: ConsentCheckOptions,
): boolean {
  if (profile) {
    return profile.consent_version !== CURRENT_CONSENT_VERSION;
  }
  const loadState = options?.profileLoadState;
  if (loadState === "loaded") {
    return true;
  }
  if (loadState === "error") {
    return options?.userMetadataConsentVersion !== CURRENT_CONSENT_VERSION;
  }
  return false;
}

export interface ConsentUpdateModalProps {
  open: boolean;
  onAccept: (patch: { consented_at: string; consent_version: string }) => Promise<{ error: string | null }>;
  onSignOut: () => Promise<void> | void;
}

export default function ConsentUpdateModal({
  open,
  onAccept,
  onSignOut,
}: ConsentUpdateModalProps) {
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open) return null;

  const handleConfirm = async () => {
    if (!checked || busy) return;
    setBusy(true);
    setErrorMsg(null);
    const res = await onAccept({
      consented_at: new Date().toISOString(),
      consent_version: CURRENT_CONSENT_VERSION,
    });
    setBusy(false);
    if (res.error) {
      setErrorMsg(res.error);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="imp-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-update-title"
        style={{ maxWidth: 480 }}
      >
        <header className="imp-head">
          <div>
            <p className="eyebrow">PEMBARUAN PERSETUJUAN AKUN</p>
            <h2 id="consent-update-title">Konfirmasi kebijakan privasi &amp; syarat</h2>
          </div>
        </header>

        <div style={{ display: "grid", gap: "14px", padding: "18px 20px" }}>
          <p style={{ margin: 0, color: "var(--tinta-2)", lineHeight: 1.55 }}>
            Kami memperbarui persetujuan Kebijakan Privasi dan Syarat Penggunaan versi{" "}
            <code>{CURRENT_CONSENT_VERSION}</code> (atau akun Anda masuk lewat OAuth sebelum
            persetujuan tercatat). Silakan tinjau dan setujui untuk melanjutkan belajar.
          </p>

          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              fontSize: "0.875rem",
              color: "var(--tinta)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              disabled={busy}
              style={{ marginTop: "3px" }}
            />
            <span>
              Saya telah membaca dan menyetujui{" "}
              <Link to="/privasi" className="text-[var(--ai)] font-semibold underline">
                Kebijakan Privasi
              </Link>{" "}
              serta{" "}
              <Link to="/syarat" className="text-[var(--ai)] font-semibold underline">
                Syarat Penggunaan
              </Link>
              .
            </span>
          </label>

          {errorMsg && (
            <div className="auth-alert auth-alert-error" role="alert">
              <Icon name="alert" size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              justifyContent: "space-between",
              marginTop: "6px",
            }}
          >
            <Button
              type="button"
              className="btn btn-ghost"
              onClick={() => void onSignOut()}
              disabled={busy}
            >
              Keluar akun
            </Button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ background: "var(--shu)", borderColor: "var(--shu)", color: "#fff" }}
              disabled={!checked || busy}
              onClick={() => void handleConfirm()}
            >
              {busy ? "Menyimpan…" : "Setuju & lanjutkan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
