import * as XLSX from 'xlsx';
import { toKey, today } from './dates';
import { norm } from './importRows';

// =====================================================
// READ A FULL ESTATE REPORT WORKBOOK (no template needed)
// e.g. "Field Assessment" workbook with sheets:
// Performance, Performance Estate, P&L, <Estate> Cost,
// Field Assessment, Agronomist Visit, Mission 1 Tracker
// =====================================================
const MONTH_NO = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function sheetRows(wb, name) {
  const ws = wb.Sheets[name];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
}

function findSheet(wb, name) {
  return wb.SheetNames.find((n) => norm(n) === norm(name));
}

// Find the header row that has all these words, return column finder
function findHeader(rows, words, from) {
  for (let i = from || 0; i < Math.min(rows.length, 400); i++) {
    const cells = (rows[i] || []).map(norm);
    if (words.every((w) => cells.includes(norm(w)))) {
      const col = (key, not) => {
        const k = norm(key);
        return cells.findIndex((c) => c.startsWith(k) && (!not || !c.includes(norm(not))));
      };
      return { i: i, col: col };
    }
  }
  return null;
}

function cellNum(v) {
  if (typeof v === 'number') return isFinite(v) ? v : null;
  const s = String(v || '').replace(/[^0-9.\-]/g, '');
  if (!s || s === '-' || s === '.') return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function numText(v, dp) {
  const n = cellNum(v);
  if (n === null) return '';
  return String(Math.round(n * Math.pow(10, dp)) / Math.pow(10, dp));
}

// Excel date (serial number / text / Date) -> 'YYYY-MM-DD'
function cellDate(v) {
  if (v instanceof Date) return toKey(v);
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return d.y + '-' + String(d.m).padStart(2, '0') + '-' + String(d.d).padStart(2, '0');
  }
  const s = String(v || '');
  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];
  const day = s.match(/\b(\d{1,2})(st|nd|rd|th)?\b/);
  const mon = s.toLowerCase().match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/);
  const yr = s.match(/\b(20\d{2})\b/);
  if (day && mon && yr) {
    return yr[1] + '-' + String(MONTH_NO[mon[1]]).padStart(2, '0') + '-' + String(Number(day[1])).padStart(2, '0');
  }
  return '';
}

export function firstLine(v, max) {
  const s = String(v || '').split(/\r?\n/).map((x) => x.trim()).filter((x) => x)[0] || '';
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

// Which of the 10 activities a finding belongs to
export function activityFor(text) {
  const t = norm(text);
  if (/ganoderma|pd|pest|disease|rat|bagworm|beetle/.test(t)) return 6;
  if (/manur|fertili|nutri/.test(t)) return 5;
  if (/water|flood|drain/.test(t)) return 7;
  if (/road|access|bridge|fieldcondition|rehab/.test(t)) return 8;
  if (/transport|lorry|vehicle|machine/.test(t)) return 9;
  if (/canopy|prun|upkeep|weed|sanitation|circle|path/.test(t)) return 4;
  if (/loosefruit|quality|oer|ripe|recovery/.test(t)) return 2;
  if (/harvest|round|cropping/.test(t)) return 1;
  if (/manpower|labour|worker|productivity/.test(t)) return 3;
  return 10;
}

// Field cost line -> one of the 12 cost elements (index in COSTS)
function costIndex(level, n2, n4, n6) {
  const a = norm(n2);
  if (level === '2d') {
    if (a.includes('harvest')) return 0;
    if (a.includes('transport')) return 1;
    if (a.includes('manuring')) return 2;
    return -1;
  }
  if (level === '4d' && a.includes('matureupkeep')) {
    const b = norm(n4);
    if (b.includes('weeding')) return 3;
    if (b.includes('sanitation') || b.includes('pruning')) return 4;
    if (b.includes('pandd') || b.includes('pest')) return 5;
    if (b.includes('water') || b.includes('soil')) return 6;
    return 7;
  }
  if (level === '6d' && a.includes('costallocation')) {
    const c = norm(n6);
    if (c.includes('labour')) return 9;
    if (c.includes('road')) return 10;
    if (c.includes('depreciation')) return 11;
    return 8;
  }
  return -1;
}

// Is this an estate report workbook?
export function isReportWorkbook(wb) {
  return !!(findSheet(wb, 'Performance') && wb.SheetNames.some((n) => / cost$/i.test(n.trim())));
}

export function readReportWorkbook(wb) {
  const used = [];
  const est = {}; // estate key -> info
  const ekey = (name) => norm(name);

  // 1. Estates: code + SOU (Performance Estate)
  const peName = findSheet(wb, 'Performance Estate');
  const visitDates = {};
  if (peName) {
    const rows = sheetRows(wb, peName);
    const h = findHeader(rows, ['Estate', 'SOU']);
    if (h) {
      used.push(peName);
      const cE = h.col('estate', 'code');
      const cCode = h.col('estatecode');
      const cSou = h.col('sou');
      for (let i = h.i + 1; i < rows.length; i++) {
        const name = String(rows[i][cE] || '').trim();
        if (!name) break;
        est[ekey(name)] = {
          name: name,
          code: String(rows[i][cCode] || '').trim(),
          sou: String(rows[i][cSou] || '').trim(),
          region: '',
          profitAct: '',
          profitBgt: '',
        };
      }
    }
    const hv = findHeader(rows, ['Estate', 'Visit Date']);
    if (hv) {
      const cE = hv.col('estate');
      const cD = hv.col('visitdate');
      for (let i = hv.i + 1; i < rows.length; i++) {
        const name = String(rows[i][cE] || '').trim();
        if (!name) break;
        visitDates[ekey(name)] = cellDate(rows[i][cD]);
      }
    }
  }

  // 2. Fields + yield (Performance)
  const perfName = findSheet(wb, 'Performance');
  const fields = {}; // ref -> field
  {
    const rows = sheetRows(wb, perfName);
    const h = findHeader(rows, ['Estate', 'Field ID']);
    if (!h) return { error: 'Sheet "Performance" has no "Estate" + "Field ID" header.' };
    used.push(perfName);
    const c = {
      e: h.col('estate'), id: h.col('fieldid'), py: h.col('planted'), ha: h.col('mature'),
      a: h.col('ytdactual'), b: h.col('ytdbudget'), ly: h.col('ytdprior'),
    };
    for (let i = h.i + 1; i < rows.length; i++) {
      const r = rows[i];
      const name = String(r[c.e] || '').trim();
      const ref = String(r[c.id] || '').trim().toUpperCase();
      if (!name || !ref || norm(name) === 'estate') continue;
      if (!est[ekey(name)]) est[ekey(name)] = { name: name, code: '', sou: '', region: '', profitAct: '', profitBgt: '' };
      const e = est[ekey(name)];
      // short code: "E1342016A" -> "2016A" (drop the estate code)
      const code = e.code && ref.startsWith(e.code.toUpperCase()) && ref.length > e.code.length
        ? ref.slice(e.code.length)
        : ref;
      fields[ref] = {
        estate: e.name, code: code, ref: ref,
        year: numText(r[c.py], 0), ha: numText(r[c.ha], 2),
        ypAct: numText(r[c.a], 3), ypBgt: numText(r[c.b], 3), ypLy: numText(r[c.ly], 3),
        costs: {},
      };
    }
  }
  const fieldOf = (ref) => fields[String(ref || '').trim().toUpperCase()];

  // 3. Profit + region (P&L)
  const plName = findSheet(wb, 'P&L');
  if (plName) {
    const rows = sheetRows(wb, plName);
    const h = findHeader(rows, ['P&L Line']);
    if (h) {
      used.push(plName);
      const gp = rows.find((r) => norm(r[0]) === 'grossprofit') || rows.find((r) => norm(r[0]) === 'cropprofit');
      Object.values(est).forEach((e) => {
        const k = norm(e.name) + 'ytd';
        const col = (rows[h.i] || []).findIndex((x) => norm(x).startsWith(k) && norm(x).includes('rmm') && !norm(x).includes('per'));
        if (gp && col >= 0 && cellNum(gp[col]) !== null) {
          e.profitAct = String(Math.round(cellNum(gp[col]) * 1000)); // RM M -> RM'000
        }
      });
    }
    // Region name = column after the estates in "Measure | <estates> | STR | UMY"
    const hm = findHeader(rows, ['Measure']);
    if (hm) {
      const head = rows[hm.i].map((x) => String(x || '').trim());
      let last = -1;
      head.forEach((x, j) => {
        if (est[ekey(x)]) last = j;
      });
      const region = last >= 0 ? head[last + 1] : '';
      if (region) Object.values(est).forEach((e) => (e.region = region));
    }
  }

  // 4. Field costs (<Estate> Cost sheets), RM'000 -> RM/ha
  let costFields = 0;
  wb.SheetNames.filter((n) => / cost$/i.test(n.trim())).forEach((sn) => {
    const rows = sheetRows(wb, sn);
    const h = findHeader(rows, ['Field', 'Level']);
    if (!h) return;
    used.push(sn);
    const c = {
      f: h.col('field'), lv: h.col('level'), n2: h.col('costelement2d'), n4: h.col('costelement4d'),
      n6: h.col('costelement6d'), a: h.col('ytdactual'), b: h.col('ytdbudget'),
    };
    const sums = {};
    for (let i = h.i + 1; i < rows.length; i++) {
      const r = rows[i];
      const fid = String(r[c.f] || '').trim().toUpperCase();
      if (!fid) continue;
      const k = costIndex(norm(r[c.lv]), r[c.n2], r[c.n4], r[c.n6]);
      if (k < 0) continue;
      const s = (sums[fid] = sums[fid] || {});
      s[k] = s[k] || { a: 0, b: 0 };
      s[k].a += cellNum(r[c.a]) || 0;
      s[k].b += cellNum(r[c.b]) || 0;
    }
    Object.keys(sums).forEach((fid) => {
      const f = fieldOf(fid);
      const ha = f ? cellNum(f.ha) : null;
      if (!f || !ha) return;
      costFields++;
      Object.keys(sums[fid]).forEach((k) => {
        f.costs[k] = {
          act: String(Math.round((sums[fid][k].a * 1000) / ha)),
          bgt: String(Math.round((sums[fid][k].b * 1000) / ha)),
        };
      });
    });
  });

  // 5. Visits: PMU upkeep scores (Field Assessment)
  const visits = [];
  const faName = findSheet(wb, 'Field Assessment');
  if (faName) {
    const rows = sheetRows(wb, faName);
    const h = findHeader(rows, ['Estate', 'Field ID', 'Circle']);
    if (h) {
      used.push(faName);
      const c = {
        e: h.col('estate'), id: h.col('fieldid'), st: h.col('pmustatus'), rem: h.col('pmupictorial'),
        sc: [h.col('circle', 'sanitation'), h.col('path'), h.col('circlesanitation'), h.col('selectiveweeding'), h.col('pruning')],
      };
      const scName = ['Circle', 'Path', 'Circle sanitation', 'Selective weeding', 'Pruning'];
      const byEst = {};
      for (let i = h.i + 1; i < rows.length; i++) {
        const r = rows[i];
        const f = fieldOf(r[c.id]);
        if (!f || !norm(r[c.st]).startsWith('assessed')) continue;
        const sc = c.sc.map((j) => cellNum(r[j]));
        const ok = sc.filter((x) => x !== null);
        if (!ok.length) continue;
        const avg = ok.reduce((s, x) => s + x, 0) / ok.length;
        const st = avg < 0.85 ? 'action' : avg < 0.9 ? 'monitor' : 'good';
        const low = sc.map((x, j) => (x !== null && x < 0.85 ? scName[j] + ' ' + Math.round(x * 100) + '%' : null)).filter((x) => x);
        const note = 'PMU ' + Math.round(avg * 100) + '%' + (low.length ? ' · low: ' + low.join(', ') : '') +
          (r[c.rem] ? ' · ' + firstLine(r[c.rem], 160) : '');
        const k = ekey(f.estate);
        const v = (byEst[k] = byEst[k] || { key: 'pmu-' + k, estate: f.estate, title: 'PMU upkeep assessment', date: visitDates[k] || '', checks: {} });
        const ck = (v.checks[f.ref] = v.checks[f.ref] || { manual: {}, notes: {} });
        ck.manual[4] = st;
        ck.notes[4] = note;
      }
      Object.values(byEst).forEach((v) => visits.push(v));
    }
  }

  // 6. Visits: agronomist findings
  const avName = findSheet(wb, 'Agronomist Visit');
  if (avName) {
    const rows = sheetRows(wb, avName);
    const h = findHeader(rows, ['Estate', 'Field ID', 'Main Issue']);
    if (h) {
      used.push(avName);
      const c = {
        id: h.col('fieldid'), d: h.col('visitdate'), who: h.col('visitingagronomist'), bt: h.col('visitbatch'),
        m: h.col('mainissue'), s: h.col('subissue'), r: h.col('reason'), p: h.col('actionplan'),
      };
      const byKey = {};
      for (let i = h.i + 1; i < rows.length; i++) {
        const r = rows[i];
        const f = fieldOf(r[c.id]);
        if (!f) continue;
        // no date: use the half-year in the batch name, e.g. "R&D 2025 (1H)" / "(2H25)"
        const batch = String(r[c.bt] || '').trim();
        const hy = batch.match(/(1H|2H)\s*(\d{2,4})|(\d{4})\s*\((1H|2H)\)/i);
        const yr = hy ? (hy[2] || hy[3]) : '';
        const half = hy ? (hy[1] || hy[4]).toUpperCase() : '';
        const date = cellDate(r[c.d]) || (yr ? (yr.length === 2 ? '20' + yr : yr) + (half === '1H' ? '-06-30' : '-12-31') : '');
        const k = 'av-' + ekey(f.estate) + '-' + norm(batch) + '-' + date;
        const v = (byKey[k] = byKey[k] || {
          key: k, estate: f.estate, date: date,
          title: 'Agronomist' + (batch ? ' · ' + batch : '') + (r[c.who] ? ' · ' + String(r[c.who]).trim() : ''),
          checks: {},
        });
        const issue = [r[c.m], r[c.s]].filter((x) => x && x !== '—').join(' / ');
        const act = activityFor(issue);
        const st = /ganoderma/i.test(issue) ? 'action' : 'monitor';
        const ck = (v.checks[f.ref] = v.checks[f.ref] || { manual: {}, notes: {} });
        if (!ck.manual[act] || st === 'action') ck.manual[act] = st;
        const note = (issue ? issue + ': ' : '') + firstLine(r[c.r], 140) + (r[c.p] ? ' → ' + firstLine(r[c.p], 120) : '');
        ck.notes[act] = ck.notes[act] ? ck.notes[act] + '\n' + note : note;
      }
      Object.values(byKey).forEach((v) => visits.push(v));
    }
  }

  // 7. Follow-ups: Mission 1 action items (YPH + OER tables)
  const actions = [];
  const m1Name = findSheet(wb, 'Mission 1 Tracker');
  if (m1Name) {
    const rows = sheetRows(wb, m1Name);
    let h = findHeader(rows, ['Source', 'Estate', 'Parameter']);
    if (h) used.push(m1Name);
    while (h) {
      const c = {
        e: h.col('estate'), id: 2, p: h.col('parameter'), a: h.col('actionitemas'), fn: h.col('fieldnameas'),
        lf: h.col('linkedfieldid'), st: h.col('progressstatus'), s0: h.col('actualstart'), te: h.col('targetend'),
        cd: h.col('completeddate'), nr: h.col('newrevised'), pic: h.col('personincharge'),
      };
      let i = h.i + 1;
      for (; i < rows.length; i++) {
        const r = rows[i];
        const name = String(r[c.e] || '').trim();
        if (!name || !est[ekey(name)]) break;
        const id = String(r[c.id] || '').trim();
        const status = String(r[c.st] || '').trim();
        if (!id || /omit/i.test(status) || /omit/i.test(String(r[3] || ''))) continue;
        const f = fieldOf(r[c.lf]);
        const where = f || !r[c.fn] || /^all/i.test(String(r[c.fn])) ? '' : ' (fields: ' + firstLine(r[c.fn], 60) + ')';
        const done = /complet/i.test(status);
        actions.push({
          key: 'm1-' + id + (f ? '-' + f.ref : ''),
          estate: est[ekey(name)].name,
          fieldRef: f ? f.ref : null,
          actId: activityFor(r[c.p] + ' ' + r[c.a]),
          text: id + ' ' + String(r[c.p] || '').trim() + ': ' + firstLine(r[c.a], 120) + where,
          pic: firstLine(r[c.pic], 60),
          due: cellDate(r[c.nr]) || cellDate(r[c.te]),
          status: done ? 'done' : 'open',
          doneAt: done ? cellDate(r[c.cd]) || null : null,
          createdAt: cellDate(r[c.s0]) || today(),
        });
      }
      h = findHeader(rows, ['Source', 'Estate', 'Parameter'], i);
    }
  }

  // Fields -> import rows (same shape as a simple table)
  const out = Object.values(fields).map((f) => {
    const e = est[ekey(f.estate)];
    return {
      estate: f.estate, region: e.region, sou: e.sou, code: f.code,
      year: f.year, ha: f.ha, ypAct: f.ypAct, ypBgt: f.ypBgt, ypLy: f.ypLy,
      profitAct: e.profitAct, profitBgt: e.profitBgt, costs: f.costs, ref: f.ref,
    };
  });
  if (!out.length) return { error: 'The workbook has a "Performance" sheet, but no fields were found in it.' };
  return {
    rows: out,
    report: true,
    found: used,
    ignored: wb.SheetNames.filter((n) => !used.includes(n)),
    skipped: 0,
    sheet: '',
    costFields: costFields,
    visits: visits,
    actions: actions,
  };
}

// After estates/fields are saved: turn report visits + follow-ups into app items
export function reportItems(result, es, fs) {
  const eId = (name) => (es.find((e) => norm(e.name) === norm(name)) || {}).id;
  const fId = {};
  result.rows.forEach((r) => {
    const e = eId(r.estate);
    const f = fs.find((x) => x.estateId === e && x.code === r.code);
    if (f) fId[r.ref] = f.id;
  });
  const visits = result.visits
    .map((v) => {
      const checks = {};
      Object.keys(v.checks).forEach((ref) => {
        if (fId[ref]) checks[fId[ref]] = { readings: {}, ...v.checks[ref] };
      });
      return {
        id: 'x-' + v.key, estateId: eId(v.estate), date: v.date || '',
        title: v.title, fieldIds: Object.keys(checks), checks: checks,
      };
    })
    .filter((v) => v.estateId && v.fieldIds.length);
  const actions = result.actions
    .map((a) => ({
      id: 'x-' + a.key, estateId: eId(a.estate), visitId: null,
      fieldId: a.fieldRef ? fId[a.fieldRef] || null : null,
      actId: a.actId, text: a.text, pic: a.pic, due: a.due,
      status: a.status, doneAt: a.doneAt, createdAt: a.createdAt,
    }))
    .filter((a) => a.estateId);
  return { visits: visits, actions: actions };
}
