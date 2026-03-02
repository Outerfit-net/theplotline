import { useState, useEffect } from 'react';

const API_URL = '/api';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC'
];

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
];

function SignupForm({ onSignupSuccess }) {
  const [email, setEmail]     = useState(() => new URLSearchParams(window.location.search).get('email') || '');
  const [city, setCity]       = useState('');
  const [state, setState]     = useState('');
  const [zipcode, setZipcode] = useState('');
  const [country, setCountry] = useState('US');
  const [author, setAuthor]   = useState('hemingway');
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError]     = useState(null);
  const [turnstileToken, setTurnstileToken] = useState(null);

  // Load Turnstile script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Initialize Turnstile widget when script loads
  useEffect(() => {
    const checkAndRender = () => {
      if (window.turnstile) {
        window.turnstile.render('#turnstile-widget', {
          sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
          callback: (token) => setTurnstileToken(token),
          theme: 'light',
        });
      } else {
        setTimeout(checkAndRender, 100);
      }
    };
    
    checkAndRender();
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/authors`)
      .then(res => res.json())
      .then(data => { if (data.authors) setAuthors(data.authors); })
      .catch(() => setAuthors([
        { key: 'hemingway', name: 'Ernest Hemingway' },
        { key: 'carver', name: 'Raymond Carver' },
        { key: 'munro', name: 'Alice Munro' },
        { key: 'morrison', name: 'Toni Morrison' },
      ]));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setMessage(null); setError(null);
    try {
      const body = { email, city, country, author, cf_turnstile_response: turnstileToken };
      if (country === 'US' && state) body.state = state;
      if (country === 'US' && zipcode) body.zipcode = zipcode;

      const res = await fetch(`${API_URL}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Subscription failed');
      
      setMessage(data.message || 'Check your email to confirm!');
      
      // Pass subscriber data to parent if callback provided
      if (onSignupSuccess) {
        onSignupSuccess({
          email,
          id: data.id,
        });
      }
      
      setEmail(''); setCity(''); setState(''); setZipcode(''); setTurnstileToken(null);
      // Reset Turnstile widget
      if (window.turnstile) {
        window.turnstile.reset('#turnstile-widget');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isUS = country === 'US';

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="bg-white p-5 rounded-lg border border-[var(--color-cream-dark)]">
        {message && (
          <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg text-sm">{message}</div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-lg text-sm">{error}</div>
        )}

        <div className="mb-3">
          <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            className="w-full px-3 py-1.5 border border-[var(--color-cream-dark)] rounded-lg focus:ring-2 focus:ring-[var(--color-green)] outline-none text-sm"
            placeholder="you@example.com" />
        </div>

        <div className="mb-3">
          <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Country</label>
          <select value={country} onChange={e => { setCountry(e.target.value); setState(''); setZipcode(''); }}
            className="w-full px-3 py-1.5 border border-[var(--color-cream-dark)] rounded-lg focus:ring-2 focus:ring-[var(--color-green)] outline-none bg-white text-sm">
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </div>

        <div className={`grid ${isUS ? 'grid-cols-2' : 'grid-cols-1'} gap-4 mb-4`}>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
              {isUS ? 'City' : 'City / Town'}
            </label>
            <input type="text" value={city} onChange={e => setCity(e.target.value)} required
              className="w-full px-3 py-1.5 border border-[var(--color-cream-dark)] rounded-lg focus:ring-2 focus:ring-[var(--color-green)] outline-none text-sm"
              placeholder={isUS ? 'Boulder' : 'Your city'} />
          </div>
          {isUS && (
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">State</label>
              <select value={state} onChange={e => setState(e.target.value)}
                className="w-full px-3 py-1.5 border border-[var(--color-cream-dark)] rounded-lg focus:ring-2 focus:ring-[var(--color-green)] outline-none bg-white text-sm">
                <option value="">Select...</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
        </div>

        {isUS && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">ZIP Code</label>
            <input type="text" value={zipcode} onChange={e => setZipcode(e.target.value)}
              className="w-full px-3 py-1.5 border border-[var(--color-cream-dark)] rounded-lg focus:ring-2 focus:ring-[var(--color-green)] outline-none text-sm"
              placeholder="Optional" />
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">For more accurate weather forecasts</p>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Writing Style</label>
          <select value={author} onChange={e => setAuthor(e.target.value)}
            className="w-full px-3 py-1.5 border border-[var(--color-cream-dark)] rounded-lg focus:ring-2 focus:ring-[var(--color-green)] outline-none bg-white text-sm">
            {authors.map(a => <option key={a.key} value={a.key}>{a.name}</option>)}
          </select>
          <a
            href={`mailto:hello@theplotline.net?subject=Author%20recommendation%20request&body=Hi%2C%20I%27d%20love%20a%20suggestion%20for%20which%20author%20to%20choose.%20My%20email%20is%3A%20${encodeURIComponent(email || '')}%0A%0AWhat%20I%20like%20to%20read%3A%20`}
            className="mt-1 block text-xs text-[var(--color-green)] hover:underline"
          >
            Not sure? Ask us for a recommendation →
          </a>
        </div>

        {/* Cloudflare Turnstile Widget */}
        <div className="mb-4 flex justify-center">
          <div id="turnstile-widget"></div>
        </div>

        <button type="submit" disabled={loading || !turnstileToken}
          className="w-full py-2 px-4 bg-[var(--color-green)] text-white rounded-lg font-medium hover:bg-[var(--color-green-dark)] transition-colors disabled:opacity-50">
          {loading ? 'Subscribing...' : 'Subscribe'}
        </button>

        <p className="mt-4 text-xs text-center text-[var(--color-text-muted)]">
          Free daily delivery. Unsubscribe anytime. US and Canada.
        </p>
      </form>
    </div>
  );
}

export default SignupForm;
