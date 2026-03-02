import { Link } from 'react-router-dom';

function Success() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg border border-[var(--color-cream-dark)] p-8 text-center">
        <div className="text-5xl mb-6">🌿</div>
        <h1 className="text-3xl font-semibold text-[var(--color-green-dark)] mb-4">
          You're subscribed!
        </h1>
        <p className="text-lg text-[var(--color-text-muted)] mb-8">
          First letter arrives tomorrow morning. <br />
          <span className="text-sm">Watch your inbox closely.</span>
        </p>
        <Link
          to="/"
          className="inline-block py-3 px-6 bg-[var(--color-green)] text-white rounded-lg font-medium hover:bg-[var(--color-green-dark)] transition-colors"
        >
          Back Home
        </Link>
      </div>
    </div>
  );
}

export default Success;
