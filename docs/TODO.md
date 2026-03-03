# The Plot Line — TODO
*Updated: 2026-03-02 18:41 UTC*

## 🔴 Critical

- [ ] **e2e test** — signup → confirm email → Stripe checkout (BETA-B6F22) → active subscriber in DB
  - *Blocked by Turnstile. Fix: set `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA` in test env*
- [x] pm2 save
- [x] Architecture docs + RUNBOOK.md

## 🟠 Verify Last Night's Subagent Work

- [x] Cancel subscription flow — backend ✅, Manage page ✅, email footer link ✅
- [x] Invite a friend / referral — backend ✅, Manage page ✅
- [x] Gift a subscription — backend ✅, Manage page ✅, gift email ✅
- [x] Admin beta invite — hardened (requires ADMIN_SECRET + STRIPE_BETA_COUPON_ID) ✅
- [x] Masthead wired into email — lazy generated, cached, /mastheads/ served ✅
- [x] Zip code geocoding — uses zip over city when provided ✅
- [x] Tests for Stripe webhook, admin auth, beta invite, gift — 87 passing

## 🔴 About Page
- [x] Contact email — support@theplotline.net
- [x] Delete my data — /manage link
- [x] Privacy notice — added to signup form

## 🟡 Soon

- [ ] **Tests** — Stripe webhook, admin routes, beta invite (roborev flagged)
- [ ] **e2e test** — unblock by adding Turnstile test mode to .env
- [ ] **Free sample form** — city + author → one sample letter, no signup, Turnstile + IP rate limit
- [ ] **7-day unconfirmed cleanup** — cron to purge unconfirmed subscribers
- [ ] **Logo background color** — doesn't match page cream #faf8f5
- [x] Diana Gabaldon, Kurt Vonnegut, Tom Robbins — added (15 authors total)

## 🟢 Backlog

- [ ] Proactive Fluxus generation — all 12 high_plains seasons × weather types
- [ ] Season definitions for northeast, pacific_maritime, humid_southeast zones
- [ ] Masthead URL stored in DB (not regenerated per dispatch)
- [ ] Transfer 22 commercial fonts from Mac to Blackwell
- [ ] Stripe live mode — after business bank account opened
- [ ] outerfit.net Stripe product (same account)
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
- [x] Architecture docs + RUNBOOK.md updated
- [x] GDPR/privacy notice on signup form
- [x] Seedling timing wars topic added to garden wheel
- [x] Kay Cee double-email bug fixed (same-day block)
- [x] Suggest an author mailto link on signup form
- [x] roborev on all three repos
