export default function About() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl text-[var(--color-green-dark)] mb-8">About The Plot Line</h1>

      <div className="prose text-[var(--color-text-muted)] space-y-6 leading-relaxed">

        <hr className="border-[var(--color-border)] my-8" />

        <h2 className="text-xl text-[var(--color-green-dark)] mb-4">Contact</h2>
        <p>
          Questions, feedback, or just want to say hi?{' '}
          <a href="mailto:support@theplotline.net" className="text-[var(--color-green)] hover:underline">
            support@theplotline.net
          </a>
        </p>

        <hr className="border-[var(--color-border)] my-8" />

        <h2 className="text-xl text-[var(--color-green-dark)] mb-4">Your Data</h2>
        <p>
          We store only what we need to deliver your letters: your email, location (city/zip for 
          weather), and author preference. That's it. No tracking, no advertising, no selling your 
          data. Ever.
        </p>
        <p className="mt-4">
          <a href="/manage" className="text-[var(--color-green)] hover:underline">
            Delete my data
          </a> — remove your email, location, and preferences from our systems. 
          This cannot be undone.
        </p>

        <hr className="border-[var(--color-border)] my-8" />

        <h2 className="text-xl text-[var(--color-green-dark)] mb-4">Privacy</h2>
        <p>
          We believe privacy isn't a feature — it's the baseline. Your email address is
          encrypted at rest in our database using AES-256 encryption and is never stored
          in plaintext. It is used only to deliver your daily garden letter and for
          essential account communications. We never share, sell, or rent your personal
          information to anyone, ever.
        </p>
        <p>
          Your location (city and state) is used solely to personalize your garden content
          for your climate zone. It is also encrypted at rest. Payment processing is handled
          entirely by Stripe — we never see or store your credit card details. Backups of
          our database are encrypted with GPG before leaving our servers.
        </p>
        <p>
          The Plot Line started the way most things do — with a problem that wouldn't let go.
        </p>
        <p>
          I've been growing things for most of my adult life. Community gardens, backyard plots,
          windowsill herbs that probably don't count. What I always wanted — and never found —
          was a daily letter that felt like eavesdropping on people who really knew what they
          were doing. Not a how-to. Not a listicle. A conversation.
        </p>
        <p>
          So I built one. Twelve fictional gardeners, each with a distinct voice and obsession.
          Buck Thorn who fixes things with wire and duct tape. Miss Canthus who quotes Latin
          grass names like other people quote scripture. Edie Bell, who knows that a garden
          feeds more than just the people in your house. Harry Kvetch, who is almost certainly
          wrong, and absolutely certain he isn't.
        </p>
        <p>
          Every morning they gather — their conversation shaped by your local weather, your
          season, your climate zone — and rendered in the style of a literary author you choose.
          Hemingway. Morrison. Munro. The voice changes. The garden doesn't.
        </p>
        <p>
          I'm matte_d_scry. I've spent 14 years buying seeds I probably shouldn't, leading a
          community garden plot in Boulder, and watching what happens when you put the right
          plant in the wrong place. The Plot Line is what I built when I wanted to read something
          I couldn't find anywhere else.
        </p>
        <p className="text-[var(--color-green-dark)] font-medium">
          — matte_d_scry, Boulder, Colorado
        </p>
      </div>
    </div>
  );
}
