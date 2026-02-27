import { useState, useEffect } from 'react';

const API_URL = '/api';

function SignupForm() {
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [author, setAuthor] = useState('hemingway');
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Fetch authors on mount
  useEffect(() => {
    fetch(`${API_URL}/authors`)
      .then(res => res.json())
      .then(data => {
        if (data.authors) {
          setAuthors(data.authors);
        }
      })
      .catch(err => {
        console.error('Failed to fetch authors:', err);
        // Use fallback
        setAuthors([
          { key: 'hemingway', name: 'Ernest Hemingway' },
          { key: 'carver', name: 'Raymond Carver' },
          { key: 'munro', name: 'Alice Munro' },
          { key: 'morrison', name: 'Toni Morrison' },
        ]);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, city, state, author })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Subscription failed');
      }

      setMessage(data.message || 'Check your email to confirm your subscription!');
      setEmail('');
      setCity('');
      setState('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
  ];

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg border border-[var(--color-cream-dark)]">
        {message && (
          <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg text-sm">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border border-[var(--color-cream-dark)] rounded-lg focus:ring-2 focus:ring-[var(--color-green)] focus:border-transparent outline-none"
            placeholder="you@example.com"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
              City
            </label>
            <input
              type="text"
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              className="w-full px-4 py-2 border border-[var(--color-cream-dark)] rounded-lg focus:ring-2 focus:ring-[var(--color-green)] focus:border-transparent outline-none"
              placeholder="Boulder"
            />
          </div>
          <div>
            <label htmlFor="state" className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
              State
            </label>
            <select
              id="state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              required
              className="w-full px-4 py-2 border border-[var(--color-cream-dark)] rounded-lg focus:ring-2 focus:ring-[var(--color-green)] focus:border-transparent outline-none bg-white"
            >
              <option value="">Select...</option>
              {states.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-6">
          <label htmlFor="author" className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
            Writing Style
          </label>
          <select
            id="author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="w-full px-4 py-2 border border-[var(--color-cream-dark)] rounded-lg focus:ring-2 focus:ring-[var(--color-green)] focus:border-transparent outline-none bg-white"
          >
            {authors.map(a => (
              <option key={a.key} value={a.key}>{a.name}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-6 bg-[var(--color-green)] text-white rounded-lg font-medium hover:bg-[var(--color-green-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Subscribing...' : 'Subscribe'}
        </button>

        <p className="mt-4 text-xs text-center text-[var(--color-text-muted)]">
          Free daily delivery. Unsubscribe anytime.
        </p>
      </form>
    </div>
  );
}

export default SignupForm;
