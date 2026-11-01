# CSE Reviewer: Dokumentasyon

Mga batas at patakaran ng gobyerno na sinusunod ng app, paano ito ginawa, paano ito pinapatakbo, saan ito gumagana, at ang kasaysayan ng bawat bersyon.

- **Kasalukuyang bersyon:** 1.16.0 (Nobyembre 1, 2026)
- **Huling update ng dokumentong ito:** Nobyembre 1, 2026

> **Panuntunan sa pag-update:** sa bawat pagbabago sa app (bawat pull request), i-update ang dokumentong ito: dagdagan ang [Kasaysayan ng bersyon](#7-kasaysayan-ng-bersyon), palitan ang "Kasalukuyang bersyon" sa itaas, ang `APP_VERSION` sa `public/app.js` at ang `version` sa `package.json`, at baguhin ang anumang bahagi sa ibaba na naapektuhan (hal. bagong data na kinokolekta, bagong batas o patakaran ng gobyerno). Nakasulat din ito sa `CLAUDE.md`.

> **Paalala:** buod ito ng mga batas para sa may-ari ng app, hindi legal advice. Bago maglunsad nang may bayad sa publiko, ipa-review sa abogado o sa National Privacy Commission (NPC) ang mga bahaging may ⚠️.

## Nilalaman
1. [Mga batas at patakaran ng gobyerno](#1-mga-batas-at-patakaran-ng-gobyerno)
2. [Mga patakaran ng Google, Apple at payment provider](#2-mga-patakaran-ng-google-apple-at-payment-provider)
3. [Paano ginawa ang app (implementation)](#3-paano-ginawa-ang-app-implementation)
4. [Operasyon: paano pinapatakbo araw-araw](#4-operasyon-paano-pinapatakbo-araw-araw)
5. [Auto Fix](#5-auto-fix)
6. [Saan gumagana ang app](#6-saan-gumagana-ang-app)
7. [Kasaysayan ng bersyon](#7-kasaysayan-ng-bersyon)
8. [Mga kulang pa at rekomendasyon](#8-mga-kulang-pa-at-rekomendasyon)

---

## 1. Mga batas at patakaran ng gobyerno

### 1.1 Data Privacy Act of 2012 (RA 10173), ang IRR nito, at mga circular ng NPC
**Ano ang hinihingi:** ang personal na impormasyon ay kinokolekta lang para sa malinaw na layunin (transparency, legitimate purpose, proportionality), pinoprotektahan ng sapat na seguridad, at may karapatan ang may-ari ng data (data subject) na malaman, ma-access, maitama, at mabura ang data niya. Kapag may data breach na maaaring makasama sa tao, kailangang ipaalam sa NPC at sa mga apektado sa loob ng **72 oras** (NPC Circular 16-03). Kailangang may Data Protection Officer (DPO) ang personal information controller; ang pagrerehistro sa NPC ay kailangan lang kapag lampas sa threshold (NPC Circular 2022-04: hal. 250 empleyado pataas, o sensitive personal information ng 1,000 tao pataas).

**Anong data ang hawak ng app at bakit:**

| Data | Saan | Bakit |
|---|---|---|
| Pangalan, email | `users` (database) | Account, login, pagpapadala ng resulta at resibo |
| Password | `users.pass_hash` + `salt` | Login. **Hindi naka-save ang mismong password**: scrypt hash lang (64 bytes, may salt) |
| Login session | `sessions` | Naka-save ang SHA-256 ng token, hindi ang token mismo. Isang device lang ang naka-login kada account |
| Code sa email (OTP/verify/reset) | `email_codes` | Naka-hash, may expiry at limit sa subok |
| Mga sagot at score sa exam | `attempts` | Resulta, progress report, review |
| Bayad: halaga, paraan, reference number, screenshot ng resibo | `payments` at settings | Pag-check ng manual na bayad. **Walang card number o GCash PIN na dumadaan sa app**; sa PayMongo ito nangyayari |
| Face/fingerprint login | Sa device lang | Ang device ang nagche-check ng mukha o daliri. **Walang larawan ng mukha o fingerprint na napupunta sa app o server**; isang device secret lang (naka-hash sa `devices`) |
| Offline na kopya (Premium) | Sa device (localStorage) | Para gumana offline: account, mga tanong, mga resultang hindi pa naka-save online |
| Pagburang naghihintay (admin) | Sa device (`cse-undo-<user>`) | Ang pagburang nasa Undo bar pa (uri at ID lang, hal. `DELETE /api/admin/sets/7`). Nabubura ito pagkatapos maipadala sa server |

Walang sensitive personal information (hal. edad, relihiyon, kalusugan, government ID) na kinokolekta ang app.

**Paano sumusunod ang app:**
- **Seguridad:** scrypt para sa password, naka-hash na session token at code, HTTPS (Render), limit sa dami ng subok sa login/register/code, isang device lang kada account (agad nalo-logout ang luma), at nawawala ang face/fingerprint login kapag na-reset ang password.
- **Proteksyon ng exam screen:** babala ng RA 10173, watermark ng email ng user, naka-block ang screenshot sa Android at Windows app, nakatago ang tanong kapag lumipat sa ibang app.
- **Pagbura ng data:** kayang burahin ng admin ang account at lahat ng resulta nito (Admin → Users → pindutin ang pangalan → Burahin ang account). May 10 segundo para i-undo; pagkalipas nito, tuluyan nang nabubura ang data sa server (walang natitirang kopya).
- **Paalala sa privacy** bago ang unang exam o practice.

> ⚠️ Tungkol sa watermark na "RA 10173 - bawal kunan ng larawan/video": ang RA 10173 ay tungkol sa personal na impormasyon (dito: ang email ng user na nasa watermark). Ang pagkopya ng mga tanong mismo ay mas sakop ng terms of use ng app at ng Intellectual Property Code (RA 8293). Pareho itong tama bilang paalala, pero huwag sabihing krimen sa ilalim ng RA 10173 ang bawat screenshot.

### 1.2 Anti-Cheating sa Civil Service Exam (RA 9416) at mga patakaran ng CSC
- Bawal ang anumang uri ng pandaraya sa civil service exam, kasama ang paggamit o pagkakalat ng **totoong tanong ng exam**. Kaya **orihinal o awtomatikong ginawa** ang lahat ng tanong sa app (222 nakasulat na tanong at 43 uri ng generator). Huwag kailanman mag-import ng tanong na galing sa totoong CSE.
- Sinusunod ng mock exam ang inilathalang format ng CSC Career Service Exam (pen and paper test): Professional 170 tanong sa 3 oras 10 minuto, Subprofessional 165 tanong sa 2 oras 40 minuto, 80% passing rate.
- **Hindi opisyal na produkto ng CSC ang app.** Nakasulat ito sa Account → Tungkol sa exam at sa README. Huwag gamitin ang logo o pangalan ng CSC na parang sila ang gumawa.

### 1.3 Intellectual Property Code (RA 8293)
- Ang code, disenyo at mga tanong ay pag-aari ng may-ari ng app. Ang mga batas na binabanggit sa General Information (Konstitusyon, RA 6713, atbp.) ay pampublikong dokumento.
- Mga open-source na library: Express, compression, @libsql/client, Capacitor, Electron at iba pa, lahat ay may lisensyang pumapayag sa komersyal na gamit (MIT/Apache). MIT ang lisensya ng app (`package.json`).

### 1.4 Electronic Commerce Act of 2000 (RA 8792)
- Kinikilala ang bisa ng electronic na dokumento at transaksyon. Kaya valid ang online na bayad, ang email na resibo/kumpirmasyon, at ang record ng bayad sa database bilang ebidensya.

### 1.5 Internet Transactions Act of 2023 (RA 11967) at Consumer Act (RA 7394)
- Ang nagbebenta online (dito: Premium) ay dapat malinaw sa presyo, sa makukuha ng bumibili, at sa kung paano makikipag-ugnayan. Sa app: nakasulat ang presyo at ilang araw ang Premium, ang mga paraan ng bayad, at may email sa user pagkabayad o pag-approve.
- Bawal ang mapanlinlang na claim. Halimbawa: huwag sabihing "garantisadong papasa" o "opisyal na reviewer ng CSC".
- ⚠️ Kailangang ipakita ng online merchant ang pangalan ng negosyo, address at contact (tingnan ang [Seksyon 8](#8-mga-kulang-pa-at-rekomendasyon)).

### 1.6 Cybercrime Prevention Act of 2012 (RA 10175)
- Krimen ang illegal access, data interference at computer-related fraud. Proteksyon ito ng app: kapag may pumasok nang walang pahintulot sa server o account, pwedeng magsampa ng kaso (PNP Anti-Cybercrime Group o NBI Cybercrime Division).
- Ginagawa ng app ang bahagi nito: limit sa subok sa login, hash ng password, at isang device kada account.

### 1.7 Buwis at rehistro ng negosyo (BIR, DTI, LGU)
- Kapag may kita na ang Premium: magparehistro sa **BIR** (NIRC, binago ng TRAIN Law RA 10963 at ng Ease of Paying Taxes Act RA 11976, kung saan **invoice** na ang ibinibigay sa halip na official receipt), kumuha ng **DTI business name** at **Mayor's/Business permit** sa LGU.
- ⚠️ Ang email na kumpirmasyon ng app ay hindi BIR-registered invoice. Kung kailangan, gumamit ng BIR-accredited na invoicing (o ang invoice ng PayMongo kung available sa account mo).

### 1.8 Edad ng user
- Sa CSC, 18 taong gulang pataas ang pwedeng kumuha ng CSE. Para sa mga batang wala pang 18 na gagamit ng app, kailangan ang pahintulot ng magulang sa ilalim ng RA 10173. ⚠️ Wala pang tanong sa edad ang registration (tingnan ang Seksyon 8).

---

## 2. Mga patakaran ng Google, Apple at payment provider
- **PayMongo (online na bayad):** dito dumadaan ang GCash, Maya, card, GrabPay at QR Ph. Hindi dumadaan sa app ang card number o PIN, kaya ang PayMongo ang sumusunod sa PCI DSS at sa mga patakaran ng Bangko Sentral (BSP). Chine-check ng server ang signature ng bawat webhook (`PAYMONGO_WEBHOOK_SECRET`) bago buksan ang Premium.
- **Manual na bayad:** ang admin ang nagche-check sa sariling GCash/Maya/bangko bago mag-approve. Itago lang ang screenshot ng resibo hangga't kailangan.
- **Google AdSense / AdMob:** bawal pindutin ang sariling ads; may `/ads.txt`; walang ads sa Premium, exam, practice, Account, Premium at Admin.
- **Google Play (kung ilalagay doon):** kailangan ng Privacy Policy URL, tamang **Data safety** form (email, pangalan, resulta, purchase history; may ads), at deklarasyon na may ads. Kailangan ng release signing key at developer account.
- **Apple App Store:** kailangan ng Apple Developer account at Privacy Policy; ang bayad sa digital na content sa loob ng iPhone app ay maaaring kailangang dumaan sa In-App Purchase ng Apple (⚠️ i-check bago ilagay sa App Store).

---

## 3. Paano ginawa ang app (implementation)

**Mga bahagi**

| Bahagi | Saan | Gamit |
|---|---|---|
| Server | `src/server.js` (Node.js 20+, Express) | API, login, exam, bayad, admin, email |
| Database | `src/db.js` | Turso (libSQL) online, o lokal na SQLite file kapag walang `TURSO_DATABASE_URL` |
| Mga tanong | `src/bank*.js`, `src/generators*.js`, `src/blueprint.js`, `src/sets.js` | Nakasulat na tanong, generator, hati ng tanong kada subject, at mga exam set |
| Email | `src/mail.js` | Brevo o Resend |
| Bayad | `src/paymongo.js` | PayMongo checkout at webhook |
| Mga screen | `public/` (`index.html`, `app.js`, `styles.css`, `pdf.js`) | Isang page na app, walang build step |
| Offline (website) | `public/sw.js` | Service worker: naka-save ang files ng app sa device |
| Android/iPhone | `apps/mobile` (Capacitor 7) | Kasama ang mga screen sa loob ng app; nag-a-update mula sa server |
| Windows | `apps/desktop` (Electron) | Kasama ang mga screen; nag-a-update mula sa GitHub Releases |
| Build ng apps | `.github/workflows/apps.yml` | APK, EXE at IPA sa bawat pagbabago sa `main` |
| Test | `test/smoke.js` | `npm test` |

**Daloy ng data:** ang user ay nagla-login → ang server ay gumagawa ng session (cookie sa website, token sa apps) → ang exam ay ginagawa ng server o (Premium) mula sa mga tanong na naka-save sa device → ang sagot ay naka-save sa device sa bawat pindot → pagsumite, ang score ay kinukuwenta ng server (o ng device kapag offline, saka ise-save online pagbalik ng internet).

**Undo (10 segundo):** `Undo` sa `public/app.js`. May dalawang uri:
- **Naantalang pagbura** (pagbura ng account, pagtago ng tanong, pagbura ng exam set, pag-alis ng QR, pag-off ng mabilis na login): nawawala agad sa screen, pero sa server ay ipinapadala lang pagkalipas ng 10 segundo. Kaya ang I-undo ay ibinabalik lang ang screen; walang nabura. Naka-save sa device (`cse-undo-<user>`) ang naghihintay na pagbura, kaya kapag naisara ang app o offline, itinutuloy ito pagbukas ulit o pagbalik ng internet (`syncNow`). Bago mag-logout, ipinapadala muna ito.
- **Naibabalik na pagbabago** (mga aksyon sa user, I-save ang settings, zoom): nase-save agad; ang I-undo ay nagse-save ulit ng dating value. Para sa Premium, ibinabalik ang eksaktong petsa ng pagtatapos (`premium_until` sa `PATCH /api/admin/users/:id`).
- Isa lang ang bar: kapag may bagong aksyon, tinatapos agad ang nauna. Hindi maa-undo ang pag-approve/reject ng bayad, pag-reset ng password at pagpapadala ng email, dahil may email na agad na naipapadala o hindi na makukuha ang lumang password; may tanong pa rin bago gawin ang mga ito.

**Seguridad:** tingnan ang Seksyon 1.1. Dagdag pa: CORS para sa apps ay token lang (walang cookie), `trust proxy` para sa tamang IP sa limit ng subok, at hindi kailanman naka-cache ng service worker ang `/api`.

---

## 4. Operasyon: paano pinapatakbo araw-araw

**Pag-deploy:** tingnan ang README ("I-deploy nang libre"). Kusang nag-a-update ang website at ang mga app kapag may bagong pagbabago sa `main` na pumasa sa test.

**Gawain ng admin**
- **Araw-araw:** Admin → Payments, i-check at i-approve o i-reject ang manual na bayad (i-check muna sa sariling GCash/Maya/bangko gamit ang reference number).
- **Lingguhan:** tingnan ang Admin → Overview (bagong users, passing rate) at Admin → Exam sets (kusang may bagong set bawat linggo).
- **Kapag may nagreklamo:** Admin → Users → pindutin ang pangalan ng user para sa mga aksyon (Premium, reset password, report, burahin).
- **Kapag nagkamali ng pindot:** pindutin ang **↶ I-undo** sa bar sa ibaba sa loob ng 10 segundo (pagbura, pagtago, pagbabago sa user, at I-save ang settings). Pagkalipas nito, gawin ulit nang mano-mano ang dating ayos (hal. bigyan ulit ng Premium) o gamitin ang backup ng database.

**Backup:** sa Turso, gamitin ang point-in-time restore o `turso db shell <db> .dump > backup.sql` paminsan-minsan. Sa lokal na SQLite, kopyahin ang file sa `data/`.

**Mga log:** sa Render → Logs. Dito lumalabas ang mga error ng server (hindi na humihinto ang server dahil sa isang error; tingnan ang Auto Fix).

**Kapag may data breach (NPC Circular 16-03):**
1. Pigilan agad: palitan ang `TURSO_AUTH_TOKEN`, mga API key (Brevo, PayMongo), at i-logout ang lahat (burahin ang laman ng `sessions`).
2. Alamin kung ano at kanino ang apektado.
3. Sa loob ng **72 oras**, ipaalam sa NPC at sa mga apektadong user kung maaaring makasama ito sa kanila.
4. Isulat ang nangyari at ang ginawang aksyon.

**Paghiling ng user na burahin ang data:** burahin ang account sa Admin → Users → pangalan → Burahin ang account. Kasama nitong nabubura ang mga resulta niya.

---

## 5. Auto Fix
Kusang hinahanap at inaayos ng app ang mga karaniwang problema, online man o offline, nang walang ginagawa ang user. Nasa Account → Auto Fix ang huling ginawa nito, ang **Suriin at ayusin ngayon**, at ang **I-reset ang files ng app**.

| Problema | Ano ang ginagawa | Kailan |
|---|---|---|
| Hindi makapagsimula ang app (sirang o kulang na file) | Binubura ang naka-save na files ng app at kinukuha ulit, hanggang 2 beses; pagkatapos, may button na "Ayusin at i-reload" | Pagbukas ng app (`index.html`, boot guard) |
| Sirang data sa device (hal. naputol habang nagse-save) | Binubura ang sirang kopya at kinukuha ulit sa server. **Ang mga resultang hindi pa naka-save online ay hindi binubura**; ang sira lang ay inililipat sa backup (`cse-fix-backup`) | Bago magsimula ang app, at bawat check |
| Puno na ang storage ng device | Binubura ang mga lumang kopya ng screen (babalik ito mula sa server) | Bawat check |
| Kulang na file ng app sa device (website) | Dina-download ulit ng service worker | Bawat check, at kapag hiningi ang file |
| Hindi pa naka-save online ang resulta, email o bayad | Ipinapadala ulit; kinokonekta ulit ang live na login | Pagbalik ng internet, pagbukas ng app |
| Screen na hindi maipakita dahil sa error | Inaayos ang data at ipinapakita ulit ang screen; kapag hindi pa rin, may button na "Ayusin" | Agad |
| Paulit-ulit na error (3 sa loob ng 30 segundo) | Pinapatakbo ang buong check | Agad |
| Error sa server | Isinusulat sa log at **tuloy ang server** (hindi humihinto) | Agad |

**Ligtas na fallback:** hindi kailanman binubura ng Auto Fix ang login, settings, at mga resultang hindi pa naka-save online, at hindi ito gumagalaw sa gitna ng exam (naka-save ang sagot sa bawat pindot). Ang "I-reset ang files ng app" ay kumukuha lang ng bagong kopya ng files at saka nagre-reload. Sa Android/iPhone app, kapag hindi bumukas ang bagong bersyon, kusang bumabalik ang app sa dating bersyon (Capacitor Updater).

---

## 6. Saan gumagana ang app

| Platform | Kailangan | Paalala |
|---|---|---|
| Website (phone at computer) | Chrome, Edge, Firefox, Safari na bago (2022 pataas) | Pwedeng i-install bilang app (Add to Home screen). Offline sa Premium |
| Android app (APK) | Android 6.0 pataas (Capacitor 7) | Face login: phone na may "strong" face unlock lang (hal. Pixel 8 pataas); fingerprint sa iba |
| Windows app (EXE) | Windows 10 o 11, 64-bit | Windows Hello para sa mabilis na login; Setup.exe ang kusang nag-a-update |
| iPhone (IPA) | iOS 14 pataas (Capacitor 7) | Kailangang i-sign (Apple Developer o Sideloadly/AltStore) |
| Server | Node.js 20 pataas | Render (libre) + Turso + Brevo |

**Mula saang bersyon gumagana ang bawat feature:** tingnan ang talaan sa ibaba. Ang mga app na na-install bago ang 1.6.0 ay kailangang palitan nang isang beses ng bagong build para gumana ang kusang pag-update; ang face/fingerprint login ay kailangan ng APK/IPA mula 1.7.0 pataas.

---

## 7. Kasaysayan ng bersyon

| Bersyon | Petsa | PR | Mga pagbabago |
|---|---|---|---|
| **1.16.0** | 2026-11-01 | #PRNUM | Bagong **I-undo sa loob ng 10 segundo**: bar sa ibaba na may ↶ I-undo pagkatapos burahin ang account, itago ang tanong, burahin ang exam set, alisin ang QR o payment account, baguhin ang user (admin, disable, Premium, verified), i-save ang settings, ibalik ang zoom sa 100%, at i-off ang mabilis na login. Ipinapadala lang sa server ang pagbura pagkalipas ng 10 segundo, at itinutuloy ito kahit naisara ang app o offline. Wala nang tanong bago itago ang tanong o burahin ang exam set (may I-undo na) |
| 1.15.0 | 2026-11-01 | #15 | Account: inalis ang Logout sa tabi ng pamagat (nasa kanang itaas pa rin); Premium at Tulong ay drop down na rin, kaya drop down na lahat mula Premium hanggang Tungkol sa exam. Admin: dropdown menu ang mga tab; sa Users, ang pangalan ng user ang pinipindot para sa mga aksyon (wala nang "Aksyon"); sa Exam sets, drop down ang Professional at Subprofessional; sa Settings, drop down ang Premium (may on/off at presyo sa pamagat). Bagong **Auto Fix** (online at offline). Bagong dokumentasyong ito. Mga ayos: hindi na humihinto ang server sa error sa logout o paglilinis ng session; mas ligtas na pagsumite ng exam kapag nawala ang kopya nito; tamang default na bilang ng tanong sa libreng practice; mga error sa Admin (paghahanap ng user, mga tanong, exam set) ay may malinaw na mensahe na |
| 1.14.0 | 2026-11-01 | #14 | Premium: pwedeng mag-login offline sa device na nag-login na online dati |
| 1.13.0 | 2026-11-01 | #13 | Agad na logout sa ibang device (live), exam na parang test paper na may page flip, kitang Logout, tap feedback, mas mabilis na Premium |
| 1.12.0 | 2026-11-01 | #12 | Isang login kada account, laging may Set 1, gabay at Tulong, drop down sa Admin → Settings, iisang itsura para sa Libre at Premium |
| 1.11.0 | 2026-10-31 | #11 | Level (PRO/SUBPRO), PDF/email/print ng resulta, limit ng libreng plan at ads, flag ng wika, tunog, mga on/off sa Admin |
| 1.10.0 | 2026-10-31 | #10 | Tagalog/English sa buong app, inalis ang translator, inayos ang Home at Account |
| 1.9.0 | 2026-10-31 | #9 | Pagpili ng face login, 👁️ sa password, translator EN-FIL na may boses, mga seksyong nabubuksan at naisasara |
| 1.8.0 | 2026-10-31 | #8 | Proteksyon ng exam screen: babala ng RA 10173, watermark, block ng screenshot sa Android at Windows |
| 1.7.0 | 2026-10-31 | #7 | Premium: malambot na kulay, pinch zoom, login sa isang screen, code sa email at fingerprint login |
| 1.6.0 | 2026-10-31 | #6 | Kusang pag-update ng apps sa ligtas na oras |
| 1.5.0 | 2026-10-31 | #5 | Online na bayad: lumipat mula Xendit papuntang PayMongo |
| 1.4.0 | 2026-10-31 | #4 | Online na bayad sa Premium sa pamamagitan ng Xendit |
| 1.3.0 | 2026-10-31 | #3 | Mas mabilis na app, offline para sa Premium lang, limit ng libreng plan |
| 1.2.0 | 2026-10-29 | #2 | Gumagana offline |
| 1.1.0 | 2026-10-29 | #1 | Exam sets, email verification, bayad sa Premium, online-only mode, mas maraming uri ng tanong, build ng Android/Windows/iPhone apps |
| 1.0.0 | 2026-10-28 | (unang bersyon) | Website at PWA na may mock exam, account at admin panel; Turso database para sa Render; offline na single-file na test version |

---

## 8. Mga kulang pa at rekomendasyon
Mga bagay na kailangan ng batas o ng app store pero wala pa sa app. Hindi pa ito ginagawa; para ito sa susunod na desisyon.

1. **Privacy Policy at Terms of Use** na nakikita sa app at sa website (kailangan ng RA 10173 at ng Google Play/App Store): anong data, bakit, gaano katagal itatago, sino ang DPO, at paano makikipag-ugnayan.
2. **Pahintulot (consent) sa registration:** checkbox na "Nabasa ko at sumasang-ayon ako sa Privacy Policy", at tanong sa edad o pahintulot ng magulang kung wala pang 18.
3. **Sariling pagbura at pag-download ng data** ng user (right to erasure at data portability), hindi lang sa pamamagitan ng admin.
4. **Data Protection Officer:** magtalaga ng DPO at ilagay ang email niya sa Privacy Policy; i-check kung kailangang magrehistro sa NPC.
5. **Gaano katagal itatago ang data:** hal. burahin ang screenshot ng resibo pagkalipas ng isang taon, at ang hindi aktibong account pagkalipas ng ilang taon (may paalala muna sa email).
6. **Impormasyon ng negosyo** (RA 11967): pangalan ng negosyo, address at contact sa Premium page.
7. **BIR invoice** para sa bawat bayad kapag rehistrado na ang negosyo.
