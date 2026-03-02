import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import SignupForm from './components/SignupForm';
import PlanSelector from './components/PlanSelector';
import SampleConversation from './components/SampleConversation';
import About from './pages/About';
import Background from './pages/Background';
import Success from './pages/Success';
import Cancel from './pages/Cancel';
import Admin from './pages/Admin';

function Home() {
  const [confirmed, setConfirmed] = useState(false);
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [subscriberData, setSubscriberData] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('confirmed') === 'true') {
      setConfirmed(true);
      setShowPlanSelector(true);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const handlePlanSelectorClose = () => {
    setShowPlanSelector(false);
    setConfirmed(false);
  };

  return (
    <main className="max-w-7xl mx-auto px-8 py-12">
      {confirmed && (
        <div className="mb-8 p-4 bg-[var(--color-green)] text-white rounded-lg text-center">
          Your subscription is confirmed! Choose a plan to start receiving letters.
        </div>
      )}

      {showPlanSelector && subscriberData && (
        <PlanSelector
          email={subscriberData.email}
          subscriberId={subscriberData.id}
          onClose={handlePlanSelectorClose}
        />
      )}

      {/* Two-column top section: content + sticky form */}
      <div className="grid md:grid-cols-2 gap-20 mb-16">
        {/* Left column: Hero + Author Pills + Characters */}
        <div>
          <section className="mb-12">
            <h2 className="text-3xl text-[var(--color-green-dark)] mb-6">
              Where fictional gardeners gather to share wisdom
            </h2>
            <p className="text-lg text-[var(--color-text-muted)] leading-relaxed">
              Each morning, a cast of twelve garden characters meet to discuss the day's topic.
              Their conversations — written in the style of literary masters from Hemingway to Morrison —
              land in your inbox, tuned to your local weather and season.
            </p>
          </section>

          <section className="mb-12">
            <h3 className="text-2xl text-[var(--color-green-dark)] mb-6">Choose your voice</h3>
            <p className="text-[var(--color-text-muted)] mb-6">
              Each conversation is rendered in the style of a literary master:
            </p>
            <div className="flex flex-wrap gap-3">
              {['Hemingway', 'Carver', 'Munro', 'Morrison', 'Oates', 'Lopez',
                'Strout', 'Bass', 'McCarthy', "O'Connor", 'Hurston', 'Saunders'].map(author => (
                <span key={author} className="px-3 py-1 bg-[var(--color-cream-dark)] rounded-full text-sm text-[var(--color-brown-dark)]">
                  {author}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-2xl text-[var(--color-green-dark)] mb-6">Meet the gardeners</h3>
            <div className="grid grid-cols-1 gap-4">
              {[
                { name: 'Buck Thorn', desc: 'Practical and tool-oriented. Fixes things. Not interested in why, just how.' },
                { name: 'Harry Kvetch', desc: 'Grumpy, specific complaints. Usually right despite himself.' },
                { name: 'Miss Canthus', desc: 'Poetic, immaculate lawn. Quotes grass names in Latin without apology.' },
                { name: 'Poppy Seed', desc: 'Enthusiastic about seed trials. Writes in CAPS when excited.' },
                { name: 'Edie Bell', desc: 'Community feeding is the point. Deep ancestral relationship to soil.' },
                { name: 'Muso Maple', desc: 'Japanese garden sensibility. Knows all 72 micro-seasons. Often just one sentence.' },
              ].map(char => (
                <div key={char.name} className="p-4 bg-white rounded-lg border border-[var(--color-cream-dark)]">
                  <h4 className="font-semibold text-[var(--color-green)]">{char.name}</h4>
                  <p className="text-sm text-[var(--color-text-muted)]">{char.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-[var(--color-text-muted)] mt-4 text-sm">
              Plus six more: Ivy League, Chelsea Flower, Buster Native, Esther Potts, Herb Berryman, and Fern Young.
            </p>
          </section>
        </div>

        {/* Right column: Sticky signup form */}
        <div className="md:sticky md:top-12 md:self-start">
          <div className="bg-white rounded-lg border border-[var(--color-cream-dark)] shadow-sm p-8 ml-4">
            <h3 className="text-2xl text-[var(--color-green-dark)] mb-6">Join the garden</h3>
            <SignupForm onSignupSuccess={(data) => {
              setSubscriberData(data);
              setConfirmed(true);
              setShowPlanSelector(true);
            }} />
          </div>
        </div>
      </div>

      {/* Full-width sample conversation section */}
      <section className="mb-16">
        <h3 className="text-2xl text-[var(--color-green-dark)] mb-6 text-center">A sample conversation</h3>
        <SampleConversation />
      </section>
    </main>
  );
}

function Nav() {
  return (
    <header className="py-6 px-4 border-b border-[var(--color-cream-dark)]">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between px-8">
        <Link to="/" className="hover:opacity-90"><img src="/logo-v4.png" alt="The Plot Line" style={{height:"110px", width:"auto"}} /></Link>
        <nav className="flex gap-6 text-sm text-[var(--color-text-muted)]">
          <Link to="/about" className="hover:text-[var(--color-green-dark)]">About</Link>
          <Link to="/how-it-works" className="hover:text-[var(--color-green-dark)]">How it works</Link>
        </nav>
      </div>
      <p className="text-left text-[var(--color-text-muted)] text-base mt-1 px-8">
        Daily garden conversations, delivered to your inbox
      </p>
    </header>
  );
}

function Footer() {
  return (
    <footer className="py-8 px-4 text-center border-t border-[var(--color-cream-dark)] text-[var(--color-text-muted)] text-sm">
      <p>The Plot Line &mdash; Garden conversations, daily</p>
      <p className="mt-2">Weather-aware. Location-based. Literary.</p>
    </footer>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[var(--color-cream)]">
        <Nav />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/how-it-works" element={<Background />} />
          <Route path="/success" element={<Success />} />
          <Route path="/cancel" element={<Cancel />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
