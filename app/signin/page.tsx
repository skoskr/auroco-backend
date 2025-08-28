'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('sefa@example.com');
  const [password, setPassword] = useState('S3fa!pass');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr(null);

    // ÖNEMLİ: redirect:false —> hata/success durumunu JS tarafında yönet
    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl: '/', // başarılı olursa buraya push edeceğiz
    });

    setLoading(false);

    if (res?.error) {
      setErr(res.error || 'Giriş başarısız.');
      return;
    }
    if (res?.ok) {
      router.push(res.url || '/');
    }
  };

  return (
    <main style={{ maxWidth: 360, margin: '72px auto', fontFamily: 'ui-sans-serif, system-ui' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Sign in</h1>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <label>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Email</div>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
          />
        </label>
        <label>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Password</div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
          />
        </label>
        {err && <p style={{ color: 'crimson', fontSize: 13 }}>{err}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #222',
            background: '#111',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 13, opacity: 0.8 }}>
        Hesabın yoksa önce <code>POST /api/auth/signup</code> ile oluştur.
      </p>
    </main>
  );
}
