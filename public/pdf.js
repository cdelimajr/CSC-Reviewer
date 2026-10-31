/* A small PDF maker for exam results (no library, works offline).
   Used by the app (Save as PDF, Premium) and by the server (PDF attached to the result email).
   Text only, A4 pages, the built-in Helvetica font. Characters Helvetica does not have
   (for example √ or ₱) are written in plain letters. */
(function (root) {
  'use strict';
  // Helvetica and Helvetica-Bold widths (1/1000 of the font size) for characters 32-126.
  const W = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
  const WB = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
  // Windows-1252 characters outside Latin-1, and plain-text stand-ins for the rest.
  const CP = { '€': 128, '‚': 130, '„': 132, '…': 133, '‘': 145, '’': 146, '“': 147, '”': 148, '•': 149, '–': 150, '—': 151, '™': 153 };
  const SUB = { '₱': 'P', '√': 'sqrt', 'π': 'pi', '≤': '<=', '≥': '>=', '≠': '!=', '→': '->', '←': '<-', '≈': '~', '∞': 'infinity', '✓': 'OK', '✔': 'OK', '✗': 'X', '✕': 'X', '⁴': '^4', '⁵': '^5', '₂': '2', '\t': ' ' };

  function clean(s) {
    let out = '';
    for (const ch of String(s == null ? '' : s).normalize('NFC')) {
      const c = ch.codePointAt(0);
      if (c === 10) out += '\n';
      else if (c >= 32 && c <= 126) out += ch;
      else if (c >= 160 && c <= 255) out += String.fromCharCode(c);
      else if (CP[ch]) out += String.fromCharCode(CP[ch]);
      else if (SUB[ch] !== undefined) out += SUB[ch];
      else if (c > 255) out += '?';
    }
    return out;
  }
  const width = (s, size, bold) => {
    const t = bold ? WB : W;
    let w = 0;
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); w += c >= 32 && c <= 126 ? t[c - 32] : 556; }
    return (w * size) / 1000;
  };
  const pdfStr = (s) => '(' + s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)') + ')';
  const num = (n) => (Math.round(n * 100) / 100).toString();

  // Split text into lines that fit maxW.
  function wrap(text, size, bold, maxW) {
    const lines = [];
    for (const para of clean(text).split('\n')) {
      let line = '';
      for (const word of para.split(/ +/)) {
        const tryLine = line ? line + ' ' + word : word;
        if (width(tryLine, size, bold) <= maxW) { line = tryLine; continue; }
        if (line) lines.push(line);
        // A word longer than the line is cut.
        let w = word;
        while (width(w, size, bold) > maxW) {
          let n = w.length;
          while (n > 1 && width(w.slice(0, n), size, bold) > maxW) n--;
          lines.push(w.slice(0, n)); w = w.slice(n);
        }
        line = w;
      }
      lines.push(line);
    }
    return lines;
  }

  function create({ title = 'CSE Reviewer', footer = '' } = {}) {
    const PW = 595.28, PH = 841.89, M = 44, TOP = PH - M, BOTTOM = M + 22;
    const pages = [];
    let ops = null, y = 0;
    const newPage = () => { ops = []; pages.push(ops); y = TOP; };
    newPage();
    const need = (h) => { if (y - h < BOTTOM) newPage(); };
    const doc = {
      // Text that wraps and continues on the next page. opts: size, bold, color [r,g,b] 0-1, indent, after (space below).
      text(str, opts = {}) {
        const size = opts.size || 10.5, bold = !!opts.bold, indent = opts.indent || 0, lead = size * 1.32;
        const color = opts.color || [0.09, 0.13, 0.2];
        for (const line of wrap(str, size, bold, PW - 2 * M - indent)) {
          need(lead);
          y -= lead;
          if (line) ops.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${color.map(num).join(' ')} rg ${num(M + indent)} ${num(y + size * 0.25)} Td ${pdfStr(line)} Tj ET`);
        }
        y -= opts.after == null ? 2 : opts.after;
        return doc;
      },
      space(h = 8) { y -= h; if (y < BOTTOM) newPage(); return doc; },
      rule(color = [0.85, 0.87, 0.91]) { need(8); y -= 4; ops.push(`${color.map(num).join(' ')} RG 0.7 w ${num(M)} ${num(y)} m ${num(PW - M)} ${num(y)} l S`); y -= 6; return doc; },
      // Keep the next h points together on one page.
      keep(h) { need(h); return doc; },
      pageBreak() { newPage(); return doc; },
      bytes() {
        const objs = [];
        const add = (s) => { objs.push(s); return objs.length; };
        const catalog = add(''), pagesObj = add('');
        const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
        const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
        const kids = [];
        pages.forEach((p, i) => {
          const foot = clean(`${footer}${footer ? '   ·   ' : ''}${i + 1} / ${pages.length}`);
          const fw = width(foot, 8, false);
          const content = p.join('\n') + `\nBT /F1 8 Tf 0.45 0.48 0.55 rg ${num((PW - fw) / 2)} ${num(M - 6)} Td ${pdfStr(foot)} Tj ET`;
          const stream = add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
          kids.push(add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${num(PW)} ${num(PH)}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${stream} 0 R >>`));
        });
        objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
        objs[pagesObj - 1] = `<< /Type /Pages /Kids [${kids.map((k) => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
        const info = add(`<< /Title ${pdfStr(clean(title))} /Producer (CSE Reviewer) >>`);
        let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
        const offs = [];
        objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
        const xref = out.length;
        out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('');
        out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
        const b = new Uint8Array(out.length);
        for (let i = 0; i < out.length; i++) b[i] = out.charCodeAt(i) & 0xff;
        return b;
      },
    };
    return doc;
  }

  /* The exam result with every question and answer (Premium).
     a: a finished attempt with items (question, choices, answer, explanation), answers, score, total, breakdown.
     opts: { lang: 'tl' | 'en', subjects: { key: { name } }, who: 'Name <email>' } */
  const LETTERS = ['A', 'B', 'C', 'D'];
  const GREEN = [0.06, 0.54, 0.37], RED = [0.78, 0.18, 0.23], MUTED = [0.36, 0.39, 0.47], BLUE = [0.12, 0.25, 0.69];
  function report(a, opts = {}) {
    const en = opts.lang === 'en';
    const L = (tl, e) => (en ? e : tl);
    const subj = (k) => (opts.subjects && opts.subjects[k] && opts.subjects[k].name) || k;
    const pct = (x, y) => (y ? Math.round((x / y) * 1000) / 10 : 0);
    const p = pct(a.score, a.total), passing = a.passing || 80, practice = a.mode === 'practice';
    const when = new Date(a.finished_at || Date.now()).toLocaleString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    const doc = create({ title: a.title, footer: L('CSE Reviewer · Para sa personal na review lamang (RA 10173)', 'CSE Reviewer · For personal review only (RA 10173)') });
    doc.text('CSE Reviewer', { size: 11, bold: true, color: BLUE, after: 0 });
    doc.text(a.title, { size: 17, bold: true, after: 2 });
    doc.text(`${opts.who ? opts.who + '  ·  ' : ''}${when}`, { size: 9.5, color: MUTED, after: 8 });
    doc.text(`${L('Score', 'Score')}: ${a.score}/${a.total}  (${p}%)${practice ? '' : '   ·   ' + (p >= passing ? L('PASADO', 'PASSED') : L('Hindi pa pasado', 'Not passed yet')) + ` (passing ${passing}%)`}`,
      { size: 13, bold: true, color: practice ? BLUE : p >= passing ? GREEN : RED, after: 6 });
    const bd = a.breakdown || {};
    if (Object.keys(bd).length) {
      doc.text(L('Score kada subject', 'Score by subject'), { size: 11, bold: true, after: 1 });
      for (const [k, b] of Object.entries(bd)) doc.text(`${subj(k)}: ${b.correct}/${b.total} (${pct(b.correct, b.total)}%)`, { size: 10, indent: 10, after: 0 });
    }
    doc.space(6).rule();
    doc.text(L('Mga tanong at sagot', 'Questions and answers'), { size: 13, bold: true, after: 4 });
    const answers = a.answers || {};
    let lastPassage = null, lastSubject = null;
    (a.items || []).forEach((it, i) => {
      if (it.subject !== lastSubject) { lastSubject = it.subject; doc.keep(60).space(4).text(subj(it.subject).toUpperCase(), { size: 10, bold: true, color: BLUE, after: 2 }); }
      const ch = answers[i] === undefined ? undefined : Number(answers[i]);
      const ok = ch === it.answer;
      doc.keep(70);
      if (it.passage && it.passage !== lastPassage) doc.text(it.passage, { size: 9.5, color: MUTED, indent: 8, after: 4 });
      lastPassage = it.passage || null;
      doc.text(`${i + 1}. ${it.question}${it.topic ? `   [${it.topic}]` : ''}`, { size: 10.5, bold: true, after: 1 });
      (it.choices || []).forEach((c, j) => doc.text(`${LETTERS[j]}. ${c}`, { size: 10, indent: 14, after: 0, color: j === it.answer ? GREEN : j === ch ? RED : undefined, bold: j === it.answer }));
      doc.text(`${L('Sagot mo', 'Your answer')}: ${ch === undefined ? L('walang sagot', 'none') : LETTERS[ch]}   ·   ${L('Tamang sagot', 'Correct answer')}: ${LETTERS[it.answer]}   ·   ${ok ? L('TAMA', 'CORRECT') : L('MALI', 'WRONG')}`,
        { size: 9.5, bold: true, indent: 14, color: ok ? GREEN : RED, after: 1 });
      if (it.explanation) doc.text(`${L('Paliwanag', 'Explanation')}: ${it.explanation}`, { size: 9.5, indent: 14, color: MUTED, after: 1 });
      doc.space(5);
    });
    return doc.bytes();
  }

  const api = { create, report, clean };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CSEPDF = api;
})(typeof self !== 'undefined' ? self : this);
