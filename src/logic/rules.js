import { today } from './dates';

// =====================================================
// THE 10 CORE ACTIVITIES + THEIR TRIGGERS
// op '>' bigger is worse, '<' smaller is worse,
// 'yes' = confirmed case is always Action.
// Change the numbers to match your SOP.
// =====================================================
export const ACTIVITIES = [
  {
    id: 1, name: 'Harvesting & Evacuation', icon: 'leaf',
    rules: [
      { id: 'h_int', name: 'Harvesting interval', unit: 'days', op: '>', amber: 10, red: 12 },
      { id: 'h_ffb', name: 'FFB awaiting evacuation', unit: 'hrs', op: '>', amber: 12, red: 24 },
      { id: 'h_task', name: 'Daily task achieved', unit: '%', op: '<', amber: 80, red: 50 },
    ],
  },
  {
    id: 2, name: 'Harvesting Quality & Recovery', icon: 'ribbon',
    rules: [
      { id: 'q_ripe', name: 'Ripe bunches unharvested', unit: 'bunch/ha', op: '>', amber: 1, red: 3 },
      { id: 'q_loose', name: 'Loose fruit left behind', unit: 'kg/ha', op: '>', amber: 2, red: 5 },
      { id: 'q_stalk', name: 'Long stalk > 5 cm', unit: '%', op: '>', amber: 5, red: 10 },
    ],
  },
  {
    id: 3, name: 'Manpower & Productivity', icon: 'people',
    rules: [
      { id: 'm_out', name: 'Output vs baseline', unit: '%', op: '<', amber: 90, red: 80 },
      { id: 'm_abs', name: 'Absenteeism', unit: '%', op: '>', amber: 10, red: 15 },
    ],
  },
  {
    id: 4, name: 'Field Upkeep', icon: 'construct',
    rules: [
      { id: 'u_cov', name: 'Daily ha coverage vs target', unit: '%', op: '<', amber: 90, red: 75 },
      { id: 'u_untr', name: 'Untreated / missed strips', unit: 'ha', op: '>', amber: 0, red: 2 },
      { id: 'u_late', name: 'Scheduled work late', unit: 'days', op: '>', amber: 1, red: 3 },
    ],
  },
  {
    id: 5, name: 'Fertilizer', icon: 'flask',
    rules: [
      { id: 'f_var', name: 'Application rate variance', unit: '%', op: '>', amber: 10, red: 15 },
      { id: 'f_late', name: 'Manuring programme overdue', unit: 'days', op: '>', amber: 7, red: 14 },
    ],
  },
  {
    id: 6, name: 'Pest, Disease & Palm Health', icon: 'bug',
    rules: [
      { id: 'p_gano', name: 'Ganoderma confirmed', unit: '', op: 'yes' },
      { id: 'p_yel', name: 'Yellowing index', unit: '%', op: '>', amber: 10, red: 15 },
      { id: 'p_rat', name: 'Fresh rat damage', unit: '%', op: '>', amber: 3, red: 5 },
    ],
  },
  {
    id: 7, name: 'Water & Soil', icon: 'water',
    rules: [
      { id: 'w_log', name: 'Waterlogged area', unit: 'ha', op: '>', amber: 0, red: 2 },
      { id: 'w_drain', name: 'Drain flow restriction', unit: '%', op: '>', amber: 25, red: 60 },
    ],
  },
  {
    id: 8, name: 'Roads & Accessibility', icon: 'map',
    rules: [
      { id: 'r_imp', name: 'Path / road impassable', unit: '', op: 'yes' },
      { id: 'r_bridge', name: 'Bridge / culvert risk', unit: '/10', op: '>', amber: 5, red: 7 },
    ],
  },
  {
    id: 9, name: 'Transport & Machinery', icon: 'car',
    rules: [
      { id: 'l_brk', name: 'Breakdown delay', unit: 'hrs', op: '>', amber: 0.5, red: 2 },
      { id: 'l_pend', name: 'FFB pending, no lorry', unit: 'tonnes', op: '>', amber: 5, red: 15 },
    ],
  },
  {
    id: 10, name: 'Field Compliance', icon: 'shield-checkmark',
    rules: [
      { id: 'c_std', name: 'Field standard not met', unit: '', op: 'yes' },
      { id: 'c_behind', name: 'Work behind schedule', unit: '%', op: '>', amber: 15, red: 30 },
    ],
  },
];

// Remember the default trigger numbers
export const DEFAULT_RULES = {};
ACTIVITIES.forEach((a) =>
  a.rules.forEach((r) => {
    DEFAULT_RULES[r.id] = { red: r.red, amber: r.amber };
  })
);

// Put the numbers from Settings into the rules
export function applySettings(st) {
  const s = st || {};
  LIMITS.cost = num(s.cost) !== null ? num(s.cost) : DEFAULT_LIMITS.cost;
  LIMITS.yieldRed = num(s.yieldRed) !== null ? num(s.yieldRed) : DEFAULT_LIMITS.yieldRed;
  LIMITS.yieldAmber = num(s.yieldAmber) !== null ? num(s.yieldAmber) : DEFAULT_LIMITS.yieldAmber;
  ACTIVITIES.forEach((a) =>
    a.rules.forEach((r) => {
      const o = (s.rules || {})[r.id] || {};
      r.red = num(o.red) !== null ? num(o.red) : DEFAULT_RULES[r.id].red;
      r.amber = num(o.amber) !== null ? num(o.amber) : DEFAULT_RULES[r.id].amber;
    })
  );
}

export function actOf(id) {
  return ACTIVITIES.find((a) => a.id === Number(id)) || ACTIVITIES[0];
}

export function no2(id) {
  return String(id).padStart(2, '0');
}

// ===== THE 12 COST ELEMENTS (RM/ha YTD) =====
export const COSTS = [
  'Harvesting & Collection',
  'Transport',
  'Manuring',
  'Weeding',
  'Sanitation & Pruning',
  'Pest & Disease',
  'Water & Soil Conservation',
  'Other Upkeep',
  'Estate Admin',
  'Labour Overheads',
  'Roads & Bridges',
  'Depreciation',
];
// Default limits (can be changed in Settings)
export const LIMITS = { cost: 10, yieldRed: -10, yieldAmber: -5 };
export const DEFAULT_LIMITS = { ...LIMITS };

// ===== STATUS =====
export const STATUS = {
  good: { label: 'Good', tone: 'good', icon: 'checkmark-circle' },
  monitor: { label: 'Monitor', tone: 'mon', icon: 'warning' },
  action: { label: 'Action', tone: 'att', icon: 'alert-circle' },
};
export const RANK = { good: 0, monitor: 1, action: 2 };

// ===== TRIGGER: one reading -> good / monitor / action =====
export function evaluate(rule, raw) {
  if (rule.op === 'yes') {
    if (raw === 'yes') return 'action';
    if (raw === 'no') return 'good';
    return null;
  }
  const v = parseFloat(raw);
  if (isNaN(v)) return null;
  if (rule.op === '>') {
    if (v > rule.red) return 'action';
    if (v > rule.amber) return 'monitor';
    return 'good';
  }
  if (v < rule.red) return 'action';
  if (v < rule.amber) return 'monitor';
  return 'good';
}

export function limitText(rule) {
  if (rule.op === 'yes') return 'Yes = Action';
  return 'Action ' + rule.op + ' ' + rule.red + ' · Monitor ' + rule.op + ' ' + rule.amber;
}


// ===== FIELD YIELD TRIGGER (YTD mt/ha vs budget) =====
// (yield limits are in LIMITS above)

// ===== ONE FIELD'S CHECK IN A VISIT =====
export function checkOf(visit, fieldId) {
  return (visit.checks || {})[fieldId] || { readings: {}, manual: {}, notes: {} };
}

// Worst result of the readings for one activity
export function autoStatus(check, act) {
  let worst = null;
  act.rules.forEach((r) => {
    const st = evaluate(r, (check.readings || {})[r.id]);
    if (st && (worst === null || RANK[st] > RANK[worst])) worst = st;
  });
  return worst;
}

// Your own choice wins; otherwise the auto trigger
export function actStatus(check, act) {
  return (check.manual || {})[act.id] || autoStatus(check, act);
}

// Every (field, activity) result in a visit
export function findings(visit) {
  const out = [];
  (visit.fieldIds || []).forEach((fid) => {
    const ck = checkOf(visit, fid);
    ACTIVITIES.forEach((act) => {
      const st = actStatus(ck, act);
      if (st) out.push({ fieldId: fid, act: act, st: st, note: (ck.notes || {})[act.id] || '' });
    });
  });
  return out;
}

export function countIn(list, st) {
  return list.filter((x) => x.st === st).length;
}

// ===== NUMBERS =====
export function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

export function variance(act, bgt) {
  const a = num(act);
  const b = num(bgt);
  if (a === null || b === null || b === 0) return null;
  return ((a - b) / b) * 100;
}

export function pctText(v) {
  if (v === null || v === undefined) return '-';
  return (v > 0 ? '+' : '') + v.toFixed(1) + '%';
}

// RM'000 -> "RM 16.26 mil"
export function rmMil(v) {
  const n = num(v);
  if (n === null) return '-';
  const s = (n / 1000).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return 'RM ' + s + ' mil';
}

export function money(v) {
  const n = num(v);
  return n === null ? '-' : Math.round(n).toLocaleString('en-MY');
}

// ===== FIELD HELPERS =====
export function yieldVar(f) {
  return variance(f.ypAct, f.ypBgt);
}

export function yieldStatus(f) {
  const v = yieldVar(f);
  if (v === null) return null;
  if (v < LIMITS.yieldRed) return 'action';
  if (v < LIMITS.yieldAmber) return 'monitor';
  return 'good';
}

export function costOf(obj, i) {
  return (obj.costs || {})[i] || {};
}

export function costAlerts(obj) {
  return COSTS.filter((n, i) => {
    const v = variance(costOf(obj, i).act, costOf(obj, i).bgt);
    return v !== null && v > LIMITS.cost;
  });
}

// Estate cost = field costs weighted by mature ha
export function estateCost(fields) {
  const costs = {};
  COSTS.forEach((n, i) => {
    let a = 0;
    let ah = 0;
    let b = 0;
    let bh = 0;
    fields.forEach((f) => {
      const ha = num(f.ha) || 0;
      const c = costOf(f, i);
      if (num(c.act) !== null && ha) {
        a += num(c.act) * ha;
        ah += ha;
      }
      if (num(c.bgt) !== null && ha) {
        b += num(c.bgt) * ha;
        bh += ha;
      }
    });
    costs[i] = {
      act: ah ? String(a / ah) : '',
      bgt: bh ? String(b / bh) : '',
    };
  });
  return { costs: costs };
}

// Estate yield = weighted by mature ha
export function estateYield(fields) {
  let a = 0;
  let b = 0;
  let h = 0;
  fields.forEach((f) => {
    const ha = num(f.ha) || 0;
    if (num(f.ypAct) !== null && num(f.ypBgt) !== null && ha) {
      a += num(f.ypAct) * ha;
      b += num(f.ypBgt) * ha;
      h += ha;
    }
  });
  if (!h) return null;
  return { act: a / h, bgt: b / h, v: ((a - b) / b) * 100, ha: h };
}

export function profitVar(estate) {
  return variance(estate.profitAct, estate.profitBgt);
}

export function latestVisit(visits, estateId) {
  return visits
    .filter((v) => v.estateId === estateId)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

// Latest visit that included this field
export function latestFieldVisit(visits, fieldId) {
  return visits
    .filter((v) => (v.fieldIds || []).includes(fieldId))
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

// ===== FOLLOW-UP ACTIONS =====
export function isOverdue(a) {
  return a.status !== 'done' && a.due && a.due < today();
}


export function sortActions(list) {
  return [...list].sort((a, b) => {
    if ((a.status === 'done') !== (b.status === 'done')) return a.status === 'done' ? 1 : -1;
    return (a.due || '').localeCompare(b.due || '');
  });
}
