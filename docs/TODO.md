# The Plot Line — TODO
*Updated: 2026-03-02 12:47 UTC*

## 🔴 Critical — Do These First

- [ ] **End-to-end test** — signup → confirm email → Stripe checkout (BETA-B6F22) → active subscriber in DB
- [ ] **pm2 save** — process ID changed, current state not saved
- [ ] **Architecture docs + runbooks** — always always always after major work

## 🟠 Verify Last Night's Subagent Work

- [ ] Cancel subscription flow working (Manage page, email footer link)
- [ ] Invite a friend / referral working (referrer gets free month on friend's first payment)
- [ ] Gift a subscription working
- [ ] Admin beta invite hardening subagent — did it finish cleanly?
- [ ] Masthead wiring into email — subagent still running at time of writing
- [ ] Tests for Stripe, admin, beta invite — roborev flagged missing
- [ ] Zip code geocoding actually using zip instead of city

## 🔴 About Page (3 items)
- [ ] Contact email — support@theplotline.net displayed on About page
- [ ] Delete my data — self-serve option (removes subscriber record + Stripe customer)
- [ ] Data privacy notification — GDPR/CCPA-style notice on signup + About page

## 🟡 Soon

- [ ] **Free sample form** — city + author → one sample letter, no signup required
  - Cloudflare Turnstile on sample form (separate from signup Turnstile)
  - Rate limit by IP (one sample per IP per 24h)
- [ ] **7-day unconfirmed cleanup** — cron to delete unconfirmed subscribers
- [ ] **Logo background color** — still doesn't match page cream #faf8f5
- [ ] **Subscriber self-serve cancel** — link in daily email footer → Manage page
- [ ] **Diana Gabaldon** author voice — Kay Cee's GF will ask

## 🟢 Backlog

- [ ] Proactive Fluxus generation — all 12 high_plains seasons × weather types (background job)
- [ ] Season definitions for northeast, pacific_maritime, humid_southeast zones
- [ ] Masthead URL stored in DB, served from there (not regenerated)
- [ ] Transfer 22 commercial fonts from Mac to Blackwell
- [ ] Stripe live mode — after business bank account opened
- [ ] outerfit.net Stripe product (same account)
- [ ] Author-voiced season names for all 12 authors (lazy, but prep the UI)
- [ ] Admin UI polish — subscriber list, revenue stats
- [ ] Social strategy — Edie Bell on Reddit, character social presence

## ✅ Done (2026-03-02)

- [x] Stripe checkout + webhook + beta invite system
- [x] Cloudflare Turnstile on signup form (real keys)
- [x] Two-column homepage layout, signup widget prominent
- [x] Zip code field on signup
- [x] Logo generated (Fluxus), banner lockup, favicon
- [x] Logo in header + all email templates
- [x] Subtitle left-justified, aligned with content
- [x] Author-voiced season names (lazy per zone/author)
- [x] Cancel subscription backend + Manage page
- [x] Invite a friend referral system
- [x] Gift a subscription
- [x] Masthead wired into daily email dispatch
- [x] Seedling timing wars topic added to garden wheel
- [x] Kay Cee double-email bug fixed (same-day block)
- [x] Suggest an author mailto link on signup form
- [x] roborev on all three repos
