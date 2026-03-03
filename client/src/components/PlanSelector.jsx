import { useState } from 'react';

function PlanSelector({ email, subscriberId, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSelectPlan = async (plan) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          plan,
          subscriberId,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create checkout');

      // Dismiss modal then redirect
      if (onClose) onClose();
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-8">
        <h2 className="text-2xl font-semibold text-[var(--color-green-dark)] mb-2">
          Choose Your Subscription Plan
        </h2>
        <p className="text-[var(--color-text-muted)] mb-6">
          Get daily garden conversations delivered to your inbox
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-lg text-sm">{error}</div>
        )}

        <div className="space-y-4 mb-6">
          {/* Weekly Plan */}
          <button
            onClick={() => handleSelectPlan('weekly')}
            disabled={loading}
            className="w-full p-4 border-2 border-[var(--color-cream-dark)] rounded-lg hover:border-[var(--color-green)] hover:bg-green-50 transition-all text-left disabled:opacity-50"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-[var(--color-green-dark)]">Weekly</h3>
                <p className="text-sm text-[var(--color-text-muted)]">Billed weekly</p>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-[var(--color-green)]">$1.99</div>
                <div className="text-xs text-[var(--color-text-muted)]">per week</div>
              </div>
            </div>
          </button>

          {/* Monthly Plan */}
          <button
            onClick={() => handleSelectPlan('monthly')}
            disabled={loading}
            className="w-full p-4 border-2 border-[var(--color-green)] rounded-lg bg-green-50 hover:border-[var(--color-green-dark)] transition-all text-left disabled:opacity-50 relative"
          >
            <div className="absolute top-2 right-2">
              <span className="inline-block bg-[var(--color-green)] text-white text-xs px-2 py-1 rounded-full">
                Save 50%
              </span>
            </div>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-[var(--color-green-dark)]">Monthly</h3>
                <p className="text-sm text-[var(--color-text-muted)]">Billed monthly</p>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-[var(--color-green)]">$3.99</div>
                <div className="text-xs text-[var(--color-text-muted)]">per month</div>
              </div>
            </div>
          </button>
        </div>

        {loading && (
          <p className="text-center text-[var(--color-text-muted)] text-sm">
            Redirecting to checkout...
          </p>
        )}

        {!loading && (
          <button
            onClick={onClose}
            className="w-full py-2 text-[var(--color-text-muted)] hover:text-[var(--color-green-dark)] transition-colors text-sm"
          >
            Maybe later
          </button>
        )}
      </div>
    </div>
  );
}

export default PlanSelector;
