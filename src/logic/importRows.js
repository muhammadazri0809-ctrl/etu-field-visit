import { newId } from './dates';
import { COSTS } from './rules';

// =====================================================
// UPLOAD: read estate data from Excel / CSV / pasted text
// One row per field. The app finds the columns by name.
// =====================================================
export function norm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Column names the app understands (any of these spellings)
const COLS = {
  region: ['region', 'wilayah', 'regionname'],
  sou: ['sou', 'souname', 'operatingunit', 'strategicoperatingunit', 'unit'],
  estate: ['estate', 'estatename', 'kebun', 'ladang'],
  code: ['field', 'fieldcode', 'fieldno', 'block', 'blok', 'blockno', 'peringkat'],
  year: ['planted', 'plantedyear', 'yearplanted', 'py', 'plantingyear', 'yop', 'tahuntanam'],
  ha: ['matureha', 'ha', 'hectare', 'hectarage', 'area', 'maturearea', 'mature'],
  ypAct: ['yieldact', 'yieldactual', 'actualyield', 'yphact', 'yield', 'ytdyield', 'yieldytd'],
  ypBgt: ['yieldbgt', 'yieldbudget', 'budgetyield', 'yphbgt'],
  ypLy: ['yieldly', 'yieldlastyear', 'lyyield', 'yphly'],
  profitAct: ['profitact', 'profitactual', 'actualprofit', 'profit'],
  profitBgt: ['profitbgt', 'profitbudget', 'budgetprofit'],
};
const COL_LABEL = {
  region: 'Region', sou: 'SOU', estate: 'Estate', code: 'Field', year: 'Planted', ha: 'Mature ha',
  ypAct: 'Yield Act', ypBgt: 'Yield Bgt', ypLy: 'Yield LY',
  profitAct: 'Profit Act', profitBgt: 'Profit Bgt',
};

// Short names for the 12 cost elements (same order as COSTS)
const COST_ALIASES = [
  ['harvestingcollection', 'harvesting', 'harvcoll', 'harvest'],
  ['transport', 'ffbtransport', 'ffbtrans'],
  ['manuring', 'fertilizer', 'fertiliser', 'manure'],
  ['weeding'],
  ['sanitationpruning', 'sanitation', 'pruning'],
  ['pestdisease', 'pestanddisease', 'pd', 'pnd', 'pest'],
  ['watersoilconservation', 'watermanagement', 'water', 'soilconservation', 'soil'],
  ['otherupkeep', 'upkeep', 'matureupkeep'],
  ['estateadmin', 'admin', 'adminpaidbyho', 'generalcharges', 'general'],
  ['labouroverheads', 'labour', 'laboroverheads'],
  ['roadsbridges', 'roadsandbridges', 'roads', 'road', 'roadmaintenance'],
  ['depreciation', 'estatedepreciation'],
];
const ACT_WORDS = ['act', 'actual', 'a'];
const BGT_WORDS = ['bgt', 'budget', 'b'];

// Which column number holds each value
export function matchColumns(header) {
  const map = { costs: {} };
  const used = {};
  header.forEach((h, i) => {
    const n = norm(h);
    if (!n) return;
    Object.keys(COLS).forEach((k) => {
      if (map[k] === undefined && COLS[k].includes(n)) {
        map[k] = i;
        used[i] = COL_LABEL[k];
      }
    });
    if (used[i]) return;
    COST_ALIASES.forEach((aliases, ci) => {
      aliases.forEach((al) => {
        ACT_WORDS.forEach((w) => {
          if (n === al + w || n === w + al) {
            map.costs[ci] = { ...(map.costs[ci] || {}), act: i };
            used[i] = COSTS[ci] + ' Act';
          }
        });
        BGT_WORDS.forEach((w) => {
          if (n === al + w || n === w + al) {
            map.costs[ci] = { ...(map.costs[ci] || {}), bgt: i };
            used[i] = COSTS[ci] + ' Bgt';
          }
        });
      });
    });
  });
  const ignored = header.filter((h, i) => norm(h) && !used[i]);
  return { map: map, found: Object.values(used), ignored: ignored };
}

// Text copied from Excel (tabs) or CSV (commas) -> rows
export function textToRows(text) {
  const lines = String(text || '').split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const tab = lines[0].includes('\t');
  return lines.map((line) => {
    if (tab) return line.split('\t');
    const out = [];
    let cur = '';
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') q = !q;
      else if (ch === ',' && !q) {
        out.push(cur);
        cur = '';
      } else cur += ch;
    }
    out.push(cur);
    return out;
  });
}

// "1,234.5" or "RM 1,234" -> "1234.5"; blank stays blank
function cleanNum(v) {
  const s = String(v === undefined || v === null ? '' : v).replace(/[^0-9.\-]/g, '');
  return s === '' || s === '-' || s === '.' ? '' : s;
}

// Rows -> preview of what will be imported
export function readRows(rows) {
  let hi = -1;
  let m = null;
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const t = matchColumns(rows[i]);
    if (t.map.estate !== undefined && t.map.code !== undefined) {
      hi = i;
      m = t;
      break;
    }
  }
  if (hi < 0) {
    // Show what the app did see, to help fix the file
    const firstRow = rows.find((r) => (r || []).some((c) => String(c || '').trim())) || [];
    const seen = firstRow.map((c) => String(c || '').trim()).filter((c) => c).slice(0, 8);
    return {
      error:
        'Could not find the header row. It needs at least an "Estate" and a "Field" column.' +
        (seen.length ? '\nFirst row seen: ' + seen.join(' | ') : '\nNo data was found.'),
      seen: seen,
    };
  }
  const get = (r, i) => (i === undefined ? '' : String(r[i] === undefined ? '' : r[i]).trim());
  const out = [];
  let skipped = 0;
  rows.slice(hi + 1).forEach((r) => {
    const estate = get(r, m.map.estate);
    const code = get(r, m.map.code).toUpperCase();
    if (!estate || !code) {
      if (r.some((c) => String(c || '').trim())) skipped++;
      return;
    }
    const costs = {};
    Object.keys(m.map.costs).forEach((ci) => {
      costs[ci] = {
        act: cleanNum(get(r, m.map.costs[ci].act)),
        bgt: cleanNum(get(r, m.map.costs[ci].bgt)),
      };
    });
    out.push({
      region: get(r, m.map.region),
      sou: get(r, m.map.sou),
      estate: estate,
      code: code,
      year: cleanNum(get(r, m.map.year)),
      ha: cleanNum(get(r, m.map.ha)),
      ypAct: cleanNum(get(r, m.map.ypAct)),
      ypBgt: cleanNum(get(r, m.map.ypBgt)),
      ypLy: cleanNum(get(r, m.map.ypLy)),
      profitAct: cleanNum(get(r, m.map.profitAct)),
      profitBgt: cleanNum(get(r, m.map.profitBgt)),
      costs: costs,
    });
  });
  return { rows: out, found: m.found, ignored: m.ignored, skipped: skipped };
}

// Merge rows into saved estates & fields (match by name / code)
// replace = true: remove estates & fields that are not in the file
export function applyImport(rows, estates, fields, replace) {
  const es = estates.map((e) => ({ ...e }));
  const fs = fields.map((f) => ({ ...f, costs: { ...(f.costs || {}) } }));
  let newE = 0;
  let newF = 0;
  let updF = 0;
  const keep = (oldV, newV) => (newV === '' || newV === undefined ? oldV : newV);
  const seenE = {};
  const seenF = {};
  rows.forEach((r) => {
    let e = es.find((x) => norm(x.name) === norm(r.estate));
    if (!e) {
      e = { id: newId(), name: r.estate, region: '', sou: '', profitAct: '', profitBgt: '' };
      es.push(e);
      newE++;
    }
    seenE[e.id] = true;
    e.region = keep(e.region, r.region);
    e.sou = keep(e.sou, r.sou);
    e.profitAct = keep(e.profitAct, r.profitAct);
    e.profitBgt = keep(e.profitBgt, r.profitBgt);
    let f = fs.find((x) => x.estateId === e.id && x.code === r.code);
    if (!f) {
      f = { id: newId(), estateId: e.id, code: r.code, year: '', ha: '', ypAct: '', ypBgt: '', ypLy: '', costs: {} };
      fs.push(f);
      newF++;
    } else {
      updF++;
    }
    seenF[f.id] = true;
    ['year', 'ha', 'ypAct', 'ypBgt', 'ypLy'].forEach((k) => {
      f[k] = keep(f[k], r[k]);
    });
    Object.keys(r.costs).forEach((ci) => {
      const old = f.costs[ci] || {};
      f.costs[ci] = {
        act: keep(old.act, r.costs[ci].act),
        bgt: keep(old.bgt, r.costs[ci].bgt),
      };
    });
  });
  if (replace) {
    const keptE = es.filter((e) => seenE[e.id]);
    const keptF = fs.filter((f) => seenF[f.id]);
    return {
      estates: keptE, fields: keptF, newE: newE, newF: newF, updF: updF,
      delE: es.length - keptE.length, delF: fs.length - keptF.length,
    };
  }
  return { estates: es, fields: fs, newE: newE, newF: newF, updF: updF, delE: 0, delF: 0 };
}

// Header row for the template (copy into Excel)
export function templateHeader() {
  const h = ['Region', 'SOU', 'Estate', 'Field', 'Planted', 'Mature ha', 'Yield Act', 'Yield Bgt', 'Yield LY', 'Profit Act', 'Profit Bgt'];
  COSTS.forEach((c) => {
    h.push(c + ' Act');
    h.push(c + ' Bgt');
  });
  return h.join('\t');
}
