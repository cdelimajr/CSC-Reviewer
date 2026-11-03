# Seguridad

## Paano mag-report ng butas sa seguridad

Kung may nakita kang butas sa seguridad (hal. makakapasok sa account ng iba, makakakuha ng Premium nang walang bayad, o makikita ang data ng ibang user), **huwag itong i-post bilang public issue**. Gamitin ang **Security → Report a vulnerability** sa GitHub page ng repo na ito (private na report), o mag-email sa contact na nasa resibo ng app.

Isulat kung paano ito nangyayari (mga hakbang), at kung kailan mo ito nakita. Sasagot kami sa loob ng 3 araw. Kapag may data ng user na naapektuhan, susundin namin ang NPC Circular 16-03 (paalala sa NPC at sa user sa loob ng 72 oras).

## Mga panuntunan sa repo

- Walang password, API key o token sa code. Nasa Render → Environment at sa GitHub → Settings → Secrets lang ang mga ito.
- Lahat ng pagbabago ay dumadaan sa pull request at kailangang pumasa ang `npm test`.
- Tingnan ang buong checklist (GitHub, Render, API) sa [`docs/DOKUMENTASYON.md`](docs/DOKUMENTASYON.md), Seksyon 4.
