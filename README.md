# CSE Reviewer

Reviewer at mock exam para sa Philippine Civil Service Exam (Career Service Exam), Professional at Subprofessional. Website na gumagana sa computer at phone, may Android app (APK), Windows app (EXE) at iPhone project. **Gumagana kahit offline** pagkatapos ng unang login.

## Mga feature
- **Mock exam na kahawig ng totoong CSE:** Professional na 170 tanong sa 3 oras 10 minuto, Subprofessional na 165 tanong sa 2 oras 40 minuto, 4 na pagpipilian (A–D), 80% passing rate, nakahati sa Verbal, Analytical/Clerical, Numerical at General Information.
- **Mga exam set:** may numerong set (Set 1, 2, 3…) na pinipili mula pinakabago hanggang pinakaluma. May bagong set kada linggo (`SET_INTERVAL_DAYS`), at pwedeng gumawa ang admin anumang oras. May "Bagong halo" rin para sa bagong random na set.
- **Libu-libong iba-ibang tanong:** 222 nakasulat na tanong at 43 uri ng generator (math, series, logic, analogy, grammar, Filipino, clerical, mga batas at Konstitusyon), kaya halos hindi umuulit ang exam.
- **Practice kada subject** na may agarang tama/mali at paliwanag (laging libre).
- **Account na may aktibong email:** may verification code sa email, forgot password, email ng resulta pagkatapos ng mock exam, at progress report.
- **Premium (bayad) para sa mock exams:** online na bayad sa Xendit (GCash, Maya, card, bank transfer, at iba pa). Awtomatikong bubukas o mae-extend ang Premium pagkabayad, at may email sa user. Pwede pa rin ang manual na GCash (reference number, admin ang nag-a-approve) kapag may GCash number sa Admin → Settings. Naka-off ang Premium hangga't hindi binubuksan sa Admin → Settings.
- **Libre at Premium:** kapag naka-on ang Premium (Admin → Settings), online lang ang libreng plan at may limit: 3 practice kada araw (hanggang 20 tanong), at Set 1 lang ng bawat mock exam. Nababago ng admin ang mga limit na ito. Sa Premium: walang limit, lahat ng exam set at Bagong halo, at gumagana offline. Kapag naka-off ang Premium, lahat ay may Premium features.
- **Mabilis at offline (Premium):** nase-save sa device ang app, 200 tanong kada subject, at ang 5 pinakabagong exam set kada level. Agad bumubukas ang app at ang mga exam (hindi na hinihintay ang server), online man o offline. Ise-save online ang mga resulta sa background, at kumukuha ito ng bagong tanong tuwing 6 na oras. Kailangang mag-online kahit isang beses bawat 30 araw. Kailangan pa rin ng internet para sa login, email, at bayad.
- **Gising ang server:** sa Render, binibisita ng server ang sarili nito bawat 10 minuto para hindi ito matulog (`KEEP_AWAKE=0` para i-off).
- **Admin panel:** overview, payments, users (gawing admin, Premium, i-disable, reset password, report), exam sets, mga tanong (dagdag/edit/import), resulta, settings.

> Hindi inilalabas ng CSC ang eksaktong bilang ng tanong kada subject, kaya tantiya ang hati. Hindi ito opisyal na produkto ng Civil Service Commission.

## Patakbuhin sa sariling computer
Kailangan: Node.js 20 o mas bago.
```bash
npm install
npm start          # http://localhost:3000
npm test           # automated test
```
Kapag walang `TURSO_DATABASE_URL`, gumagamit ito ng lokal na SQLite file sa `data/`. Kapag walang email provider, hindi hinihingi ang verification at lumalabas sa server log ang mga email. Ang unang account ay magiging **admin** (o itakda ang `ADMIN_EMAIL`).

## Settings (environment variables)
| Variable | Gamit |
|---|---|
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Turso database |
| `ADMIN_EMAIL` | Ang account na may ganitong email ay magiging admin |
| `ADMIN_PASSWORD` | Kung kasama ng `ADMIN_EMAIL`, gagawa agad ng verified na admin account |
| `BREVO_API_KEY` | Brevo API key para makapagpadala ng email (o `RESEND_API_KEY` para sa Resend) |
| `MAIL_FROM`, `MAIL_FROM_NAME` | Email at pangalan ng nagpapadala (dapat verified sa Brevo) |
| `REQUIRE_EMAIL_VERIFICATION` | `1` o `0`; default ay `1` kapag may email provider |
| `SET_INTERVAL_DAYS` | Ilang araw bago gumawa ng bagong exam set (default 7, `0` para i-off) |
| `INITIAL_SETS` | Ilang set ang unang gagawin kada level (default 5) |
| `XENDIT_SECRET_KEY` | Secret API key ng Xendit (Settings → API Keys, may "Money-in" write permission). Kapag may laman, naka-on ang online na bayad |
| `XENDIT_CALLBACK_TOKEN` | Webhook verification token ng Xendit (Settings → Webhooks). Dito chine-check na totoo ang abiso ng bayad |
| `XENDIT_PAYMENT_METHODS` | Opsyonal: limitahan ang mga paraan ng bayad, hal. `GCASH,PAYMAYA,CREDIT_CARD` (default: lahat ng naka-on sa Xendit) |
| `APP_URL` | Opsyonal: public address na babalikan pagkatapos magbayad (default: ang Render address) |
| `PORT`, `DB_PATH` | Port at lokal na database file |

## I-deploy nang libre (Render + Turso + Brevo)
1. **Turso (database):** gumawa ng database sa turso.tech, kunin ang Database URL at auth token.
2. **Brevo (email):** mag-sign up sa brevo.com (libre, 300 email kada araw). Sa *Senders*, i-verify ang email na gagamitin mong sender. Sa *SMTP & API → API Keys*, gumawa ng API key.
3. **Render (website):** New → Blueprint → piliin ang repo. Ilagay ang `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_EMAIL`, `BREVO_API_KEY` at `MAIL_FROM`.
4. Buksan ang link ng Render at mag-register gamit ang `ADMIN_EMAIL`. Sa Admin → Settings, ilagay ang presyo, at i-on ang Premium kapag handa na.
5. **Xendit (online na bayad):** sa dashboard.xendit.co, kunin ang secret key sa *Settings → API Keys* at ang verification token sa *Settings → Webhooks*. Sa *Webhooks → Invoices → Invoice paid*, ilagay ang `https://<render-address>/api/payments/xendit/webhook`. Ilagay ang `XENDIT_SECRET_KEY` at `XENDIT_CALLBACK_TOKEN` sa Render. Subukan muna gamit ang Test mode keys, saka palitan ng Live keys.

Sa libreng Render plan, natutulog ang server kapag 15 minutong walang gumagamit, kaya mga isang minuto ang unang bukas pagkatapos noon.

## Android, Windows at iPhone apps
Nasa `apps/` ang mga app. Kasama na sa loob ng app ang mga screen (kinokopya mula sa `public/`), kaya bumubukas ito kahit offline. Kumokonekta ito sa online CSE Reviewer para mag-login, kumuha ng bagong tanong, at mag-save ng resulta, kaya kailangan munang naka-deploy ito. Kapag binago ang `public/`, gumawa ng bagong build para makuha ito ng mga app.
1. Sa GitHub repo: **Settings → Secrets and variables → Actions → Variables**, gumawa ng `APP_URL` (hal. `https://cse-reviewer-7lmg.onrender.com`).
2. Sa **Actions → Build apps → Run workflow**. Pagkatapos ng ilang minuto, nasa **Releases** na ang:
   - `CSE-Reviewer.apk` para sa Android (i-allow ang "Install unknown apps" kapag ini-install).
   - `CSE-Reviewer-…-Setup.exe` at `…-portable.exe` para sa Windows.
   - `CSE-Reviewer-unsigned.ipa` para sa iPhone. Kailangan itong i-sign bago ma-install: gamit ang Apple Developer account ($99 kada taon) para sa App Store/TestFlight, o pang-test gamit ang libreng Apple ID sa Sideloadly/AltStore (7 araw ang bisa).

Para sa Google Play Store, kailangan ng release signing key at Google Play developer account ($25 isang beses).
