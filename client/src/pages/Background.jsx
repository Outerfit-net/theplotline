export default function Background() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl text-[var(--color-green-dark)] mb-8">How It Works</h1>

      <div className="space-y-12 text-[var(--color-text-muted)]">

        <section>
          <h2 className="text-xl text-[var(--color-green-dark)] mb-4">The Conversation</h2>
          <p className="leading-relaxed">
            Each morning, a topic is chosen — mulching, deadheading, the first frost, what to do
            with too many zucchinis. Three or four of the twelve characters weigh in. They argue,
            agree reluctantly, go off on tangents, and occasionally say something genuinely useful.
            The result lands in your inbox before you've finished your coffee.
          </p>
        </section>

        <section>
          <h2 className="text-xl text-[var(--color-green-dark)] mb-4">The Characters</h2>
          <div className="space-y-4">
            {[
              { name: 'Buck Thorn', desc: 'Practical, tool-oriented, fixes things. Not interested in why, just how.' },
              { name: 'Harry Kvetch', desc: 'Grumpy, specific complaints, usually right despite himself.' },
              { name: 'Miss Canthus', desc: 'Poetic, immaculate lawn, quotes grass names in Latin without apology.' },
              { name: 'Poppy Seed', desc: 'Enthusiastic about seed trials. Writes in CAPS when excited.' },
              { name: 'Ivy League', desc: 'Horticultural Latin at every opportunity. Professor wife.' },
              { name: 'Chelsea Flower', desc: 'Designer eye. Bulb obsession. Lives by the cross-quarter calendar.' },
              { name: 'Buster Native', desc: 'Native plants only. Xeriscape evangelist. His friend Carlos agrees with everything.' },
              { name: 'Fern Young', desc: 'Experimental. Control groups. Grandmother\'s garden as her north star.' },
              { name: 'Edie Bell', desc: 'Community feeding is the point. Ancestral relationship to soil. Edible everything.' },
              { name: 'Herb Berryman', desc: 'Herbalist, wildcrafting, his wife Rosie appears in every story.' },
              { name: 'Esther Potts', desc: 'Containers only. 40+ pots. Widowed. Gerald\'s pot stand still holds everything.' },
              { name: 'Muso Maple', desc: 'Japanese garden sensibility. 72 micro-seasons. Often just one sentence.' },
            ].map(c => (
              <div key={c.name} className="flex gap-4">
                <div className="w-32 shrink-0 font-medium text-[var(--color-green-dark)]">{c.name}</div>
                <div className="text-sm leading-relaxed">{c.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl text-[var(--color-green-dark)] mb-4">Climate Zones</h2>
          <p className="leading-relaxed mb-4">
            Your letter isn't generic. When you sign up, we detect your climate zone — high plains,
            pacific maritime, humid southeast, uk maritime, and more — and inject that context into
            every conversation. Characters reference your season, your soil challenges, your weather.
          </p>
          <p className="leading-relaxed">
            A Boulder subscriber in February reads about the micro-season "Stirring Below Ice" —
            the 72-division Japanese-influenced calendar applied to Colorado high plains. A subscriber
            in coastal Oregon reads about something entirely different happening in their garden right now.
          </p>
        </section>

        <section>
          <h2 className="text-xl text-[var(--color-green-dark)] mb-4">The Literary Voices</h2>
          <p className="leading-relaxed">
            The same conversation — the same twelve characters, the same topic — can be rendered
            in the style of Hemingway (spare, declarative, subtext doing all the work) or Toni Morrison
            (layered, historical, land as memory) or George Saunders (warm, funny, unexpectedly moving).
            You choose the author when you subscribe. The garden stays the same. The lens changes everything.
          </p>
        </section>

        <section>
          <h2 className="text-xl text-[var(--color-green-dark)] mb-4">FAQ</h2>
          <div className="space-y-6">
            {[
              { q: 'How often does it arrive?', a: 'Once a day, every morning.' },
              { q: 'Can I change my author style?', a: 'Yes, from your account page any time.' },
              { q: 'Is it really different for my location?', a: 'Yes. The weather, season, and soil context are pulled for your actual climate zone each morning.' },
              { q: 'Can I give a subscription as a gift?', a: 'Yes — share your invite link and your friend gets their first month free.' },
              { q: 'How do I unsubscribe?', a: 'Every email has an unsubscribe link at the bottom. No hoops.' },
            ].map(({ q, a }) => (
              <div key={q}>
                <p className="font-medium text-[var(--color-green-dark)] mb-1">{q}</p>
                <p className="text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
