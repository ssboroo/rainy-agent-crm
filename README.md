# RAINY Agent CRM
Монгол хэл дээрх агентын CRM. Railway + PostgreSQL дээр ажиллана.

## Боломжууд
- Админ session нэвтрэлт, agent CRUD/search
- CSV импорт (5,000 мөр хүртэл), CSV экспорт
- SMS болон Telegram сувгийн тусдаа consent бүртгэл
- Telegram bot deep-link onboarding, inline consent, /stop opt-out
- WeSend SMS (нэг бүрийн idempotency key) болон Telegram campaign send
- SMS unsubscribe холбоос; GET нь зөвхөн баталгаажуулах дэлгэц, POST дарсны дараа opt-out
- Carrier safety: WeSend нь ONDO/Lime зэрэг зарим сүлжээнд SMS холбоосыг хасдаг тул тэдгээр дугаарт илгээхгүй
- Campaign logs, health endpoint

## Environment variables
- DATABASE_URL — Railway Postgres reference
- ADMIN_PASSWORD — админ нууц үг
- SESSION_SECRET — HMAC session secret
- WESEND_API_KEY — WeSend API key (https://wesend.mn/docs)
- TELEGRAM_BOT_TOKEN — BotFather token
- TELEGRAM_WEBHOOK_SECRET — Telegram webhook secret header
- TELEGRAM_BOT_USERNAME — optional; if omitted, bot username is resolved using getMe
- APP_BASE_URL — public HTTPS app URL

## Telegram setup
1. BotFather дээр bot үүсгэж token авна.
2. Railway Variables дээр TELEGRAM_BOT_TOKEN нэмнэ.
3. Админ самбарын Кампанит ажил хэсгээс "Telegram webhook холбох" дарна.
4. Агент бүртгэхэд үүсэх Telegram урилгыг тухайн агент руу явуулна.
5. Агент /start хийж, inline button-оор marketing consent-оо өөрөө зөвшөөрнө. /stop-оор цуцална.

## SMS setup
1. WeSend дээр API key үүсгээд Railway Variables дээр WESEND_API_KEY нэмнэ.
2. Зөвшөөрөл авсан агентын нотолгооны URL/тайлбарыг бүртгэнэ.
3. SMS илгээлтэд нэг бүрийн idempotency key болон хувь хүний unsubscribe link хавсаргана.
4. WeSend carrier link-ийг устгадаг ONDO/Lime болон танигдаагүй prefix-үүдийг хамгаалалтын үүднээс алгасана.

## CSV format
Required headers: `full_name,source_url`
Optional: `office_name,phone,email,profile_url`
Импорт нь зөвшөөрөл импортлохгүй. Opt-in зөвшөөрлийг тусад нь нотолгоотой бүртгэнэ.

## Commands
- `npm test`
- `npm run lint`
- `npm run build`

Public profile phone numbers do not imply marketing consent. No unsolicited bulk outreach.
