# Notes for working on CSE Reviewer

- App text is in both Tagalog and English: `L('Tagalog', 'English')` in `public/app.js`. README and docs are in Tagalog.
- Run `npm test` before every push.
- **On every change (every PR), update `docs/DOKUMENTASYON.md`:** add a row at the top of "Kasaysayan ng bersyon" (next minor version, date, PR number, what changed in plain Tagalog), update "Kasalukuyang bersyon" and "Huling update", and edit any section the change affects (data collected, laws and government rules, operation, Auto Fix, platforms). Bump the same version in `APP_VERSION` (`public/app.js`), `package.json` and `package-lock.json`.
- Also keep the README feature list in step with the change.
