import { useState, useEffect } from 'react';
import SignupForm from './components/SignupForm';
import SampleConversation from './components/SampleConversation';

function App() {
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('confirmed') === 'true') {
      setConfirmed(true);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-cream)]">
      {/* Header */}
      <header className="py-8 px-4 text-center border-b border-[var(--color-cream-dark)]">
        <h1 className="text-4xl md:text-5xl text-[var(--color-green-dark)] mb-2">
          Plot Lines
        </h1>
        <p className="text-[var(--color-text-muted)] text-lg">
          Daily garden conversations, delivered to your inbox
        </p>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Confirmation message */}
        {confirmed && (
          <div className="mb-8 p-4 bg-[var(--color-green)] text-white rounded-lg text-center">
            Your subscription is confirmed! Watch for your first garden conversation soon.
          </div>
        )}

        {/* Hero section */}
        <section className="text-center mb-16">
          <h2 className="text-3xl text-[var(--color-green-dark)] mb-6">
            Where fictional gardeners gather to share wisdom
          </h2>
          <p className="text-lg text-[var(--color-text-muted)] max-w-2xl mx-auto leading-relaxed">
            Each morning, a cast of twelve garden characters meet to discuss the day's topic.
            Their conversations — written in the style of literary masters from Hemingway to Morrison —
            land in your inbox, tuned to your local weather and season.
          </p>
        </section>

        {/* Sample conversation */}
        <section className="mb-16">
          <h3 className="text-2xl text-[var(--color-green-dark)] mb-6 text-center">
            A sample conversation
          </h3>
          <SampleConversation />
        </section>

        {/* Signup section */}
        <section className="mb-16">
          <h3 className="text-2xl text-[var(--color-green-dark)] mb-6 text-center">
            Join the garden
          </h3>
          <SignupForm />
        </section>

        {/* Characters section */}
        <section className="mb-16">
          <h3 className="text-2xl text-[var(--color-green-dark)] mb-6 text-center">
            Meet the gardeners
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: 'Buck Thorn', desc: 'Practical and no-nonsense, with decades of dirt under his nails' },
              { name: 'Harry Kvetch', desc: 'Perpetual worrier who sees problems everywhere, endearingly' },
              { name: 'Ms. Canthus', desc: 'Elegant and formal, known to quote poetry at sunrise' },
              { name: 'Poppy Seed', desc: 'Dreamy optimist who tends to wander off-topic beautifully' },
              { name: 'Fern Young', desc: 'New gardener with excellent questions and boundless enthusiasm' },
              { name: 'Edie Bell', desc: 'Elderly and wise, remembers how things used to be done' },
            ].map(char => (
              <div key={char.name} className="p-4 bg-white rounded-lg border border-[var(--color-cream-dark)]">
                <h4 className="font-semibold text-[var(--color-green)]">{char.name}</h4>
                <p className="text-sm text-[var(--color-text-muted)]">{char.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-[var(--color-text-muted)] mt-4">
            Plus six more: Ivy League, Chelsea Flower, Buster Native, Esther Potts, Herb Berryman, and Muso Maple.
          </p>
        </section>

        {/* Author styles section */}
        <section className="mb-16">
          <h3 className="text-2xl text-[var(--color-green-dark)] mb-6 text-center">
            Choose your voice
          </h3>
          <p className="text-center text-[var(--color-text-muted)] mb-6">
            Each conversation is rendered in the style of a literary master:
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              'Hemingway', 'Carver', 'Munro', 'Morrison', 'Oates', 'Lopez',
              'Strout', 'Bass', 'McCarthy', "O'Connor", 'Hurston', 'Saunders'
            ].map(author => (
              <span
                key={author}
                className="px-3 py-1 bg-[var(--color-cream-dark)] rounded-full text-sm text-[var(--color-brown-dark)]"
              >
                {author}
              </span>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 text-center border-t border-[var(--color-cream-dark)] text-[var(--color-text-muted)] text-sm">
        <p>Plot Lines &mdash; Garden conversations, daily</p>
        <p className="mt-2">Weather-aware. Location-based. Literary.</p>
      </footer>
    </div>
  );
}

export default App;
