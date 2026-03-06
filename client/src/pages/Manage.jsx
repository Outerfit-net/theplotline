import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function Manage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const token = searchParams.get('token');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('status');
  const [referralUrl, setReferralUrl] = useState(null);
  const [giftEmail, setGiftEmail] = useState('');
  const [giftPlan, setGiftPlan] = useState('monthly');
  const [giftSending, setGiftSending] = useState(false);
  const [giftSuccess, setGiftSuccess] = useState(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [canceling, setCanceling] = useState(false);
  
  // Settings form
  const [author, setAuthor] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipcode, setZipcode] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState(null);
  const [country, setCountry] = useState('US');

  const COUNTRIES = [
    { code: 'US', name: 'United States' },
    { code: 'CA', name: 'Canada' },
  ];

  const AUTHORS = [
    { key: 'hemingway', name: 'Ernest Hemingway' },
    { key: 'carver', name: 'Raymond Carver' },
    { key: 'munro', name: 'Alice Munro' },
    { key: 'morrison', name: 'Toni Morrison' },
    { key: 'oates', name: 'Joyce Carol Oates' },
    { key: 'lopez', name: 'Barry Lopez' },
    { key: 'strout', name: 'Elizabeth Strout' },
    { key: 'bass', name: 'Rick Bass' },
    { key: 'mccarthy', name: 'Cormac McCarthy' },
    { key: 'oconnor', name: 'Flannery O\'Connor' },
    { key: 'hurston', name: 'Zora Neale Hurston' },
    { key: 'saunders', name: 'George Saunders' },
  ];

  useEffect(() => {
    if (!email || !token) {
      setError('Missing email or token. Invalid manage link.');
      setLoading(false);
      return;
    }

    const fetchStatus = async () => {
      try {
        const response = await fetch(
          `/api/subscription/status?email=${encodeURIComponent(email)}&token=${token}`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch subscription status');
        }
        const data = await response.json();
        setStatus(data);
        setAuthor(data.author || 'hemingway');
        setCity(data.city || '');
        setState(data.state || '');
        setZipcode(data.zipcode || '');
        setCountry(data.country || 'US');
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [email, token]);

  // Handle hash-based navigation from email links
  useEffect(() => {
    const hash = window.location.hash.substring(1); // Remove #
    if (hash === 'invite' || hash === 'gift' || hash === 'cancel') {
      setActiveTab(hash);
    }
  }, []);

  const fetchReferralLink = async () => {
    try {
      const response = await fetch(
        `/api/referral/link?email=${encodeURIComponent(email)}&token=${token}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch referral link');
      }
      const data = await response.json();
      setReferralUrl(data.url);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    });
  };

  const handleCancelSubscription = async () => {
    if (!cancelConfirm) {
      setCancelConfirm(true);
      return;
    }

    setCanceling(true);
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          token,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }
      const data = await response.json();
      alert(`Subscription canceled. Your access continues until ${status.subscription_end_date}.`);
      setStatus({ ...status, status: 'canceled' });
      setCancelConfirm(false);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setCanceling(false);
    }
  };

  const handleSendGift = async (e) => {
    e.preventDefault();
    if (!giftEmail) {
      alert('Please enter a recipient email address');
      return;
    }

    setGiftSending(true);
    try {
      const response = await fetch('/api/gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gifterEmail: email,
          gifterToken: token,
          recipientEmail: giftEmail,
          plan: giftPlan,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send gift');
      }

      const data = await response.json();
      setGiftSuccess(`Gift sent to ${giftEmail}!`);
      setGiftEmail('');
      setTimeout(() => setGiftSuccess(null), 5000);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setGiftSending(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-8 py-12">
        <p className="text-center text-[var(--color-text-muted)]">Loading subscription information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-8 py-12">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="max-w-2xl mx-auto px-8 py-12">
        <p className="text-center text-[var(--color-text-muted)]">No subscription found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-12">
      <h1 className="text-3xl text-[var(--color-green-dark)] mb-8">Manage Your Subscription</h1>

      <div className="bg-white rounded-lg border border-[var(--color-cream-dark)] p-8 mb-8">
        {/* Subscription Status */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[var(--color-green)]">Current Plan</h2>
          <div className="mt-4 space-y-2">
            <p className="text-[var(--color-text-muted)]">
              <span className="font-semibold">Email:</span> {status.email}
            </p>
            <p className="text-[var(--color-text-muted)]">
              <span className="font-semibold">Plan:</span> {status.plan ? status.plan.charAt(0).toUpperCase() + status.plan.slice(1) : 'N/A'}
            </p>
            <p className="text-[var(--color-text-muted)]">
              <span className="font-semibold">Status:</span>
              <span className={`ml-2 px-2 py-1 rounded text-sm ${
                status.status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : status.status === 'canceled'
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {status.status ? status.status.charAt(0).toUpperCase() + status.status.slice(1) : 'Unknown'}
              </span>
            </p>
            {status.subscription_end_date && (
              <p className="text-[var(--color-text-muted)]">
                <span className="font-semibold">Next billing date:</span> {status.subscription_end_date}
              </p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-[var(--color-cream-dark)] mb-6">
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-3 px-2 border-b-2 transition ${
              activeTab === 'settings'
                ? 'border-[var(--color-green)] text-[var(--color-green)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-green)]'
            }`}
          >
            Settings
          </button>
          <button
            onClick={() => setActiveTab('invite')}
            className={`pb-3 px-2 border-b-2 transition ${
              activeTab === 'invite'
                ? 'border-[var(--color-green)] text-[var(--color-green)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-green)]'
            }`}
          >
            Invite a Friend
          </button>
          <button
            onClick={() => setActiveTab('gift')}
            className={`pb-3 px-2 border-b-2 transition ${
              activeTab === 'gift'
                ? 'border-[var(--color-green)] text-[var(--color-green)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-green)]'
            }`}
          >
            Gift a Subscription
          </button>
          <button
            onClick={() => setActiveTab('cancel')}
            className={`pb-3 px-2 border-b-2 transition ${
              activeTab === 'cancel'
                ? 'border-red-400 text-red-600'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-red-600'
            }`}
          >
            Cancel Subscription
          </button>
        </div>

        {/* Settings */}
        {activeTab === 'settings' && (
          <div>
            <p className="text-[var(--color-text-muted)] mb-6">
              Customize your garden letter experience.
            </p>
            
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-semibold text-[var(--color-green)] mb-2">
                  Writing Style
                </label>
                <select
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--color-cream)] rounded-lg"
                >
                  {AUTHORS.map((a) => (
                    <option key={a.key} value={a.key}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--color-green)] mb-2">
                  Country
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--color-cream)] rounded-lg"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--color-green)] mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--color-cream)] rounded-lg"
                  placeholder="Boulder"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[var(--color-green)] mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-4 py-2 border border-[var(--color-cream)] rounded-lg"
                    placeholder="CO"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[var(--color-green)] mb-2">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={zipcode}
                    onChange={(e) => setZipcode(e.target.value)}
                    className="w-full px-4 py-2 border border-[var(--color-cream)] rounded-lg"
                    placeholder="80301"
                  />
                </div>
              </div>

              <button
                onClick={async () => {
                  setSavingSettings(true);
                  setSettingsMessage(null);
                  try {
                    const res = await fetch('/api/subscription/update', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        email,
                        token,
                        author,
                        city,
                        state,
                        country,
                        zipcode
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error);
                    setSettingsMessage('Settings saved!');
                  } catch (err) {
                    setSettingsMessage('Error: ' + err.message);
                  } finally {
                    setSavingSettings(false);
                  }
                }}
                disabled={savingSettings}
                className="w-full px-4 py-3 bg-[var(--color-green)] text-white rounded-lg hover:bg-[var(--color-green-dark)] transition disabled:opacity-50"
              >
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </button>

              {settingsMessage && (
                <p className={`text-sm ${settingsMessage.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                  {settingsMessage}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Invite a Friend */}
        {activeTab === 'invite' && (
          <div>
            <p className="text-[var(--color-text-muted)] mb-4">
              Invite a friend — you get a free month when they subscribe!
            </p>
            <button
              onClick={fetchReferralLink}
              className="mb-4 px-4 py-2 bg-[var(--color-green)] text-white rounded-lg hover:bg-[var(--color-green-dark)] transition"
            >
              {referralUrl ? 'Refresh Link' : 'Get Your Referral Link'}
            </button>
            {referralUrl && (
              <div className="p-4 bg-[var(--color-cream-dark)] rounded-lg">
                <p className="text-sm text-[var(--color-text-muted)] mb-2">Share this link with friends:</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={referralUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-[var(--color-cream)] rounded-lg bg-white text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(referralUrl)}
                    className="px-3 py-2 bg-[var(--color-green)] text-white text-sm rounded-lg hover:bg-[var(--color-green-dark)] transition"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Gift a Subscription */}
        {activeTab === 'gift' && (
          <div>
            <p className="text-[var(--color-text-muted)] mb-6">
              Send a gift subscription to a friend. They'll receive an email with a gift code and can sign up at their own pace.
            </p>
            <form onSubmit={handleSendGift} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--color-green)] mb-2">
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={giftEmail}
                  onChange={(e) => setGiftEmail(e.target.value)}
                  placeholder="friend@example.com"
                  className="w-full px-4 py-2 border border-[var(--color-cream)] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--color-green)] mb-2">
                  Plan
                </label>
                <select
                  value={giftPlan}
                  onChange={(e) => setGiftPlan(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--color-cream)] rounded-lg"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={giftSending}
                className="w-full px-4 py-3 bg-[var(--color-green)] text-white rounded-lg hover:bg-[var(--color-green-dark)] transition disabled:opacity-50"
              >
                {giftSending ? 'Sending...' : 'Send Gift'}
              </button>
              {giftSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                  ✓ {giftSuccess}
                </div>
              )}
            </form>
          </div>
        )}

        {/* Cancel Subscription */}
        {activeTab === 'cancel' && (
          <div>
            {status.status === 'canceled' ? (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-[var(--color-text-muted)]">
                  Your subscription has been canceled. You have access through <strong>{status.subscription_end_date}</strong>.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-[var(--color-text-muted)] mb-6">
                  We're sorry to see you go! Your access will continue until <strong>{status.subscription_end_date}</strong>.
                </p>
                {!cancelConfirm ? (
                  <button
                    onClick={handleCancelSubscription}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    Cancel Subscription
                  </button>
                ) : (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 font-semibold mb-4">Are you sure?</p>
                    <p className="text-red-700 mb-6 text-sm">
                      Canceling your subscription is permanent. You'll lose access after {status.subscription_end_date}.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={handleCancelSubscription}
                        disabled={canceling}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                      >
                        {canceling ? 'Canceling...' : 'Yes, Cancel'}
                      </button>
                      <button
                        onClick={() => setCancelConfirm(false)}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
                      >
                        Keep Subscription
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
