# THE GARDEN — Architecture & Business Plan

*Last Updated: 2026-02-25*
*Infrastructure: Shared with Outerfit LLC (outerfit.net VPS)*

---

## The Concept

Every morning, a cast of garden characters — each powered by a different LLM with a distinct personality — convenes to discuss the day. Their conversation is grounded in real weather data for the subscriber's location and growing region, a daily philosophical quote, and a rolling three-day memory so characters remember what was said before. The exchange closes with a passage written in the style of the subscriber's chosen American author. Currently: Hemingway.

It is absurdist. It is horticultural. It is oddly wise. It already exists — the script works. The business is just delivering it to people who will pay $1.99/week or $3.99/month to read it over their morning coffee.

---

## The Characters

Each character is a distinct LLM persona with a defined voice, worldview, and conversational style. The cast rotates daily — not every character appears every day — which creates anticipation and variety.

| Character | Voice | Worldview | LLM Temperament |
|-----------|-------|-----------|-----------------|
| **Pedantic Ivy** | Over-educated, Latin binomials, footnotes everything | The garden is a rigorous intellectual discipline | Verbose, corrects everyone |
| **Harry Kvetch** | Perpetually aggrieved, everything is harder than it looks | Gardening is suffering and he loves it | Complains beautifully |
| **Poppy Seed Buster** | Native plant evangelist, deeply grounded | The land was here before the garden | Wise, occasionally unsettling |
| **Buck Thorn** | Weathered pragmatist, has done this for 40 years | Just plant the damn thing | Terse, occasionally profound |
| **Chelsea Flower** | Enthusiastic, trend-aware, slightly exhausting | Gardens should be photographed | Breathless, charming |
| **Young Fern** | New to all of this, asks the questions nobody else will | What even is composting | Earnest, occasionally correct |

---

## Product Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         THE GARDEN                                   │
│              A Daily Dispatch from the Garden Ensemble               │
└─────────────────────────────────────────────────────────────────────┘

User signs up
        │
        ▼
Picks their region (USDA hardiness zone or state)
Picks their author voice (Hemingway + more to come)
Picks their frequency (daily or weekly)
        │
        ▼
Every morning at 7am local time:

  1. Weather data pulled for their region (Open-Meteo, free)
  2. Daily quote selected from rotating library
  3. Growing context derived from region + current season
  4. 3-day conversation history loaded
  5. That day's character roster selected (3-4 of 6 characters)
  6. Each character's LLM called with full context
  7. Conversation assembled in narrative order
  8. Hemingway (or chosen author) writes the closing passage
  9. Email rendered and sent via Resend
        │
        ▼
Subscriber reads it with their morning coffee
```

---

## The Output Format

Each daily dispatch follows a consistent structure:

```
THE GARDEN
Wednesday, March 4, 2026
Denver, Colorado — Zone 5b
High 44°F, partly cloudy, light wind from the northwest

"The glory of gardening: hands in the dirt, head in the sun,
heart with nature." — Alfred Austin

─────────────────────────────────────────────────────────────

PEDANTIC IVY: I have noted — and I must insist on noting —
that the Helleborus orientalis you mentioned yesterday,
Buck, is technically in its vernalization period and...

HARRY KVETCH: Again with the Latin. My tomatoes died last
year. Died. In May. Can we talk about that?

YOUNG FERN: Wait, what's vernalization?

BUCK THORN: Cold makes things grow. Keep moving.

PEDANTIC IVY: That is a grotesque oversimplification of
a complex physiological process involving...

HARRY KVETCH: [sighing audibly]

─────────────────────────────────────────────────────────────

The ground was still cold the way ground stays cold long
after the calendar has moved on. The old man knew this.
He had known it for forty years, which is the kind of
knowing that has no argument left in it.

─────────────────────────────────────────────────────────────

Tomorrow: Chelsea Flower joins the conversation.
Zone 5b: Last frost date approximately April 28.
```

---

## Technical Architecture

### Infrastructure

Runs on the same Outerfit LLC VPS (DatabaseMart RTX Pro 4000 Ada). Completely separate codebase and database but shared infrastructure. Zero additional hosting cost.

```
outerfit.net VPS
├── outerfit/          (existing)
│   └── server/
│       └── (outerfit app)
└── thegarden/         (new)
    ├── server/        (Fastify — different port, same machine)
    ├── client/        (React + Vite — signup page only)
    ├── scripts/       (existing LLM conversation script)
    └── data/
        └── garden.db  (SQLite — separate from outerfit.db)
```

Caddy handles both domains on the same machine:

```
# Caddyfile addition
thegarden.email {
    reverse_proxy localhost:3001
}
```

### Tech Stack

| Component | Technology | Notes |
|-----------|------------|-------|
| Signup app | React + Vite | Single page — email, region, author, frequency |
| Backend | Fastify (port 3001) | Separate from outerfit (port 3000) |
| Database | SQLite | garden.db — subscribers, history, preferences |
| LLM calls | Existing script | Already works — wire into job runner |
| Weather | Open-Meteo | Free, already in outerfit stack |
| Email | Resend | Already in outerfit stack |
| Payments | Stripe | Already in outerfit stack — separate product |
| Scheduling | node-cron | Morning dispatch job |
| Domain | thegarden.email (suggested) | Or garden.outerfit.net |

### Database Schema

```sql
-- Subscribers
CREATE TABLE IF NOT EXISTS subscribers (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  email           TEXT NOT NULL UNIQUE,
  name            TEXT,
  region          TEXT NOT NULL,    -- USDA zone: '5b', '9a', etc.
  state           TEXT,             -- US state for weather lookup
  latitude        REAL,             -- for Open-Meteo
  longitude       REAL,
  author_voice    TEXT DEFAULT 'hemingway',
  frequency       TEXT DEFAULT 'daily',  -- 'daily' | 'weekly'
  weekly_day      TEXT DEFAULT 'monday', -- for weekly subscribers
  timezone        TEXT DEFAULT 'America/Denver',
  status          TEXT DEFAULT 'active', -- 'active' | 'paused' | 'cancelled'
  stripe_customer_id TEXT,
  subscription_id TEXT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Conversation history — rolling 3-day memory per subscriber
CREATE TABLE IF NOT EXISTS conversation_history (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  subscriber_id   INTEGER NOT NULL,
  dispatch_date   TEXT NOT NULL,    -- ISO date
  characters      TEXT NOT NULL,    -- JSON array of characters used
  conversation    TEXT NOT NULL,    -- Full conversation text
  author_passage  TEXT NOT NULL,    -- Closing author passage
  weather_summary TEXT,             -- Weather context used
  quote_used      TEXT,             -- Daily quote used
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subscriber_id) REFERENCES subscribers(id)
);

-- Daily dispatch log
CREATE TABLE IF NOT EXISTS dispatch_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  dispatch_date   TEXT NOT NULL,
  subscriber_id   INTEGER NOT NULL,
  status          TEXT DEFAULT 'pending',  -- 'pending' | 'sent' | 'failed'
  resend_id       TEXT,
  error_message   TEXT,
  sent_at         DATETIME,
  FOREIGN KEY (subscriber_id) REFERENCES subscribers(id)
);

-- Quote library
CREATE TABLE IF NOT EXISTS quotes (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  text    TEXT NOT NULL,
  author  TEXT,
  season  TEXT,    -- null = all seasons, or 'spring' | 'summer' | 'autumn' | 'winter'
  topic   TEXT     -- 'growth' | 'patience' | 'weather' | 'time' | 'nature'
);
```

### The Dispatch Engine

```javascript
// scripts/gardenDispatch.js

import cron from 'node-cron'
import { generateConversation } from './gardenConversation.js'  // existing script

// Run at 6am daily — gives time to generate before 7am delivery
cron.schedule('0 6 * * *', async () => {
  const today = new Date().toISOString().split('T')[0]

  // Get all active subscribers due today
  const subscribers = db.execAll(`
    SELECT * FROM subscribers
    WHERE status = 'active'
    AND (
      frequency = 'daily'
      OR (frequency = 'weekly' AND weekly_day = ?)
    )
  `, [getDayName()])

  for (const subscriber of subscribers) {
    try {
      await generateAndSend(subscriber, today)
    } catch (err) {
      log.error({ err, subscriber_id: subscriber.id }, 'Dispatch failed')
      db.run(`
        UPDATE dispatch_log SET status = 'failed', error_message = ?
        WHERE subscriber_id = ? AND dispatch_date = ?
      `, [err.message, subscriber.id, today])
    }
  }
})

async function generateAndSend(subscriber, date) {
  // 1. Get rolling 3-day history
  const history = db.execAll(`
    SELECT * FROM conversation_history
    WHERE subscriber_id = ?
    ORDER BY dispatch_date DESC LIMIT 3
  `, [subscriber.id])

  // 2. Get weather for subscriber location
  const weather = await weatherService.getForecast({
    latitude: subscriber.latitude,
    longitude: subscriber.longitude,
    days: 1
  })

  // 3. Select today's quote
  const quote = selectQuote(weather.condition, getCurrentSeason(subscriber.latitude))

  // 4. Select today's character roster (3-4 of 6)
  const characters = selectCharacters(date, history)

  // 5. Generate conversation (existing script)
  const { conversation, authorPassage } = await generateConversation({
    characters,
    weather: weather.today,
    quote,
    history: history.map(h => h.conversation),
    region: subscriber.region,
    author: subscriber.author_voice,
    season: getCurrentSeason(subscriber.latitude),
  })

  // 6. Save to history
  db.run(`
    INSERT INTO conversation_history
    (subscriber_id, dispatch_date, characters, conversation, author_passage, weather_summary, quote_used)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [subscriber.id, date, JSON.stringify(characters),
      conversation, authorPassage,
      JSON.stringify(weather.today), quote.text])

  // 7. Render and send email
  await emailService.sendGardenDispatch({
    to: subscriber.email,
    name: subscriber.name,
    date,
    location: subscriber.state,
    zone: subscriber.region,
    weather: weather.today,
    quote,
    conversation,
    authorPassage,
    characters,
    author: subscriber.author_voice,
    nextCharacterHint: getNextCharacterHint(characters),
  })

  // 8. Log success
  db.run(`
    UPDATE dispatch_log SET status = 'sent', sent_at = CURRENT_TIMESTAMP
    WHERE subscriber_id = ? AND dispatch_date = ?
  `, [subscriber.id, date])
}
```

### Character Rotation Logic

Characters rotate to create variety and anticipation. Not all six appear every day.

```javascript
function selectCharacters(date, history) {
  const ALL_CHARACTERS = [
    'pedantic_ivy', 'harry_kvetch', 'poppy_seed_buster',
    'buck_thorn', 'chelsea_flower', 'young_fern'
  ]

  // Always include at least Buck Thorn (grounding presence)
  // Always include at least one "voice of confusion" (Young Fern or Harry)
  // Rotate the other 1-2 slots

  const dayOfYear = getDayOfYear(date)
  const rotation  = dayOfYear % 3

  const ROSTERS = [
    ['buck_thorn', 'harry_kvetch', 'pedantic_ivy', 'young_fern'],
    ['buck_thorn', 'chelsea_flower', 'poppy_seed_buster', 'harry_kvetch'],
    ['buck_thorn', 'young_fern', 'pedantic_ivy', 'chelsea_flower'],
  ]

  return ROSTERS[rotation]
}
```

### LLM Character Prompts

Each character is a system prompt passed to a different API call. The existing script handles this — documenting the structure here for reference.

```javascript
const CHARACTER_PROMPTS = {
  pedantic_ivy: `
    You are Pedantic Ivy, a garden character who has a PhD in botany
    from Yale and cannot stop referencing it. You use Latin binomials
    for everything. You are not unkind, just constitutionally incapable
    of simplicity. You remember previous conversations and may reference
    them with footnote-like precision.
  `,

  harry_kvetch: `
    You are Harry Kvetch, a garden character for whom gardening is
    a love language expressed entirely through complaint. Everything
    is harder than it should be. The weather is always wrong. You
    have been at this for thirty years and you wouldn't stop for
    anything. Your complaints are the highest form of devotion.
  `,

  poppy_seed_buster: `
    You are Poppy Seed Buster, a Native American garden character
    with deep knowledge of the land that predates the garden by
    centuries. You speak sparingly. When you speak, people should
    listen. You have a dry, occasionally unsettling humor. You
    remember the three-day history with the patience of someone
    who thinks in seasons, not days.
  `,

  buck_thorn: `
    You are Buck Thorn. You have been gardening for forty years.
    You are not interested in theory. You speak in short sentences.
    You are occasionally profound by accident. You do not explain
    yourself. The land teaches you things and you act on them.
  `,

  chelsea_flower: `
    You are Chelsea Flower, enthusiastic about everything in the
    garden, especially how it photographs. You are aware of trends.
    You are genuinely knowledgeable beneath the enthusiasm, which
    surprises people. You reference Instagram without irony.
    You are charming in a way that occasionally irritates the others.
  `,

  young_fern: `
    You are Young Fern. You are new to gardening. You ask the
    questions that everyone else has forgotten they once had.
    You are earnest. You are occasionally accidentally correct
    in ways that embarrass Pedantic Ivy. You remember the
    three-day history because you wrote everything down.
  `,
}

const AUTHOR_PROMPTS = {
  hemingway: `
    Write a closing passage of 3-5 sentences in the style of
    Ernest Hemingway. Short sentences. No adjectives that do not
    earn their place. The land. The work. What the season means
    to the people in it. Do not mention Hemingway. Just write.
  `,
  // Future: Didion, Thoreau, Morrison, Steinbeck, Berry
}
```

---

## The Signup Page

Single page. No navigation. One job: get an email address, a region, an author, and a frequency.

```
THE GARDEN
A daily dispatch from the ensemble

[Name (optional)]
[Email address]

Your growing region:
○ Northeast (Zones 5-6)
○ Southeast (Zones 7-9)
○ Midwest (Zones 4-6)
○ Southwest (Zones 8-10)
○ Pacific Northwest (Zones 7-9)
○ Mountain West (Zones 3-5)
○ California (Zones 8-11)

Closing author voice:
○ Hemingway (currently the only option — more coming)

Frequency:
○ Daily — $3.99/month
○ Weekly (Monday mornings) — $1.99/month

[Subscribe →]

Sample dispatch ↓
[Show a sample conversation inline]
```

The sample is the conversion tool. If someone reads Harry Kvetch complaining about his tomatoes in the context of their actual local weather, they subscribe.

---

## Business Model

### Pricing

| Tier | Price | Annual equiv | Notes |
|------|-------|-------------|-------|
| Weekly | $1.99/mo | $23.88/yr | Monday morning dispatch |
| Daily | $3.99/mo | $47.88/yr | Every morning |

No free tier. No trial. A sample dispatch on the signup page does the job.

### Unit Economics

| Metric | Value |
|--------|-------|
| LLM cost per dispatch (6 API calls) | ~$0.02-0.05 |
| Email cost per dispatch (Resend) | ~$0.001 |
| Total COGS per dispatch | ~$0.05 |
| Daily subscriber margin | $3.99 - ($0.05 × 30) = $2.49/mo |
| Weekly subscriber margin | $1.99 - ($0.05 × 4) = $1.79/mo |
| Gross margin (blended) | ~60-65% |

At 500 subscribers (60% daily, 40% weekly):
```
Daily:    300 × $3.99  = $1,197/mo gross
Weekly:   200 × $1.99  = $398/mo gross
Total:                   $1,595/mo gross
COGS:                    ~$570/mo
Net:                     ~$1,025/mo
```

Shared infrastructure means zero additional hosting cost beyond the current VPS.

### Scenarios

| Subscribers | Monthly gross | Monthly net | Annual net |
|-------------|--------------|-------------|------------|
| 100 | $319 | $207 | $2,484 |
| 500 | $1,595 | $1,025 | $12,300 |
| 2,000 | $6,380 | $4,100 | $49,200 |
| 10,000 | $31,900 | $20,500 | $246,000 |

10,000 subscribers to a weird garden email newsletter is not an unreasonable ceiling for a product this specific and this good.

### Revenue Note

The existing script is the asset. The distribution is the business. You've already done the hard part.

---

## Marketing

### Who Is This For

People who garden and have a sense of humor. People who don't garden but wish they understood it. People who love the idea of Buck Thorn saying five words that mean more than Pedantic Ivy's three paragraphs. Morning routine people who want something that isn't news.

The Venn diagram of "gardeners" and "people who appreciate absurdist ensemble writing" is smaller than the general population and larger than you'd think.

### Channels

**Substack Notes / gardening newsletters** — The gardening newsletter world is enormous and friendly. Guest appearance in an established garden newsletter is worth ten thousand impressions.

**Reddit** — r/gardening (3.5M members), r/vegetablegardening, r/NativePlantGardening. Don't pitch — post a sample dispatch and let it speak for itself. Harry Kvetch will do the marketing.

**Twitter/X gardening community** — Surprisingly active. Garden Twitter is real and passionate. One good Harry Kvetch thread goes a long way.

**The sample dispatch is the ad.** Build it into the signup page, share it everywhere, let people fall for the characters. If they read to the end of a sample they subscribe.

### The "Author Voice" Expansion as Growth Mechanic

Adding Joan Didion, Wendell Berry, Thoreau, Steinbeck, or Toni Morrison as author voice options is:
- A product release that generates press
- A reason for existing subscribers to share ("they added Didion!")
- A natural upsell hook ("upgrade for access to all author voices")
- A genuine creative challenge that makes the product better

Each new author voice is a marketing event.

---

## Shared Infrastructure Checklist

Everything below leverages existing Outerfit LLC infrastructure at zero additional cost:

```
✅ VPS (DatabaseMart RTX Pro 4000 Ada) — shared
✅ Cloudflare DNS — add thegarden.email (or subdomain)
✅ Caddy SSL — add new domain block
✅ Resend — same account, different from address
✅ Stripe — same account, separate product
✅ Infisical — same account, new environment
✅ Sentry — same account, new project
✅ PM2 — add garden server as second process
✅ R2 backups — include garden.db in backup script
✅ Outerfit LLC — legal entity already exists
✅ Chase Ink Cash — business card already exists
```

New costs:
```
Domain: thegarden.email — ~$15/yr (or use garden.outerfit.net for free)
LLM API costs — scale with subscribers, budgeted above
```

---

## PM2 Configuration Addition

```javascript
// ecosystem.config.js — add alongside outerfit
module.exports = {
  apps: [
    {
      name: 'outerfit',
      script: 'server/index.js',
      cwd: '/home/deploy/outerfit',
    },
    {
      name: 'thegarden',
      script: 'server/index.js',
      cwd: '/home/deploy/thegarden',
    }
  ]
}
```

---

## New Environment Variables

```bash
# The Garden — add to Infisical (separate environment)
GARDEN_PORT=3001
GARDEN_DATABASE_PATH=./data/garden.db
GARDEN_APP_URL=https://thegarden.email

# LLM APIs (for character generation)
OPENAI_API_KEY=...          # GPT-4 for some characters
ANTHROPIC_API_KEY=...       # Claude for others
GEMINI_API_KEY=...          # Already in outerfit stack

# Reuses from outerfit:
# RESEND_API_KEY
# STRIPE_SECRET_KEY
# SENTRY_DSN (separate project)
```

---

## Launch Checklist

```
□ Register domain (thegarden.email or garden.outerfit.net)
□ Add Caddy block for new domain
□ Wire existing garden script into dispatch engine
□ Build SQLite schema (subscribers, history, dispatch_log, quotes)
□ Build signup page (React — simple single page)
□ Stripe products: weekly ($1.99) and daily ($3.99)
□ Resend template: garden dispatch email
□ Cron job: 6am daily dispatch generation
□ Build quote library (start with 100 quotes)
□ Write sample dispatch for signup page
□ Add garden.db to R2 backup script
□ Add thegarden process to PM2
□ Soft launch: send to 10 friends, get Harry Kvetch right
```

---

## The One Thing That Matters

Harry Kvetch has to be funny. If Harry Kvetch is funny, people subscribe. If Harry Kvetch is funny and Buck Thorn is laconic and Young Fern is earnest and Pedantic Ivy is exhaustingly precise — the product sells itself.

The script already works. Ship it.
