# Plot Lines — Build TODO
*Generated: 2026-03-01 from reading all docs in /opt/plotlines/docs/*
*This is what the docs describe vs what is actually built. The gap is the work.*

---

## What's Built (Working Now)

- ✅ Subscribe endpoint + DB (subscribers table)
- ✅ Email confirmation flow
- ✅ Climate zone detection (15 zones, 71 Boulder micro-seasons)
- ✅ Resend SMTP wired up + confirmed working
- ✅ Home page with signup form
- ✅ About page
- ✅ How It Works page (all 12 characters, author styles, FAQ)
- ✅ Admin page (password protected, subscriber stats)
- ✅ Daily garden email cron (5:30 AM, Boulder only right now)
- ✅ 12 characters, 12 authors, stateless location

---

## 🔴 Critical — Before Charging Money

### Dispatch Engine (the whole point)
The docs describe a full `GARDEN-CONVERSATION-BACKEND.md` architecture that isn't built yet. Current state: one Python script generating for Boulder/Hemingway only. Need:

- [ ] **Combinations table** — track unique (climate_zone, author) pairs
- [ ] **Daily runs table** — one generation per combination per day, cached
- [ ] **Deliveries table** — one row per subscriber per day
- [ ] **Dispatch cron** (`server/cron/dispatch.js`) — loops combinations → generates → delivers
- [ ] **Loop all confirmed subscribers** not just Boulder
- [ ] **Combination-first approach** — generate once per (zone, author), deliver to all who share it

### Stripe + Payments
- [ ] Stripe account setup
- [ ] Products: one tier — $3.99/month
- [ ] `stripe_customer_id` + `stripe_subscription_id` + `subscription_end_date` + `plan` on subscribers table
- [ ] Checkout flow at signup
- [ ] Stripe Customer Portal (self-service account management — Stripe hosts it)
- [ ] Webhook endpoint: `POST /api/webhooks/stripe`
  - `checkout.session.completed` → activate subscriber
  - `invoice.paid` → extend subscription
  - `invoice.payment_failed` → grace period + warning email
  - `customer.subscription.deleted` → deactivate

### Auth (Google OAuth)
- [ ] Google OAuth2 via passport.js
- [ ] Account page (or redirect to Stripe Customer Portal)
- [ ] Session management (JWT cookies)

---

## 🟡 Important — Before Marketing Push

### Free Sample Funnel
Per PLOT-LINES.md — the sample is the conversion tool:
- [ ] Sample generation endpoint `POST /api/sample` — takes city/state/author → returns prose
- [ ] Email harvesting: give email to get sample (don't show inline)
- [ ] `marketing_subscribers` table (separate from paying subscribers)
- [ ] Marketing email list with CAN-SPAM unsubscribe on every send

### Masthead System
Per `masthead-design.md`:
- [ ] 159 garden fonts already downloaded at `~/Documents/theplotline/fonts/`
- [ ] `generate_masthead.py` script mentioned but not confirmed built
- [ ] Masthead names change with season/weather (The Frost Line, Notes from the Mud, etc.)
- [ ] Lazy generation: generate on first subscriber from that station/author/season/weather
- [ ] Host on glyphmatic.us/mastheads/ CDN
- [ ] Store URL in DB, embed in email header
- [ ] **Total combos:** station × author × season × weather = ~35K possible

### Referral System
- [ ] Unique invite link per subscriber: `theplotline.net/invite/ABC123`
- [ ] Stripe coupon applied on signup via link → first month free
- [ ] Referrer gets billing credit

### Coupon Code System
- [ ] Admin can generate codes
- [ ] Codes embed in invite emails
- [ ] Stripe coupon created on redemption
- [ ] Track usage + expiry in DB

---

## 🟢 Nice to Have

### Author Request Flow
Per `GARDEN-CONVERSATION-BACKEND.md`:
- [ ] Form on website: "Request an author style"
- [ ] `author_requests` table
- [ ] Admin reviews → writes style prompt → activates
- [ ] Requesting subscriber notified

### Legal Pages
- [ ] Privacy Policy
- [ ] Terms of Service  
- [ ] Unsubscribe policy

### Weather-Aware Masthead Names
Per PLOT-LINES.md — rotating newsletter title on masthead:
- Spring: The First Bloom, Sprout Notes, Emergence...
- Summer: High Summer, The Heat Letter, Midseason...
- Fall: The Frost Line, Notes from the Mud, Harvest Letter...
- Winter: The Dormant, Winter Plot, Frost & Folly...

### Scale Architecture (when needed)
Per GARDEN-CONVERSATION-BACKEND.md:
- Option A (now): Sequential, <1000 combos
- Option B (1K-50K): Worker pool with optimistic locking
- Option C (100K+): Queue-based (Redis/SQS)
- Schema already supports B/C — `status` + `worker_id` on daily_runs

---

## README Fixes Needed

The README has outdated/wrong character descriptions:
- Edie Bell: "Elderly, wise, traditional methods" ← WRONG (she's not elderly)
- Harry Kvetch: "Perpetual worrier" ← wrong (he's a grumpy complainer, not anxious)
- Ms. Canthus: "Elegant, formal, quotes poetry" ← partially right but incomplete

---

## Open Questions From Docs

1. **plotlines.com** — is it available? Domain in docs says `plotlines.com` but we have `theplotline.net`
2. ~~Pricing~~ — **DECIDED: $3.99/month, one tier**
3. ~~Weekly tier~~ — **DECIDED: daily only**
4. **Masthead name selection** — subscriber choice or auto-assigned by region?
5. **Author voice as upgrade tier** — Hemingway free, premium for others?

---
*Update as things get built. This is the map.*
