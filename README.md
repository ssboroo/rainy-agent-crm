# RAINY Agent CRM

Монгол хэл дээрх агентын CRM. Railway + PostgreSQL дээр ажиллана.

## Одоогийн боломжууд
- Админ нэвтрэлт (httpOnly, signed session cookie)
- PostgreSQL дээр агент, контакт, сувгийн зөвшөөрөл, кампанит ажлын ноорог хадгалах
- Агент нэмэх, хайх, жагсаах
- Эх сурвалжийн URL заавал бүртгэх
- SMS / Telegram зөвшөөрлийг тусад нь хадгалах, нотолгоогүй зөвшөөрөл үүсгэхийг хориглох
- Кампанит ажлыг ноорог байдлаар хадгалах
- Системийн health endpoint: `/api/health`

## Илгээлтийн хамгаалалт
- Нийтийн профайл дахь утасны дугаар нь сурталчилгааны зөвшөөрөл биш.
- SMS илгээлт зөвхөн тухайн сувгийн нотолгоотой opt-in бүртгэлтэй хэрэглэгчдэд боломжтой байх ёстой.
- Telegram Bot API нь утасны дугаараар хэрэглэгчид эхэлж мессеж бичих боломж олгодоггүй. Хэрэглэгч ботод өөрөө `/start` хийж chat ID үүсгэсэн байх шаардлагатай.
- Бодит SMS / Telegram provider холболт хийгдээгүй тул илгээлт одоогоор зориудаар хаалттай. Кампанит ажил зөвхөн draft хэлбэрээр хадгалагдана.
- Opt-out болон Монгол Улсын холбогдох хууль, REMAX.mn сайтын нөхцөлийг мөрдөнө.

## Railway environment variables
- `DATABASE_URL` — Railway Postgres service reference
- `ADMIN_PASSWORD` — админ нэвтрэх нууц үг
- `SESSION_SECRET` — session HMAC түлхүүр

## Local development
1. Node.js 20+
2. `npm install`
3. Environment variables тохируулна.
4. `npm run dev`

## Tests
`npm test`

## Дараагийн интеграц
- CSV import/export ба duplicate resolution
- WeSend API credentials + delivery callback
- Telegram webhook + bot deep-link onboarding
- Campaign recipient preview, queue, rate limits, per-channel opt-out
- Admin user management, audit log, backup/retention policy

Secrets-ийг GitHub-д commit хийж болохгүй.
