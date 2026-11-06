// Verbal Ability: wastong gamit ng salita (Filipino), written by hand (1.45.0).
// pangungusap | tamang sagot | tatlong maling sagot | paliwanag
const { rows } = require('./bank-tools');

const NANG = '**ng** = bago ang pangngalan (tao, bagay) o pagmamay-ari: bumili **ng** bigas, aklat **ng** bata.\n**nang** = paano o gaano ginawa (bago ang pang-abay), "noong", "upang", o sa pag-uulit: tumakbo **nang** mabilis, takbo **nang** takbo.';
const LIST = rows(`
Bumili si Ana ___ bagong sapatos. | ng | nang, na, ang | Kasunod ay **bagay** (sapatos), kaya **ng**.
Kumain ___ mabilis ang bata. | nang | ng, na, ang | Sinasabi kung **paano** kumain (mabilis), kaya **nang**.
Ang bahay ___ kapitan ay malaki. | ng | nang, na, sa | Nagsasabi ng **pagmamay-ari** (bahay ng kapitan), kaya **ng**.
Umalis siya ___ maaga. | nang | ng, na, ang | Sinasabi kung **kailan o paano** umalis (maaga), kaya **nang**.
Tawa ___ tawa ang mga bata sa palabas. | nang | ng, na, at | **Inuulit** ang salita (tawa nang tawa), kaya **nang**.
Nagluto si Nanay ___ adobo. | ng | nang, na, ang | Kasunod ay **bagay** (adobo), kaya **ng**.
Nag-aral siya nang mabuti ___ makapasa sa pagsusulit. | upang | ng, kung, para ng | **Upang** = para (layunin). Ang "para ng" ay mali.
Dumating siya ___ umuulan pa. | nang | ng, na, kung | **Nang** = "noong" (kailan): dumating siya noong umuulan pa.
Nagsalita ang direktor ___ malakas. | nang | ng, na, ang | Sinasabi kung **paano** nagsalita (malakas), kaya **nang**.
Uminom siya ___ malamig na tubig. | ng | nang, sa, ang | Kasunod ay **bagay** (malamig na tubig), kaya **ng**. Inilalarawan lang ng "malamig" ang tubig.
Ang guro ___ anak ko ay mabait. | ng | nang, na, sa | Nagsasabi ng **kanino** (guro ng anak ko), kaya **ng**.
Naglakad sila ___ dahan-dahan. | nang | ng, na, ang | Sinasabi kung **paano** naglakad (dahan-dahan), kaya **nang**.
Sumulat siya ___ liham para sa kanyang ina. | ng | nang, na, ang | Kasunod ay **bagay** (liham), kaya **ng**.
Iyak ___ iyak ang sanggol buong gabi. | nang | ng, na, at | **Inuulit** ang salita (iyak nang iyak), kaya **nang**.
Natapos niya ang ulat ___ maayos. | nang | ng, na, kung | Sinasabi kung **paano** natapos (maayos), kaya **nang**.
`);

const PARES = rows(`
Pakibuksan mo ang ___ dahil mainit sa loob. | pinto | pintuan, pinta, pintura | **Pinto** = ang binubuksan at isinasara. **Pintuan** = ang daanan (ang butas sa dingding).
Huwag kang tumayo sa ___ dahil nakaharang ka sa daan. | pintuan | pinto, pinta, pintura | **Pintuan** = ang daanan. **Pinto** = ang binubuksan at isinasara.
___ mo ang bagong ulam kung masarap. | Tikman | Tikmin, Tikim, Matikman | **Tikman** = tikim + **-an**. Ang "tikmin" ay hindi wastong anyo.
___ mo ang sahig bago ka umalis. | Walisan | Walisin, Winalis, Walis | **Walisan** ang sahig (ang lugar). **Walisin** ang kalat o dumi (ang inaalis).
___ mo ang mga tuyong dahon sa bakuran. | Walisin | Walisan, Winalisan, Walis | **Walisin** ang dahon (ang inaalis). **Walisan** ang bakuran (ang lugar).
___ mo ang bagong paraan ng pag-file para makita kung mas mabilis. | Subukin | Subukan, Sinubukan, Subok | **Subukin** = suriin o tingnan kung gagana (test). **Subukan** = palihim na tingnan ang ginagawa ng iba.
___ mo kung ano ang ginagawa ng mga bata sa likod-bahay. | Subukan | Subukin, Sinubok, Subok | **Subukan** = palihim na tingnan ang ginagawa. **Subukin** = i-test kung gagana.
Kailangang ___ ang kanyang mata dahil sa katarata. | operahan | operahin, opera, inoperahin | **Operahan** ang tao o bahagi ng katawan (dito gagawin ang opera). **Operahin** ang mismong aalisin (hal. katarata, bukol).
Kailangang ___ ang bukol sa kanyang leeg. | operahin | operahan, inoperahan, opera | **Operahin** ang mismong aalisin (bukol). **Operahan** ang tao o bahagi ng katawan.
___ pulong bukas sa opisina. | May | Mayroon, Mai, Mayron | **May** + pangngalan (pulong). **Mayroon** kapag kasunod ay panghalip o kataga (mayroon siya, mayroon pa).
___ siyang bagong sasakyan. | Mayroon | May, Mayron, Mayroong | **Mayroon** kapag kasunod ay panghalip (siya). Ang "may siyang" ay mali.
Ito ang aklat ___ hiniram sa iyo. | kong | kung, ko, na kung | **Kong** = ko + -ng (aklat na hiniram ko). **Kung** = "if" o kondisyon.
___ uulan bukas, hindi tayo tutuloy. | Kung | Kong, Kun, Nang | **Kung** = kondisyon ("if"): kung uulan.
Dumaan muna siya ___ bahay ng kanyang lola. | sa | ng, nang, kay | **Sa** = papunta o lugar (dumaan sa bahay).
Ibigay mo ang sulat ___ Pedro. | kay | sa, ng, nina | **Kay** = sa + pangalan ng isang tao (kay Pedro).
Ibigay mo ang sulat ___ Pedro at Juan. | kina | kay, sa, kinay | **Kina** = para sa dalawa o higit pang pangalan ng tao (kina Pedro at Juan).
`);

const RINDIN = 'Pagkatapos ng **patinig** (a, e, i, o, u) o w/y: **rin, raw, rito, roon**.\nPagkatapos ng **katinig**: **din, daw, dito, doon**.';
const RD = rows(`
Pupunta ___ ako sa seminar bukas. | rin | din, nang, ng | Ang "Pupunta" ay nagtatapos sa **a** (patinig), kaya **rin**.
Nag-aral ___ si Ben para sa pagsusulit. | din | rin, nang, ng | Ang "Nag-aral" ay nagtatapos sa **l** (katinig), kaya **din**.
Sasama ___ daw si Liza sa outing. | rin | din, ng, nang | Ang "Sasama" ay nagtatapos sa **a** (patinig), kaya **rin**.
Mabait ___ ang bagong guro. | din | rin, ng, nang | Ang "Mabait" ay nagtatapos sa **t** (katinig), kaya **din**.
Sabi ___ ng kapitan, may pulong bukas. | raw | daw, ng, nang | Ang "Sabi" ay nagtatapos sa **i** (patinig), kaya **raw**.
Aalis ___ sila bukas ng umaga. | daw | raw, ng, nang | Ang "Aalis" ay nagtatapos sa **s** (katinig), kaya **daw**.
`);

const out = [];
for (const [q, a, ds, why] of LIST) out.push({ s: 'verbal', t: 'Wastong Gamit (Filipino)', q, a, d: ds.split(',').map((x) => x.trim()), e: `${why}\nKaya ang sagot ay ==${a}==.\nQuick Note: ${NANG}` });
for (const [q, a, ds, why] of PARES) out.push({ s: 'verbal', t: 'Wastong Gamit (Filipino)', q, a, d: ds.split(',').map((x) => x.trim()), e: `${why}\nKaya ang sagot ay ==${a}==.` });
for (const [q, a, ds, why] of RD) out.push({ s: 'verbal', t: 'Wastong Gamit (Filipino)', q, a, d: ds.split(',').map((x) => x.trim()), e: `${why}\nKaya ang sagot ay ==${a}==.\nQuick Note: ${RINDIN}` });

module.exports = out;
