// app/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DashboardClient from "@/components/dashboard-client"; 

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16, fontFamily: "ui-sans-serif, system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Auro • Dashboard</h1>
      {!session ? (
        <p>
          Giriş yapılmamış. <a href="/signin" style={{ textDecoration: "underline" }}>Sign in</a>
        </p>
      ) : (
        <>
          <section style={{ padding: 16, border: "1px solid #eee", borderRadius: 12, marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Oturum</h2>
            <div style={{ lineHeight: 1.6 }}>
              <div><strong>Ad:</strong> {session.user?.name ?? "—"}</div>
              <div><strong>Email:</strong> {session.user?.email ?? "—"}</div>
              <div><strong>Kullanıcı ID:</strong> {(session.user as any)?.id ?? "—"}</div>
              <div><strong>Aktif Org:</strong> {(session.user as any)?.currentOrgId ?? "—"}</div>
              <div><strong>Rol:</strong> {(session.user as any)?.role ?? "—"}</div>
            </div>
          </section>

          {/* Org listesi + aktif org değiştirme + sign out */}
          <DashboardClient />
        </>
      )}
    </main>
  );
}
