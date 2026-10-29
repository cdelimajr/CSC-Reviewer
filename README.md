# CSE Reviewer

Reviewer at mock exam para sa Philippine Civil Service Exam (Career Service Exam), Professional at Subprofessional. Website na gumagana sa computer at phone, may Android app (APK), Windows app (EXE) at iPhone project. **Kailangan ng internet** sa lahat ng bersyon.

## Mga feature
- **Mock exam na kahawig ng totoong CSE:** Professional na 170 tanong sa 3 oras 10 minuto, Subprofessional na 165 tanong sa 2 oras 40 minuto, 4 na pagpipilian (A–D), 80% passing rate, nakahati sa Verbal, Analytical/Clerical, Numerical at General Information.
- **Mga exam set:** may numerong set (Set 1, 2, 3…) na pinipili mula pinakabago hanggang pinakaluma. May bagong set kada linggo (`SET_INTERVAL_DAYS`), at pwedeng gumawa ang admin anumang oras. May "Bagong halo" rin para sa bagong random na set.
- **Libu-libong iba-ibang tanong:** 222 nakasulat na tanong at 43 uri ng generator (math, series, logic, analogy, grammar, Filipino, clerical, mga batas at Konstitusyon), kaya halos hindi umuulit ang exam.
- **Practice kada subject** na may agarang tama/mali at paliwanag (laging libre).
- **Account na may aktibong email:** may verification code sa email, forgot password, email ng resulta pagkatapos ng mock exam, at progress report.
- **Premium (bayad) para sa mock exams:** manual na GCash. Nagbabayad ang user, inilalagay ang reference number, at ang admin ang nag-a-approve. May email sa admin at sa user. Naka-off ito hangga't hindi binubuksan sa Admin → Settings.
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
| `PORT`, `DB_PATH` | Port at lokal na database file |

## I-deploy nang libre (Render + Turso + Brevo)
1. **Turso (database):** gumawa ng database sa turso.tech, kunin ang Database URL at auth token.
2. **Brevo (email):** mag-sign up sa brevo.com (libre, 300 email kada araw). Sa *Senders*, i-verify ang email na gagamitin mong sender. Sa *SMTP & API → API Keys*, gumawa ng API key.
3. **Render (website):** New → Blueprint → piliin ang repo. Ilagay ang `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_EMAIL`, `BREVO_API_KEY` at `MAIL_FROM`.
4. Buksan ang link ng Render at mag-register gamit ang `ADMIN_EMAIL`. Sa Admin → Settings, ilagay ang GCash number at presyo, at i-on ang Premium kapag handa na.

Sa libreng Render plan, natutulog ang server kapag 15 minutong walang gumagamit, kaya mga isang minuto ang unang bukas pagkatapos noon.

## Android, Windows at iPhone apps
Nasa `apps/` ang mga app. Binubuksan nila ang online CSE Reviewer, kaya kailangan munang naka-deploy ito.
1. Sa GitHub repo: **Settings → Secrets and variables → Actions → Variables**, gumawa ng `APP_URL` (hal. `https://cse-reviewer.onrender.com`).
2. Sa **Actions → Build apps → Run workflow**. Pagkatapos ng ilang minuto, nasa **Releases** na ang:
   - `CSE-Reviewer.apk` para sa Android (i-allow ang "Install unknown apps" kapag ini-install).
   - `CSE-Reviewer-…-Setup.exe` at `…-portable.exe` para sa Windows.
   - `CSE-Reviewer-unsigned.ipa` para sa iPhone. Kailangan itong i-sign bago ma-install: gamit ang Apple Developer account ($99 kada taon) para sa App Store/TestFlight, o pang-test gamit ang libreng Apple ID sa Sideloadly/AltStore (7 araw ang bisa).

Para sa Google Play Store, kailangan ng release signing key at Google Play developer account ($25 isang beses).
