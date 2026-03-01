import { useState, useEffect } from 'react';

export default function Admin() {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem('admin-token'));
  const [password, setPassword] = useState('');
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem('admin-token');

  async function login(e) {
    e.preventDefault();
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (data.ok) {
      localStorage.setItem('admin-token', data.token);
      setAuthed(true);
    } else {
      setError('Wrong password');
    }
  }

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    fetch('/api/admin/stats', { headers: { 'x-admin-token': token } })
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => { setError('Failed to load stats'); setLoading(false); });
  }, [authed]);

  if (!authed) return (
    <div className="max-w-sm mx-auto px-4 py-24">
      <h1 className="text-2xl text-[var(--color-green-dark)] mb-8 text-center">Admin</h1>
      <form onSubmit={login} className="space-y-4">
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full border border-[var(--color-cream-dark)] rounded px-3 py-2"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" className="w-full bg-[var(--color-green)] text-white py-2 rounded">
          Enter
        </button>
      </form>
    </div>
  );

  if (loading) return <div className="text-center py-24 text-[var(--color-text-muted)]">Loading...</div>;
  if (!stats) return <div className="text-center py-24 text-red-500">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl text-[var(--color-green-dark)]">Admin</h1>
        <button
          onClick={() => { localStorage.removeItem('admin-token'); setAuthed(false); }}
          className="text-sm text-[var(--color-text-muted)] underline"
        >
          Sign out
        </button>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {[
          { label: 'Total signups', value: stats.subscribers.total },
          { label: 'Confirmed', value: stats.subscribers.confirmed },
          { label: 'Active', value: stats.subscribers.active },
          { label: 'New today', value: stats.subscribers.newToday },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-[var(--color-cream-dark)] rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-[var(--color-green-dark)]">{value}</div>
            <div className="text-sm text-[var(--color-text-muted)] mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* By climate zone */}
      <section className="mb-12">
        <h2 className="text-xl text-[var(--color-green-dark)] mb-4">Subscribers by region</h2>
        <div className="bg-white border border-[var(--color-cream-dark)] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-cream-dark)]">
              <tr>
                <th className="text-left px-4 py-2 text-[var(--color-brown-dark)]">Climate zone</th>
                <th className="text-right px-4 py-2 text-[var(--color-brown-dark)]">Subscribers</th>
              </tr>
            </thead>
            <tbody>
              {stats.byZone.map(({ climate_zone_id, n }) => (
                <tr key={climate_zone_id} className="border-t border-[var(--color-cream-dark)]">
                  <td className="px-4 py-2">{climate_zone_id || 'unknown'}</td>
                  <td className="px-4 py-2 text-right">{n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent signups */}
      <section>
        <h2 className="text-xl text-[var(--color-green-dark)] mb-4">Recent signups</h2>
        <div className="bg-white border border-[var(--color-cream-dark)] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-cream-dark)]">
              <tr>
                <th className="text-left px-4 py-2 text-[var(--color-brown-dark)]">Email</th>
                <th className="text-left px-4 py-2 text-[var(--color-brown-dark)]">Name</th>
                <th className="text-left px-4 py-2 text-[var(--color-brown-dark)]">Zone</th>
                <th className="text-left px-4 py-2 text-[var(--color-brown-dark)]">When</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentSubs.map((s, i) => (
                <tr key={i} className="border-t border-[var(--color-cream-dark)]">
                  <td className="px-4 py-2">{s.email}</td>
                  <td className="px-4 py-2">{s.name || '—'}</td>
                  <td className="px-4 py-2">{s.climate_zone_id || '—'}</td>
                  <td className="px-4 py-2 text-[var(--color-text-muted)]">{s.created_at?.slice(0,10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-center text-xs text-[var(--color-text-muted)] mt-8">
        Server time: {stats.serverTime}
      </p>
    </div>
  );
}
