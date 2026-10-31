# CSE Reviewer

Reviewer at mock exam para sa Philippine Civil Service Exam (Career Service Exam), Professional at Subprofessional. Website na gumagana sa computer at phone, may Android app (APK), Windows app (EXE) at iPhone project. **Gumagana kahit offline** pagkatapos ng unang login.

## Mga feature
- **Mock exam na kahawig ng totoong CSE:** Professional na 170 tanong sa 3 oras 10 minuto, Subprofessional na 165 tanong sa 2 oras 40 minuto, 4 na pagpipilian (A–D), 80% passing rate, nakahati sa Verbal, Analytical/Clerical, Numerical at General Information.
- **Mga exam set:** may numerong set (Set 1, 2, 3…) na pinipili mula pinakabago hanggang pinakaluma. May bagong set kada linggo (`SET_INTERVAL_DAYS`), at pwedeng gumawa ang admin anumang oras. May "Bagong halo" rin para sa bagong random na set.
- **Libu-libong iba-ibang tanong:** 222 nakasulat na tanong at 43 uri ng generator (math, series, logic, analogy, grammar, Filipino, clerical, mga batas at Konstitusyon), kaya halos hindi umuulit ang exam.
- **Practice kada subject** (sa Practice tab) na may agarang tama/mali at paliwanag (laging libre).
- **Account na may aktibong email:** may verification code sa email, forgot password, email ng resulta pagkatapos ng mock exam, at progress report.
- **Simpleng login sa isang screen:** walang scroll sa phone. Pwedeng mag-login gamit ang password o **code sa email (OTP)**, walang password. Nasa ibaba ang "Gumawa ng account". May **👁️ show/hide** sa lahat ng password box.
- **Translator (English ↔ Filipino) na may boses:** sa Home → Translator. Binabasa nang malakas ang text gamit ang pinaka-natural na boses sa device (Google, Siri, Microsoft "Natural", at iba pa), hindi ang robotic. Mapipili ang boses, bilis at tono. Kung walang Filipino na boses ang device, Indonesian/Malay ang gamit (malapit ang bigkas) at may paliwanag kung paano mag-install ng Filipino na boses. Online: Google Translate kapag may `GOOGLE_TRANSLATE_API_KEY`, kung wala ay libreng MyMemory. Offline (Premium): mga na-translate na dati (naka-save sa device), ang offline translator ng browser kung mayroon, o maliit na diksyunaryo (salita-por-salita, tantiya lang).
- **Mga seksyon na nabubuksan at naisasara:** pindutin ang pamagat (▾/▴) sa Home (Professional, Subprofessional, progress, huling exam), Practice (1. Pumili ng subject), Resulta (Lahat ng exam) at Account. Naaalala ng device kung alin ang bukas.
- **Premium: madaling gamitin at komportable sa mata:**
  - **Face o fingerprint login** (Android at iPhone app), **Windows Hello** (Windows app), o face/fingerprint/PIN ng device sa browser. Piliin ang **Face** o **Fingerprint** sa Account → Mabilis na login (inaalok din pagkatapos mag-login). Ang device ang nagpapasya kung ano ang tatanggapin: Face ID sa iPhone; sa Android, gumagana lang ang face sa phone na may "strong" na face unlock (hal. Pixel 8 pataas), kaya sa ibang Android phone fingerprint ang hihingin. Nawawala ito kapag na-reset ang password.
  - **Malambot na kulay** na hindi masakit sa mata: Auto, Malambot, Sepia, o Madilim (Account → Itsura ng screen).
  - **Pinch zoom:** i-pinch ang screen gamit ang dalawang daliri para lumaki o lumiit (sa computer: Ctrl + scroll o touchpad pinch). Walang zoom button. Naaalala ang zoom sa device.
- **Proteksyon ng screen habang nag-e-exam (lahat ng user):** may babala ng **Data Privacy Act of 2012 (RA 10173)** sa itaas ng exam, at malabong watermark ng email ng user at "RA 10173 - BAWAL KUNAN NG LARAWAN/VIDEO" sa buong screen, kaya kasama ito sa anumang larawan o video na kukunin ng katabi. May paalala sa privacy bago ang unang exam o practice. Naka-block ang screenshot at screen recording sa **Android app** at **Windows app**. Nakatago ang tanong kapag lumipat sa ibang app, at hindi ito ma-select, ma-copy o ma-print. *Limitasyon:* hindi kayang malaman ng app kung may camera ng ibang tao na nakatutok sa screen, at hindi ito makakapaglagay ng babala sa phone ng ibang tao. Sa iPhone at website, hindi kayang i-block ang screenshot.
- **Premium (bayad) para sa mock exams:** online na bayad sa PayMongo (GCash, Maya, card, GrabPay, QR Ph para sa bank apps, at iba pa). Awtomatikong bubukas o mae-extend ang Premium pagkabayad, at may email sa user. Pwede pa rin ang manual na GCash (reference number, admin ang nag-a-approve) kapag may GCash number sa Admin → Settings. Naka-off ang Premium hangga't hindi binubuksan sa Admin → Settings.
- **Libre at Premium:** kapag naka-on ang Premium (Admin → Settings), online lang ang libreng plan at may limit: 3 practice kada araw (hanggang 20 tanong), at Set 1 lang ng bawat mock exam. Nababago ng admin ang mga limit na ito. Sa Premium: walang limit, lahat ng exam set at Bagong halo, at gumagana offline. Kapag naka-off ang Premium, lahat ay may Premium features.
- **Mabilis at offline (Premium):** nase-save sa device ang app, 200 tanong kada subject, at ang 5 pinakabagong exam set kada level. Agad bumubukas ang app at ang mga exam (hindi na hinihintay ang server), online man o offline. Ise-save online ang mga resulta sa background, at kumukuha ito ng bagong tanong tuwing 6 na oras. Kailangang mag-online kahit isang beses bawat 30 araw. Kailangan pa rin ng internet para sa login, email, at bayad.
- **Gising ang server:** sa Render, binibisita ng server ang sarili nito bawat 10 minuto para hindi ito matulog (`KEEP_AWAKE=0` para i-off).
- **Admin panel:** overview (walang question bank list; nasa "Mga tanong" ang mga tanong), payments, users (gawing admin, Premium, i-disable, reset password, report), exam sets, mga tanong (dagdag/edit/import), resulta, settings.

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
| `BREVO_API_KEY` | Brevo API key para makapagpadala ng email (o `RESEND_API_KEY` para sa Resend). Ito rin ang nagpapadala ng login code (OTP) |
| `MAIL_FROM`, `MAIL_FROM_NAME` | Email at pangalan ng nagpapadala (dapat verified sa Brevo) |
| `REQUIRE_EMAIL_VERIFICATION` | `1` o `0`; default ay `1` kapag may email provider |
| `SET_INTERVAL_DAYS` | Ilang araw bago gumawa ng bagong exam set (default 7, `0` para i-off) |
| `INITIAL_SETS` | Ilang set ang unang gagawin kada level (default 5) |
| `PAYMONGO_SECRET_KEY` | Secret key ng PayMongo (`sk_test_…` o `sk_live_…`, sa Developers → API Keys). Kapag may laman, naka-on ang online na bayad |
| `PAYMONGO_WEBHOOK_SECRET` | Secret key ng webhook (`whsk_…`) na ibinibigay ng PayMongo kapag gumawa ng webhook. Dito chine-check na totoo ang abiso ng bayad |
| `PAYMONGO_PAYMENT_METHODS` | Opsyonal: mga paraan ng bayad (default `gcash,paymaya,card,grab_pay,qrph`). Pwedeng idagdag ang `dob`, `dob_ubp`, `brankas_bdo`, `brankas_landbank`, `brankas_metrobank`, `shopee_pay`, `billease` kapag activated na sa PayMongo account mo |
| `GOOGLE_TRANSLATE_API_KEY` | Opsyonal: Google Cloud Translation API key para sa mas tamang translation (libre ang unang 500,000 characters kada buwan). Kung wala, libreng MyMemory ang gamit |
| `MYMEMORY_EMAIL` | Opsyonal: email para tumaas ang libreng limit ng MyMemory mula ~5,000 hanggang ~50,000 characters kada araw |
| `APP_URL` | Opsyonal: public address na babalikan pagkatapos magbayad (default: ang Render address) |
| `PORT`, `DB_PATH` | Port at lokal na database file |

## I-deploy nang libre (Render + Turso + Brevo)
1. **Turso (database):** gumawa ng database sa turso.tech, kunin ang Database URL at auth token.
2. **Brevo (email):** mag-sign up sa brevo.com (libre, 300 email kada araw). Sa *Senders*, i-verify ang email na gagamitin mong sender. Sa *SMTP & API → API Keys*, gumawa ng API key.
3. **Render (website):** New → Blueprint → piliin ang repo. Ilagay ang `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_EMAIL`, `BREVO_API_KEY` at `MAIL_FROM`.
4. Buksan ang link ng Render at mag-register gamit ang `ADMIN_EMAIL`. Sa Admin → Settings, ilagay ang presyo, at i-on ang Premium kapag handa na.
5. **PayMongo (online na bayad):** sa dashboard.paymongo.com, kunin ang secret key sa *Developers → API Keys*. Gumawa ng webhook papunta sa `https://<render-address>/api/payments/paymongo/webhook` na may event na `checkout_session.payment.paid`, at kopyahin ang secret key nito (`whsk_…`). Ilagay ang `PAYMONGO_SECRET_KEY` at `PAYMONGO_WEBHOOK_SECRET` sa Render. Subukan muna gamit ang test keys, saka palitan ng live keys (at gumawa ng hiwalay na live webhook).

Sa libreng Render plan, natutulog ang server kapag 15 minutong walang gumagamit, kaya mga isang minuto ang unang bukas pagkatapos noon.

## Android, Windows at iPhone apps
Nasa `apps/` ang mga app. Kasama na sa loob ng app ang mga screen (kinokopya mula sa `public/`), kaya bumubukas ito kahit offline. Kumokonekta ito sa online CSE Reviewer para mag-login, kumuha ng bagong tanong, at mag-save ng resulta, kaya kailangan munang naka-deploy ito. Kapag binago ang `public/`, kusang makukuha ito ng mga app (tingnan ang "Kusang pag-update").
1. Sa GitHub repo: **Settings → Secrets and variables → Actions → Variables**, gumawa ng `APP_URL` (hal. `https://cse-reviewer-7lmg.onrender.com`).
2. Kusang tumatakbo ang build sa bawat pagbabago sa `main` (o sa **Actions → Build apps → Run workflow**). Pagkatapos ng ilang minuto, nasa **Releases** na ang:
   - `CSE-Reviewer.apk` para sa Android (i-allow ang "Install unknown apps" kapag ini-install).
   - `CSE-Reviewer-…-Setup.exe` at `…-portable.exe` para sa Windows.
   - `CSE-Reviewer-unsigned.ipa` para sa iPhone. Kailangan itong i-sign bago ma-install: gamit ang Apple Developer account ($99 kada taon) para sa App Store/TestFlight, o pang-test gamit ang libreng Apple ID sa Sideloadly/AltStore (7 araw ang bisa).

### Kusang pag-update
Kapag may bagong pagbabago sa `main` na pumasa sa tests, kusang nag-a-update ang mga app nang hindi naaabala ang user. Dina-download ito sa background, at ginagamit lang ang bagong bersyon sa ligtas na oras: pagbukas ulit ng app, o habang nasa background ang app at walang ginagawa ang user (walang exam o practice na bukas, walang bukas na window, walang tinatype). Hindi kailanman nag-a-update sa gitna ng exam.
- **Website / naka-install mula sa website:** awtomatiko (service worker). Gumagana pa rin offline ang Premium.
- **Android:** awtomatiko ang mga screen at feature (dina-download mula sa server). Kapag hindi bumukas nang maayos ang bagong bersyon, kusang bumabalik sa dati. Ang mga pagbabago sa mismong APK (bihira: bagong plugin, icon, permission) ay kailangan pa ring i-install nang mano-mano mula sa Releases; hindi pinapayagan ng Android ang silent install ng APK na wala sa Play Store.
- **Windows (Setup.exe):** awtomatiko mula sa Releases. Dina-download sa background at ini-install kapag isinara ang app. Hindi nag-a-update nang kusa ang portable .exe.
- **iPhone:** pareho sa Android ang screens, pero kailangan munang ma-sign ang app.

Ang mga app na na-install bago nito ay kailangang palitan nang isang beses ng bagong build; pagkatapos noon, kusa na. Para sa fingerprint/face login sa Android at iPhone, kailangan ang APK/IPA na may biometric plugin (mula sa bersyong ito pataas); sa lumang APK, gumagana pa rin ang password at code sa email. Para sa boses ng Translator sa Android app, kailangan ang bagong APK na may TextToSpeech plugin; sa lumang APK, gumagana ang translate pero walang boses. Opsyonal: para ma-install ang bagong APK nang hindi muna binubura ang luma, ilagay ang parehong signing key sa secret na `ANDROID_DEBUG_KEYSTORE` (base64 ng `debug.keystore`).

Para sa Google Play Store, kailangan ng release signing key at Google Play developer account ($25 isang beses).
