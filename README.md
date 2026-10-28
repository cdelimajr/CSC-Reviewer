# CSE Reviewer

Reviewer at mock exam para sa Philippine Civil Service Exam (Career Service Exam), Professional at Subprofessional. Gumagana sa computer at sa phone (installable bilang app / PWA).

## Mga feature
- **Mock exam na kahawig ng totoong CSE:** Professional na 170 tanong sa 3 oras 10 minuto, Subprofessional na 165 tanong sa 2 oras 40 minuto, 4 na pagpipilian (A–D), 80% passing rate, nakahati sa mga bahagi (Verbal, Analytical, Numerical, Clerical, General Information).
- **Practice kada subject** na may agarang tama/mali at paliwanag.
- **Laging bagong set ng tanong:** 222 nakasulat na tanong (1987 Constitution, RA 6713, RA 11032, environment, human rights, grammar, Filipino, reading comprehension, analogy, logic) at mga generator para sa math, series, logic at clerical.
- **Account at login** para sa bawat user; naka-save ang progress at mga resulta.
- **Admin panel:** overview, pamamahala ng users (gawing admin, i-disable, i-reset ang password, burahin), pagdagdag/pag-edit/pag-import ng tanong, at lahat ng resulta.

> Hindi inilalabas ng CSC ang eksaktong bilang ng tanong kada subject, kaya tantiya ang hati. Hindi ito opisyal na produkto ng Civil Service Commission.

## Patakbuhin sa sariling computer
Kailangan: Node.js 20 o mas bago.
```bash
npm install
npm start          # http://localhost:3000
npm test           # automated smoke test
```
Kapag walang `TURSO_DATABASE_URL`, gumagamit ito ng lokal na SQLite file sa `data/`. Ang unang account na gagawin ay magiging **admin** (o itakda ang `ADMIN_EMAIL`).

## Settings (environment variables)
| Variable | Gamit |
|---|---|
| `TURSO_DATABASE_URL` | URL ng Turso database (hal. `libsql://cse-reviewer-ikaw.turso.io`) |
| `TURSO_AUTH_TOKEN` | Token ng Turso database |
| `ADMIN_EMAIL` | Ang account na may ganitong email ay magiging admin |
| `ADMIN_PASSWORD` | Kung kasama ng `ADMIN_EMAIL`, gagawa agad ng admin account sa unang takbo |
| `PORT` | Port ng server (default 3000) |
| `DB_PATH` | Lokal na database file kapag walang Turso (default `data/cse-reviewer.db`) |

## I-deploy nang libre (Render + Turso)
1. **Turso (database):** mag-sign up sa turso.tech, gumawa ng database, at kunin ang Database URL at isang auth token.
2. **Render (website):** New → Blueprint → piliin ang repo. Babasahin nito ang `render.yaml` (free plan). Ilagay ang `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` at `ADMIN_EMAIL`.
3. Buksan ang link na ibibigay ng Render at mag-register gamit ang `ADMIN_EMAIL`.

Sa libreng Render plan, natutulog ang server kapag walang gumagamit ng 15 minuto, kaya mga isang minuto ang unang pag-load pagkatapos noon. Ligtas ang data dahil nasa Turso ito.
