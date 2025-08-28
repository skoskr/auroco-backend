"use client";

import useSWR from "swr";
import { signOut } from "next-auth/react";
import { useState } from "react";

type OrgRole = "OWNER" | "ADMIN" | "MEMBER";
type OrgItem = { id: string; name: string; role: OrgRole };

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => {
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  });

export default function DashboardClient() {
  // SWR sonucunu güçlü şekilde tipe bağlayalım
  const { data, error, isLoading, mutate } = useSWR<OrgItem[]>("/api/orgs", fetcher);

  // data undefined olabilir; güvenli fallback + tip koruması:
  const orgs: OrgItem[] = (data ?? []) as OrgItem[];

  const [saving, setSaving] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");

  async function setActiveOrg(orgId: string) {
    try {
      setSaving(orgId);
      const res = await fetch("/api/session/org", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orgId }),
      });
      if (!res.ok) throw new Error("Aktif org değiştirilemedi");
      // Session callback DB'den okuyor; sayfayı tazelemek en kolayı:
      window.location.reload();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(null);
    }
  }

  async function createOrg() {
    const name = createName.trim();
    if (!name) return;
    try {
      const res = await fetch("/api/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Organizasyon oluşturulamadı");
      setCreateName("");
      mutate(); // listeyi yenile
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <section style={{ padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Organizasyonlar</h2>

      {isLoading && <p>Yükleniyor…</p>}
      {error && <p style={{ color: "crimson" }}>Yüklenemedi (muhtemelen giriş yok).</p>}

      {orgs.length === 0 && !isLoading && !error && <p>Üyeliğin olan organizasyon bulunamadı.</p>}

      {orgs.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: "8px 0 16px 0",
            display: "grid",
            gap: 8,
          }}
        >
          {orgs.map((o: OrgItem) => (
            <li
              key={o.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 12,
                border: "1px solid #eee",
                borderRadius: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{o.name}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>role: {o.role}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>id: {o.id}</div>
              </div>
              <button
                onClick={() => setActiveOrg(o.id)}
                disabled={saving === o.id}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid #111",
                  background: "#111",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                {saving === o.id ? "Kaydediliyor…" : "Aktif yap"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input
          placeholder="Yeni organizasyon adı"
          value={createName}
          onChange={(e) => setCreateName(e.target.value)}
          style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
        />
        <button
          onClick={createOrg}
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid #111",
            background: "#111",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Oluştur
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
        <a
          href="/api/auth/session"
          style={{ fontSize: 13, textDecoration: "underline", opacity: 0.8 }}
        >
          Session JSON’u
        </a>
        <button
          onClick={() => signOut({ callbackUrl: "/signin" })}
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid #d11",
            background: "#f33",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </div>
    </section>
  );
}
