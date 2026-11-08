# RAINY Agent CRM

Consent-first CRM for publicly sourced real-estate agent directory records and permission-based SMS / Telegram outreach for RAINY FB Pro.

## Stack
- Next.js 15 + TypeScript
- Supabase PostgreSQL
- Railway deployment
- WeSend SMS and Telegram Bot API adapters planned

## Safety model
- Publicly listed contact details are source data, not marketing consent.
- SMS campaigns require explicit, channel-specific consent.
- Telegram messages can only be sent to users who initiated the bot.
- Opt-outs are enforced before every campaign send.
- Do not use phone-number discovery, contact syncing, or unsolicited bulk messaging.
- Respect RE/MAX site terms and applicable Mongolian privacy/communications rules before collecting or using directory data.

## Local setup
1. Install Node.js 20+.
2. `npm install`
3. Copy `.env.example` to `.env.local` and fill Supabase values.
4. Apply `supabase/migrations/0001_initial.sql` in Supabase SQL Editor.
5. `npm run dev`

## Tests
`npm test`

## Current MVP
- Mongolian-language CRM dashboard shell
- Mongolian phone normalization utility
- Channel-specific consent gate
- Campaign recipient eligibility filter
- Initial Supabase schema

## Not yet connected
- Authenticated admin CRUD, reviewed source import, campaign queue, provider delivery webhooks and analytics
- WeSend live API credentials and verified provider contract
- Telegram webhook and bot onboarding

## Secrets
Never commit `.env.local`, SMS API keys, Telegram bot tokens, or Supabase service-role keys.
