// ETU FIELD VISIT v7.2 (reads full estate report workbook, region/SOU lookup, fields, upload, photos, settings)
// Site visits + 10 activity triggers + follow-up actions
// + 12 cost elements + estate profit
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  StatusBar,
  ActivityIndicator,
  Share,
  Modal,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as XLSX from 'xlsx';
import Svg, {
  Path,
  G,
  Rect,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import {
  useFonts,
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
} from '@expo-google-fonts/barlow-condensed';
import {
  PublicSans_400Regular,
  PublicSans_600SemiBold,
  PublicSans_700Bold,
} from '@expo-google-fonts/public-sans';

// ===== COLOURS (same palette as ETU Field Visit) =====
const C = {
  bg: '#F4F2EA',
  surface: '#FFFDF8',
  sunk: '#EBE7DA',
  ink: '#1B241B',
  muted: '#4F564A',
  line: '#D6D1BF',
  accent: '#335F3B',
  accentSoft: '#E3EADB',
  brand: '#2C5534',
  gold: '#A8812C',
  goldSoft: '#F3E9CF',
  att: '#B4533C',
  attBg: '#F5E4DC',
  rnd: '#4A7391',
  rndBg: '#E2EBF1',
  mon: '#A8741F',
  monBg: '#F5EAD2',
  good: '#4F7D3C',
  goodBg: '#E4EEDB',
  amber: '#D9A43A',
  sky1: '#D6E8F1',
  sky2: '#F3F0E2',
  skyTop: '#E8F0EE',
  hill: '#D3DCC0',
  soil: '#BCD29A',
  soil2: '#A3C07F',
  road: '#E2D5B2',
};
const PALM = ['', '#A9BB92', '#7A9466', '#4C6C45'];

// ===== FONTS =====
const F = {
  display: 'BarlowCondensed_600SemiBold',
  displayBold: 'BarlowCondensed_700Bold',
  body: 'PublicSans_400Regular',
  semi: 'PublicSans_600SemiBold',
  bold: 'PublicSans_700Bold',
};

// Text that always uses the body font
function T({ style, ...props }) {
  return <Text style={[styles.body, style]} {...props} />;
}

// ===== HELPER: state that saves itself =====
function useSavedState(key, startValue) {
  const [value, setValue] = useState(startValue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(key).then((saved) => {
      if (saved) setValue(JSON.parse(saved));
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(key, JSON.stringify(value));
    }
  }, [value, loaded]);

  return [value, setValue];
}

// ===== HELPERS: dates =====
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function toKey(d) {
  return (
    d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

function today() {
  return toKey(new Date());
}

function addDays(key, n) {
  const d = new Date(key + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toKey(d);
}

function showDate(key) {
  if (!key || key.length < 10) return key || '-';
  const p = key.split('-');
  return Number(p[2]) + ' ' + MONTHS[Number(p[1]) - 1] + ' ' + p[0];
}

function newId() {
  return Date.now().toString() + Math.random().toString(36).slice(2, 5);
}

// ===== OIL PALM PLANTATION SCENE =====
function n1(v) {
  return v.toFixed(1);
}

function palm(x, by, h, k, lean) {
  const cx = x + lean;
  const cy = by - h;
  const r = h * 0.55;
  const tw = Math.max(1.2, h * 0.07);
  const D = [
    [-1, -0.15], [-0.85, 0.3], [-0.5, -0.55],
    [-0.1, -0.8], [0.35, -0.65], [0.8, 0.25],
    [1, -0.1], [-0.55, 0.55], [0.55, 0.55],
  ];
  let f = '';
  D.forEach(([dx, dy]) => {
    const L = Math.hypot(dx, dy);
    const ux = dx / L;
    const uy = dy / L;
    const tx = cx + ux * r;
    const ty = cy + uy * r + r * 0.28;
    const mx = (cx + tx) / 2;
    const my = (cy + ty) / 2 - r * 0.12;
    const w = r * 0.13;
    f +=
      'M' + n1(cx) + ' ' + n1(cy) +
      'Q' + n1(mx - uy * w) + ' ' + n1(my + ux * w) +
      ' ' + n1(tx) + ' ' + n1(ty) +
      'Q' + n1(mx + uy * w) + ' ' + n1(my - ux * w) +
      ' ' + n1(cx) + ' ' + n1(cy) + 'Z';
  });
  const trunk =
    'M' + x + ' ' + by +
    'Q' + n1(x + lean * 0.3) + ' ' + n1(by - h * 0.5) +
    ' ' + n1(cx) + ' ' + n1(cy);
  return { trunk: trunk, fronds: f, k: k, tw: tw };
}

const BACK_PALMS = [];
for (let x = -6; x < 410; x += 23) {
  BACK_PALMS.push(palm(x, 92 + ((x / 23) % 2) * 2, 26, 1, ((x * 7) % 5) - 2));
}
const MID_PALMS = [];
for (let x = 10; x < 410; x += 46) {
  MID_PALMS.push(palm(x, 110, 44, 2, ((x * 3) % 7) - 3));
}
const FRONT_PALMS = [palm(4, 134, 58, 3, 6), palm(396, 134, 54, 3, -6)];

function PalmGroup({ list }) {
  return list.map((p, i) => (
    <G key={i}>
      <Path
        d={p.trunk}
        stroke={PALM[p.k]}
        strokeWidth={p.tw}
        fill="none"
        strokeLinecap="round"
      />
      <Path d={p.fronds} fill={PALM[p.k]} />
    </G>
  ));
}

function Scene({ height }) {
  return (
    <Svg
      width="100%"
      height={height}
      viewBox="0 0 400 130"
      preserveAspectRatio="xMidYMax slice"
      style={styles.scene}>
      <Path
        d="M0 78 Q70 52 150 70 T300 62 T400 70 V130 H0z"
        fill={C.hill}
      />
      <PalmGroup list={BACK_PALMS} />
      <Path d="M0 96 Q200 88 400 96 V130 H0z" fill={C.soil} />
      <PalmGroup list={MID_PALMS} />
      <Path d="M0 112 Q200 106 400 112 V130 H0z" fill={C.soil2} />
      <Path d="M150 130 L196 108 L204 108 L250 130z" fill={C.road} />
      <PalmGroup list={FRONT_PALMS} />
    </Svg>
  );
}

// =====================================================
// THE 10 CORE ACTIVITIES + THEIR TRIGGERS
// op '>' bigger is worse, '<' smaller is worse,
// 'yes' = confirmed case is always Action.
// Change the numbers to match your SOP.
// =====================================================
const ACTIVITIES = [
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
const DEFAULT_RULES = {};
ACTIVITIES.forEach((a) =>
  a.rules.forEach((r) => {
    DEFAULT_RULES[r.id] = { red: r.red, amber: r.amber };
  })
);

// Put the numbers from Settings into the rules
function applySettings(st) {
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

function actOf(id) {
  return ACTIVITIES.find((a) => a.id === Number(id)) || ACTIVITIES[0];
}

function no2(id) {
  return String(id).padStart(2, '0');
}

// ===== THE 12 COST ELEMENTS (RM/ha YTD) =====
const COSTS = [
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
const LIMITS = { cost: 10, yieldRed: -10, yieldAmber: -5 };
const DEFAULT_LIMITS = { ...LIMITS };

// ===== STATUS =====
const STATUS = {
  good: { label: 'Good', tone: 'good', icon: 'checkmark-circle' },
  monitor: { label: 'Monitor', tone: 'mon', icon: 'warning' },
  action: { label: 'Action', tone: 'att', icon: 'alert-circle' },
};
const RANK = { good: 0, monitor: 1, action: 2 };

// ===== TRIGGER: one reading -> good / monitor / action =====
function evaluate(rule, raw) {
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

function limitText(rule) {
  if (rule.op === 'yes') return 'Yes = Action';
  return 'Action ' + rule.op + ' ' + rule.red + ' · Monitor ' + rule.op + ' ' + rule.amber;
}


// ===== FIELD YIELD TRIGGER (YTD mt/ha vs budget) =====
// (yield limits are in LIMITS above)

// ===== ONE FIELD'S CHECK IN A VISIT =====
function checkOf(visit, fieldId) {
  return (visit.checks || {})[fieldId] || { readings: {}, manual: {}, notes: {} };
}

// Worst result of the readings for one activity
function autoStatus(check, act) {
  let worst = null;
  act.rules.forEach((r) => {
    const st = evaluate(r, (check.readings || {})[r.id]);
    if (st && (worst === null || RANK[st] > RANK[worst])) worst = st;
  });
  return worst;
}

// Your own choice wins; otherwise the auto trigger
function actStatus(check, act) {
  return (check.manual || {})[act.id] || autoStatus(check, act);
}

// Every (field, activity) result in a visit
function findings(visit) {
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

function countIn(list, st) {
  return list.filter((x) => x.st === st).length;
}

// ===== NUMBERS =====
function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function variance(act, bgt) {
  const a = num(act);
  const b = num(bgt);
  if (a === null || b === null || b === 0) return null;
  return ((a - b) / b) * 100;
}

function pctText(v) {
  if (v === null || v === undefined) return '-';
  return (v > 0 ? '+' : '') + v.toFixed(1) + '%';
}

function money(v) {
  const n = num(v);
  return n === null ? '-' : Math.round(n).toLocaleString('en-MY');
}

// ===== FIELD HELPERS =====
function yieldVar(f) {
  return variance(f.ypAct, f.ypBgt);
}

function yieldStatus(f) {
  const v = yieldVar(f);
  if (v === null) return null;
  if (v < LIMITS.yieldRed) return 'action';
  if (v < LIMITS.yieldAmber) return 'monitor';
  return 'good';
}

function costOf(obj, i) {
  return (obj.costs || {})[i] || {};
}

function costAlerts(obj) {
  return COSTS.filter((n, i) => {
    const v = variance(costOf(obj, i).act, costOf(obj, i).bgt);
    return v !== null && v > LIMITS.cost;
  });
}

// Estate cost = field costs weighted by mature ha
function estateCost(fields) {
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
function estateYield(fields) {
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

function profitVar(estate) {
  return variance(estate.profitAct, estate.profitBgt);
}

function latestVisit(visits, estateId) {
  return visits
    .filter((v) => v.estateId === estateId)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

// Latest visit that included this field
function latestFieldVisit(visits, fieldId) {
  return visits
    .filter((v) => (v.fieldIds || []).includes(fieldId))
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

// ===== FOLLOW-UP ACTIONS =====
function isOverdue(a) {
  return a.status !== 'done' && a.due && a.due < today();
}

// ===== WHATSAPP / EMAIL VISIT REPORT =====
function visitReport(visit, estate, fields, actions) {
  const fcode = (id) => (id ? (fields.find((f) => f.id === id) || {}).code || '?' : 'Estate');
  const all = findings(visit);
  const lines = [
    'ETU FIELD VISIT REPORT',
    estate.name + ' · ' + showDate(visit.date),
    'Fields: ' + (visit.fieldIds || []).map(fcode).join(', '),
    '',
    'Action: ' + countIn(all, 'action') +
      ' | Monitor: ' + countIn(all, 'monitor') +
      ' | Good: ' + countIn(all, 'good'),
  ];
  (visit.fieldIds || []).forEach((fid) => {
    const f = fields.find((x) => x.id === fid) || {};
    const ck = checkOf(visit, fid);
    lines.push('', 'FIELD ' + (f.code || '?') +
      (f.ypAct ? '  (yield ' + f.ypAct + ' vs ' + (f.ypBgt || '-') + ' mt/ha, ' + pctText(yieldVar(f)) + ')' : ''));
    ACTIVITIES.forEach((a) => {
      const st = actStatus(ck, a);
      if (!st || st === 'good') return;
      lines.push(no2(a.id) + '. ' + a.name + ': ' + STATUS[st].label.toUpperCase());
      a.rules.forEach((r) => {
        const raw = (ck.readings || {})[r.id];
        if (raw) lines.push('   - ' + r.name + ': ' + raw + (r.unit ? ' ' + r.unit : ''));
      });
      const note = (ck.notes || {})[a.id];
      if (note) lines.push('   Note: ' + note);
      const ph = ((ck.photos || {})[a.id] || []).length;
      if (ph) lines.push('   Photos: ' + ph + ' (in the app)');
    });
    const good = ACTIVITIES.filter((a) => actStatus(ck, a) === 'good').length;
    if (good) lines.push('Good: ' + good + ' activities');
  });
  const mine = actions.filter((x) => x.visitId === visit.id);
  if (mine.length) {
    lines.push('', 'FOLLOW-UP ACTIONS');
    mine.forEach((x) => {
      lines.push(
        '- [' + fcode(x.fieldId) + '] ' + x.text + ' (PIC: ' + (x.pic || '-') +
          ', due ' + showDate(x.due) + ', ' + (x.status === 'done' ? 'DONE' : 'OPEN') + ')'
      );
    });
  }
  const est = fields.filter((f) => f.estateId === estate.id);
  const ca = costAlerts(estateCost(est));
  lines.push('', 'COST & PROFIT');
  lines.push('Estate cost over budget (>' + LIMITS.cost + '%): ' + (ca.length ? ca.join(', ') : 'None'));
  lines.push('Profit vs budget: ' + pctText(profitVar(estate)));
  return lines.join('\n');
}

// =====================================================
// UPLOAD: read estate data from Excel / CSV / pasted text
// One row per field. The app finds the columns by name.
// =====================================================
function norm(s) {
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
function matchColumns(header) {
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
function textToRows(text) {
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
function readRows(rows) {
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
function applyImport(rows, estates, fields, replace) {
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
function templateHeader() {
  const h = ['Region', 'SOU', 'Estate', 'Field', 'Planted', 'Mature ha', 'Yield Act', 'Yield Bgt', 'Yield LY', 'Profit Act', 'Profit Bgt'];
  COSTS.forEach((c) => {
    h.push(c + ' Act');
    h.push(c + ' Bgt');
  });
  return h.join('\t');
}

// ===== REUSABLE: top bar =====
function TopBar({ sub, onBack, alerts, onBell }) {
  return (
    <View style={styles.top}>
      {onBack ? (
        <Pressable style={styles.iconBtn} onPress={onBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={C.ink} />
        </Pressable>
      ) : (
        <View style={styles.logo}>
          <Ionicons name="leaf" size={22} color="#fff" />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.topTitle} numberOfLines={1}>
          ETU <Text style={styles.topTitleB}>Field Visit</Text>
        </Text>
        <T style={styles.topSub} numberOfLines={1}>
          {sub}
        </T>
      </View>
      <Pressable style={styles.iconBtn} onPress={onBell}>
        <Ionicons name="notifications-outline" size={20} color={C.ink} />
        {alerts > 0 && (
          <View style={styles.badge}>
            <T style={styles.badgeText}>{alerts}</T>
          </View>
        )}
      </Pressable>
    </View>
  );
}

// ===== REUSABLE: hero card with plantation =====
function Hero({ eyebrow, title, sub, stats, mini }) {
  return (
    <View style={[styles.hero, mini && styles.heroMini]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={C.sky1} />
            <Stop offset="1" stopColor={C.sky2} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#sky)" />
      </Svg>
      <Scene height={mini ? 84 : 112} />
      <View style={styles.heroTx}>
        <T style={styles.eyebrowGold}>{eyebrow}</T>
        <Text style={[styles.heroTitle, mini && styles.heroTitleMini]}>
          {title}
        </Text>
        {sub ? <T style={styles.hint}>{sub}</T> : null}
      </View>
      <View style={styles.heroStats}>
        {stats.map((s) => (
          <View key={s.l} style={styles.hstat}>
            <View style={[styles.sic, s.tone && TONE_BG[s.tone]]}>
              <Ionicons
                name={s.ic}
                size={15}
                color={s.tone ? TONE_FG[s.tone] : C.accent}
              />
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text style={[styles.hstatVal, mini && { fontSize: 19 }]}>
                {s.v}
              </Text>
              <T style={styles.hstatLbl} numberOfLines={1}>
                {s.l}
              </T>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const TONE_BG = {
  att: { backgroundColor: '#F5E4DC' },
  good: { backgroundColor: '#E4EEDB' },
  mon: { backgroundColor: '#F5EAD2' },
  rnd: { backgroundColor: '#E2EBF1' },
  gold: { backgroundColor: '#F3E9CF' },
  muted: { backgroundColor: '#EBE7DA' },
};
const TONE_FG = {
  att: '#B4533C',
  good: '#4F7D3C',
  mon: '#A8741F',
  rnd: '#4A7391',
  gold: '#A8812C',
  muted: '#4F564A',
};

// ===== REUSABLE: section card with icon title =====
function Section({ icon, title, right, children, style }) {
  return (
    <View style={[styles.section, style]}>
      {title ? (
        <View style={styles.sectionHead}>
          <View style={styles.hic}>
            <Ionicons name={icon} size={17} color={C.accent} />
          </View>
          <Text style={styles.sectionTitle}>{title}</Text>
          <View style={{ flex: 1 }} />
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

// ===== REUSABLE: status chip with dot =====
function Chip({ tone, label, dot }) {
  return (
    <View style={[styles.chip, TONE_BG[tone || 'muted']]}>
      {dot && (
        <View
          style={[
            styles.chipDot,
            { backgroundColor: tone === 'mon' ? C.amber : TONE_FG[tone] },
          ]}
        />
      )}
      <T style={[styles.chipText, { color: TONE_FG[tone || 'muted'] }]}>
        {label}
      </T>
    </View>
  );
}

// ===== REUSABLE: segmented tabs =====
function Seg({ options, value, onChange }) {
  return (
    <View style={styles.seg}>
      {options.map((o) => {
        const on = value === o;
        return (
          <Pressable
            key={o}
            style={[styles.segBtn, on && styles.segBtnOn]}
            onPress={() => onChange(o)}>
            <T style={[styles.segText, on && styles.segTextOn]}>{o}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

// ===== REUSABLE: labelled input =====
function Field({ label, full, multiline, ...props }) {
  return (
    <View style={full ? styles.fieldFull : styles.field}>
      <T style={styles.label}>{label}</T>
      <TextInput
        style={[styles.input, multiline && styles.inputMulti]}
        placeholderTextColor="#8A8F80"
        multiline={multiline}
        {...props}
      />
    </View>
  );
}

// ===== REUSABLE: big action button =====
function CTA({ label, icon, onPress, color }) {
  return (
    <Pressable
      style={[styles.cta, color && { backgroundColor: color }]}
      onPress={onPress}>
      <Ionicons name={icon} size={20} color="#fff" />
      <Text style={styles.ctaText}>{label}</Text>
    </Pressable>
  );
}

function Empty({ title, text }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <T style={styles.hint}>{text}</T>
    </View>
  );
}

// ===== REUSABLE: Good / Monitor / Action picker =====
function StatusPicker({ value, onChange }) {
  return (
    <View style={styles.seg}>
      {Object.keys(STATUS).map((k) => {
        const on = value === k;
        const st = STATUS[k];
        return (
          <Pressable
            key={k}
            style={[
              styles.stBtn,
              on && { backgroundColor: TONE_FG[st.tone], borderColor: TONE_FG[st.tone] },
            ]}
            onPress={() => onChange(on ? null : k)}>
            <Ionicons name={st.icon} size={15} color={on ? '#fff' : TONE_FG[st.tone]} />
            <T style={[styles.stText, { color: on ? '#fff' : TONE_FG[st.tone] }]}>
              {st.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

// ===== REUSABLE: horizontal bar (chart) =====
function Bar({ label, value, max, color, right, marker }) {
  const w = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const m = marker !== undefined && max > 0 ? Math.min(100, (marker / max) * 100) : null;
  return (
    <View style={{ gap: 3 }}>
      <View style={styles.barHead}>
        <T style={styles.barLabel} numberOfLines={1}>
          {label}
        </T>
        <T style={[styles.barRight, { color: color }]}>{right}</T>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: w + '%', backgroundColor: color }]} />
        {m !== null && <View style={[styles.barMark, { left: m + '%' }]} />}
      </View>
    </View>
  );
}

// ===== REUSABLE: green date box =====
function DateBox({ date }) {
  return (
    <View style={styles.dateBox}>
      <Text style={styles.dateBoxBig}>{date && date.length >= 10 ? Number(date.slice(8)) : '–'}</Text>
      <T style={styles.dateBoxSmall}>{date && date.length >= 10 ? MONTHS[Number(date.slice(5, 7)) - 1] : 'no date'}</T>
    </View>
  );
}

// =====================================================
// MAIN APP
// =====================================================
export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    PublicSans_400Regular,
    PublicSans_600SemiBold,
    PublicSans_700Bold,
  });
  const [estates, setEstates] = useSavedState('v3-estates', []);
  const [fields, setFields] = useSavedState('v3-fields', []);
  const [visits, setVisits] = useSavedState('v3-visits', []);
  const [actions, setActions] = useSavedState('v3-actions', []);
  const [settings, setSettings] = useSavedState('v5-settings', {});
  const [sel, setSel] = useSavedState('v6-lookup', {});
  const [screen, setScreen] = useState({ name: 'home' });

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  // Use the limits from Settings for all triggers
  applySettings(settings);

  const goHome = () => setScreen({ name: 'home' });
  const openEstate = (id, tab) =>
    setScreen({ name: 'estate', id: id, tab: tab || 'Fields' });
  const openField = (id, tab) =>
    setScreen({ name: 'field', id: id, tab: tab || 'Profile' });

  const save = (list, setList) => (item) =>
    setList(list.map((x) => (x.id === item.id ? item : x)));
  const saveEstate = save(estates, setEstates);
  const saveField = save(fields, setFields);
  const saveVisit = save(visits, setVisits);
  const saveAction = save(actions, setActions);
  const addAction = (a) => setActions([a, ...actions]);
  const deleteAction = (id) => setActions(actions.filter((x) => x.id !== id));

  const openCount = actions.filter((a) => a.status !== 'done').length;

  // Start a visit (optionally with fields already ticked)
  const newVisit = (estateId, fieldIds) => {
    const v = { id: newId(), estateId: estateId, date: today(), fieldIds: fieldIds || [], checks: {} };
    setVisits([v, ...visits]);
    setScreen({ name: 'visit', id: v.id });
  };
  const openLookup = () => setScreen({ name: 'lookup' });
  const common = {
    estates, fields, visits, actions,
    onSaveAction: saveAction,
    onDeleteAction: deleteAction,
  };

  let body = null;
  let back = null;
  let sub = 'Fields · Triggers · Follow-up · Cost';

  if (screen.name === 'estate') {
    const e = estates.find((x) => x.id === screen.id);
    sub = e.name;
    back = goHome;
    body = (
      <EstateScreen
        {...common}
        estate={e}
        tab={screen.tab}
        setTab={(t) => setScreen({ ...screen, tab: t })}
        onChange={saveEstate}
        onOpenField={(id) => openField(id)}
        onAddField={(f) => setFields([...fields, f])}
        onOpenVisit={(id) => setScreen({ name: 'visit', id: id })}
        onNewVisit={() => newVisit(e.id, [])}
        onDelete={() => {
          setEstates(estates.filter((x) => x.id !== e.id));
          setFields(fields.filter((f) => f.estateId !== e.id));
          setVisits(visits.filter((v) => v.estateId !== e.id));
          setActions(actions.filter((a) => a.estateId !== e.id));
          goHome();
        }}
      />
    );
  } else if (screen.name === 'field') {
    const f = fields.find((x) => x.id === screen.id);
    const e = estates.find((x) => x.id === f.estateId);
    sub = e.name + ' · Field ' + f.code;
    back = () => openEstate(e.id, 'Fields');
    body = (
      <FieldScreen
        {...common}
        field={f}
        estate={e}
        tab={screen.tab}
        setTab={(t) => setScreen({ ...screen, tab: t })}
        onChange={saveField}
        onDelete={() => {
          setFields(fields.filter((x) => x.id !== f.id));
          setActions(actions.filter((a) => a.fieldId !== f.id));
          openEstate(e.id, 'Fields');
        }}
      />
    );
  } else if (screen.name === 'visit') {
    const v = visits.find((x) => x.id === screen.id);
    const e = estates.find((x) => x.id === v.estateId);
    sub = e.name + ' · ' + showDate(v.date);
    back = () => openEstate(e.id, 'Visits');
    body = (
      <VisitScreen
        {...common}
        visit={v}
        estate={e}
        estateFields={fields.filter((f) => f.estateId === e.id)}
        onChange={saveVisit}
        onAddAction={addAction}
        onAddField={(f) => setFields([...fields, f])}
        onDelete={() => {
          setVisits(visits.filter((x) => x.id !== v.id));
          setActions(actions.filter((a) => a.visitId !== v.id));
          openEstate(e.id, 'Visits');
        }}
      />
    );
  } else if (screen.name === 'lookup') {
    sub = 'Field lookup';
    back = goHome;
    body = (
      <LookupScreen
        {...common}
        sel={sel}
        setSel={setSel}
        onNewVisit={newVisit}
        onOpenField={openField}
        onOpenVisit={(id) => setScreen({ name: 'visit', id: id })}
      />
    );
  } else if (screen.name === 'settings') {
    sub = 'Trigger settings';
    back = goHome;
    body = (
      <SettingsScreen
        settings={settings}
        setSettings={setSettings}
        counts={{ estates: estates.length, fields: fields.length, visits: visits.length, actions: actions.length }}
        onClearAll={() => {
          setEstates([]);
          setFields([]);
          setVisits([]);
          setActions([]);
          setSel({});
          goHome();
        }}
      />
    );
  } else if (screen.name === 'upload') {
    sub = 'Upload estate data';
    back = goHome;
    body = (
      <UploadScreen
        estates={estates}
        fields={fields}
        onImport={(es, fs, items) => {
          // drop visits / follow-ups of removed estates and fields
          const eIds = es.map((e) => e.id);
          const fIds = fs.map((f) => f.id);
          const nv = (items && items.visits) || [];
          const na = (items && items.actions) || [];
          const newV = nv.map((v) => v.id);
          const newA = na.map((a) => a.id);
          setEstates(es);
          setFields(fs);
          setVisits(
            nv.concat(
              visits
                .filter((v) => eIds.includes(v.estateId) && !newV.includes(v.id))
                .map((v) => ({ ...v, fieldIds: (v.fieldIds || []).filter((id) => fIds.includes(id)) }))
            )
          );
          setActions(
            na.concat(
              actions.filter(
                (a) => eIds.includes(a.estateId) && (!a.fieldId || fIds.includes(a.fieldId)) && !newA.includes(a.id)
              )
            )
          );
        }}
        onDone={goHome}
      />
    );
  } else {
    body = (
      <HomeScreen
        {...common}
        onOpen={openEstate}
        onOpenField={openField}
        onUpload={() => setScreen({ name: 'upload' })}
        onSettings={() => setScreen({ name: 'settings' })}
        sel={sel}
        onPick={(s) => {
          setSel(s);
          openLookup();
        }}
        onAdd={(name) =>
          setEstates([...estates, { id: newId(), name: name, profitAct: '', profitBgt: '' }])
        }
        onExample={() => {
          const ex = exampleData();
          setEstates(ex.estates);
          setFields(ex.fields);
          setVisits(ex.visits);
          setActions(ex.actions);
        }}
      />
    );
  }

  return (
    <View style={styles.app}>
      <StatusBar barStyle="dark-content" backgroundColor={C.skyTop} />
      <TopBar sub={sub} onBack={back} alerts={openCount} onBell={goHome} />
      <View style={{ flex: 1 }}>{body}</View>
    </View>
  );
}

// =====================================================
// HOME: action required, estates, profit chart
// =====================================================
function HomeScreen(p) {
  const { estates, fields, visits, actions } = p;
  const [name, setName] = useState('');
  const [showAll, setShowAll] = useState(false);
  const open = actions.filter((a) => a.status !== 'done');
  const overdue = open.filter(isOverdue);
  const fcode = (id) => (id ? (fields.find((f) => f.id === id) || {}).code || '?' : 'Estate');

  const items = [];
  overdue.forEach((a) => {
    const e = estates.find((x) => x.id === a.estateId);
    if (e) items.push({ key: a.id, go: () => p.onOpen(e.id, 'Actions'), tone: 'att', icon: 'time', text: e.name + ' ' + fcode(a.fieldId) + ': ' + a.text, sub: 'Overdue since ' + showDate(a.due) + ' · PIC ' + (a.pic || '-') });
  });
  estates.forEach((e) => {
    const v = latestVisit(visits, e.id);
    if (v) {
      findings(v)
        .filter((x) => x.st === 'action')
        .forEach((x) => {
          items.push({ key: v.id + x.fieldId + x.act.id, go: () => p.onOpenField(x.fieldId, 'History'), tone: 'att', icon: x.act.icon, text: e.name + ' ' + fcode(x.fieldId) + ': ' + x.act.name, sub: x.note || 'Visit ' + showDate(v.date) });
        });
    }
    fields
      .filter((f) => f.estateId === e.id)
      .forEach((f) => {
        const ys = yieldStatus(f);
        if (ys === 'action' || ys === 'monitor') {
          items.push({ key: f.id + 'y', go: () => p.onOpenField(f.id, 'Profile'), tone: ys === 'action' ? 'att' : 'mon', icon: 'trending-down', text: e.name + ' ' + f.code + ': yield below budget', sub: f.ypAct + ' vs ' + f.ypBgt + ' mt/ha (' + pctText(yieldVar(f)) + ')' });
        }
        const ca = costAlerts(f);
        if (ca.length) {
          items.push({ key: f.id + 'c', go: () => p.onOpenField(f.id, 'Cost'), tone: 'att', icon: 'cash', text: e.name + ' ' + f.code + ': ' + ca.length + ' cost over budget', sub: ca.slice(0, 3).join(', ') + (ca.length > 3 ? '…' : '') });
        }
      });
    const pv = profitVar(e);
    if (pv !== null && pv < 0) {
      items.push({ key: e.id + 'p', go: () => p.onOpen(e.id, 'Profit'), tone: 'mon', icon: 'trending-down', text: e.name + ': profit below budget', sub: pctText(pv) + ' vs budget' });
    }
  });
  const shown = showAll ? items : items.slice(0, 8);

  const withProfit = estates.filter((e) => num(e.profitAct) !== null);
  const maxP = withProfit.reduce(
    (m, e) => Math.max(m, num(e.profitAct) || 0, num(e.profitBgt) || 0),
    1
  );

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Hero
        eyebrow="Estate field visits"
        title={items.length ? items.length + ' items need attention' : 'All in order'}
        sub={fields.length + ' fields in ' + estates.length + ' estates'}
        stats={[
          { ic: 'grid', v: String(fields.length), l: 'Fields' },
          { ic: 'flag', v: String(open.length), l: 'Follow-ups', tone: open.length ? 'mon' : 'good' },
          { ic: 'time', v: String(overdue.length), l: 'Overdue', tone: overdue.length ? 'att' : 'good' },
        ]}
      />

      <Section icon="search" title="Lookup" right={<T style={styles.hint}>Region · SOU · Estate · Field</T>}>
        {estates.length === 0 ? (
          <T style={styles.hint}>Upload estate data first.</T>
        ) : (
          <Filters {...p} sel={p.sel} onChange={p.onPick} />
        )}
      </Section>

      {items.length > 0 && (
        <View style={styles.exc}>
          <View style={styles.excHead}>
            <View style={[styles.hic, { backgroundColor: C.att }]}>
              <Ionicons name="alert" size={17} color="#fff" />
            </View>
            <Text style={styles.excTitle}>ACTION REQUIRED</Text>
            <View style={{ flex: 1 }} />
            <View style={styles.excCount}>
              <T style={styles.excCountText}>{items.length}</T>
            </View>
          </View>
          {shown.map((it) => (
            <Pressable key={it.key} style={styles.exRow} onPress={it.go}>
              <View style={[styles.exIc, TONE_BG[it.tone]]}>
                <Ionicons name={it.icon} size={19} color={TONE_FG[it.tone]} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T style={styles.exTitle} numberOfLines={1}>{it.text}</T>
                <T style={styles.meta} numberOfLines={1}>{it.sub}</T>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.muted} />
            </Pressable>
          ))}
          {items.length > 8 && (
            <Pressable style={styles.exRow} onPress={() => setShowAll(!showAll)}>
              <T style={styles.link}>{showAll ? 'Show less' : 'Show all ' + items.length}</T>
            </Pressable>
          )}
        </View>
      )}

      <Section icon="business-outline" title="Estates">
        {estates.length === 0 && (
          <>
            <T style={styles.hint}>Add an estate below, or load example data to try the app.</T>
            <CTA label="LOAD EXAMPLE DATA" icon="download-outline" color={C.rnd} onPress={p.onExample} />
          </>
        )}
        <View style={styles.row2}>
          <View style={{ flex: 1.4 }}>
            <CTA label="UPLOAD DATA" icon="cloud-upload" onPress={p.onUpload} />
          </View>
          <View style={{ flex: 1 }}>
            <CTA label="SETTINGS" icon="options" color={C.muted} onPress={p.onSettings} />
          </View>
        </View>
        {estates.map((e) => {
          const ef = fields.filter((f) => f.estateId === e.id);
          const ey = estateYield(ef);
          const oa = actions.filter((a) => a.estateId === e.id && a.status !== 'done').length;
          const v = latestVisit(visits, e.id);
          const red = v ? countIn(findings(v), 'action') : 0;
          return (
            <Pressable key={e.id} style={styles.rcard} onPress={() => p.onOpen(e.id)}>
              <View style={styles.estBox}>
                <Text style={styles.estBoxText}>{e.name.slice(0, 2).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rcardTitle}>{e.name}</Text>
                <T style={styles.meta}>
                  {[e.region, e.sou].filter(Boolean).join(' · ')}
                  {e.region || e.sou ? ' · ' : ''}
                  {ef.length} fields{ey ? ' · yield ' + ey.act.toFixed(1) + ' mt/ha (' + pctText(ey.v) + ')' : ''}
                </T>
                <View style={styles.chips}>
                  {red > 0 && <Chip tone="att" dot label={red + ' action'} />}
                  {oa > 0 && <Chip tone="rnd" label={oa + ' follow-up'} />}
                  {v && <Chip tone="muted" label={'Visit ' + showDate(v.date)} />}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.muted} />
            </Pressable>
          );
        })}
        <View style={styles.row2}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="New estate name"
            placeholderTextColor="#8A8F80"
            value={name}
            onChangeText={setName}
          />
          <Pressable
            style={styles.addBtn}
            onPress={() => {
              if (name.trim()) p.onAdd(name.trim());
              setName('');
            }}>
            <Ionicons name="add" size={24} color="#fff" />
          </Pressable>
        </View>
      </Section>

      {withProfit.length > 0 && (
        <Section icon="bar-chart-outline" title="Profit by estate" right={<T style={styles.hint}>RM'000 YTD</T>}>
          {withProfit.map((e) => {
            const pv = profitVar(e);
            return (
              <Bar
                key={e.id}
                label={e.name + '  ' + money(e.profitAct)}
                value={num(e.profitAct) || 0}
                max={maxP}
                marker={num(e.profitBgt) === null ? undefined : num(e.profitBgt)}
                color={pv !== null && pv < 0 ? C.att : C.good}
                right={pctText(pv)}
              />
            );
          })}
          <T style={styles.hint}>Bar = actual profit. Black line = budget.</T>
        </Section>
      )}
    </ScrollView>
  );
}

// =====================================================
// ESTATE: fields, visits, follow-ups, cost, profit
// =====================================================
function EstateScreen(p) {
  const { estate, fields, visits, actions, tab, setTab, onChange } = p;
  const [confirm, setConfirm] = useState(false);
  const [nf, setNf] = useState({ code: '', year: '', ha: '' });
  const ef = fields.filter((f) => f.estateId === estate.id);
  const ev = visits
    .filter((v) => v.estateId === estate.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const ea = actions.filter((a) => a.estateId === estate.id);
  const open = ea.filter((a) => a.status !== 'done');
  const pv = profitVar(estate);
  const ey = estateYield(ef);
  const ec = estateCost(ef);
  const fcode = (id) => (id ? (fields.find((f) => f.id === id) || {}).code || '?' : 'Estate');

  const addField = () => {
    const code = nf.code.trim().toUpperCase();
    if (!code) return;
    p.onAddField({
      id: newId(), estateId: estate.id, code: code, year: nf.year, ha: nf.ha,
      ypAct: '', ypBgt: '', ypLy: '', costs: {},
    });
    setNf({ code: '', year: '', ha: '' });
  };

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Hero
        mini
        eyebrow="Estate"
        title={estate.name}
        sub={[estate.region, estate.sou].filter(Boolean).concat([ef.length + ' fields', ey ? ey.ha.toFixed(1) + ' mature ha' : 'no area yet']).join(' · ')}
        stats={[
          { ic: 'leaf', v: ey ? ey.act.toFixed(1) : '-', l: 'Yield mt/ha', tone: ey && ey.v < LIMITS.yieldAmber ? 'att' : 'good' },
          { ic: 'flag', v: String(open.length), l: 'Follow-ups', tone: open.length ? 'mon' : 'good' },
          { ic: 'trending-up', v: pctText(pv), l: 'Profit var', tone: pv !== null && pv < 0 ? 'att' : 'good' },
        ]}
      />

      <Seg options={['Fields', 'Visits', 'Actions', 'Cost', 'Profit']} value={tab} onChange={setTab} />

      {tab === 'Fields' && (
        <Section icon="grid-outline" title="Fields" right={<T style={styles.hint}>Yield YTD mt/ha</T>}>
          {ef.length === 0 && <Empty title="No fields yet" text="Add your fields (blocks) below." />}
          {ef.map((f) => {
            const ys = yieldStatus(f);
            const lv = latestFieldVisit(visits, f.id);
            const red = lv ? ACTIVITIES.filter((a) => actStatus(checkOf(lv, f.id), a) === 'action').length : 0;
            const amber = lv ? ACTIVITIES.filter((a) => actStatus(checkOf(lv, f.id), a) === 'monitor').length : 0;
            const ca = costAlerts(f).length;
            const fo = ea.filter((a) => a.fieldId === f.id && a.status !== 'done').length;
            return (
              <Pressable key={f.id} style={styles.rcard} onPress={() => p.onOpenField(f.id)}>
                <View style={[styles.fieldBox, ys && TONE_BG[STATUS[ys].tone]]}>
                  <Text style={[styles.fieldBoxText, ys && { color: TONE_FG[STATUS[ys].tone] }]} numberOfLines={1}>
                    {f.code}
                  </Text>
                  <T style={styles.fieldBoxSub}>{f.year ? 'PY ' + f.year : ''}</T>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rcardTitle}>
                    {f.ypAct || '-'} <T style={styles.meta}>vs {f.ypBgt || '-'} bgt · {f.ha || '-'} ha</T>
                  </Text>
                  <View style={styles.chips}>
                    {ys && <Chip tone={STATUS[ys].tone} dot label={'Yield ' + pctText(yieldVar(f))} />}
                    {red > 0 && <Chip tone="att" label={red + ' action'} />}
                    {amber > 0 && <Chip tone="mon" label={amber + ' monitor'} />}
                    {ca > 0 && <Chip tone="att" label={ca + ' cost over'} />}
                    {fo > 0 && <Chip tone="rnd" label={fo + ' follow-up'} />}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.muted} />
              </Pressable>
            );
          })}
          <View style={styles.fupBox}>
            <T style={styles.kvLabel}>Add field</T>
            <View style={styles.row2}>
              <Field label="Field code" placeholder="e.g. 3C" autoCapitalize="characters" value={nf.code} onChangeText={(t) => setNf({ ...nf, code: t })} />
              <Field label="Planted" placeholder="2008" keyboardType="numeric" value={nf.year} onChangeText={(t) => setNf({ ...nf, year: t })} />
              <Field label="Mature ha" placeholder="0.0" keyboardType="numeric" value={nf.ha} onChangeText={(t) => setNf({ ...nf, ha: t })} />
            </View>
            <CTA label="ADD FIELD" icon="add" onPress={addField} />
          </View>
        </Section>
      )}

      {tab === 'Visits' && (
        <Section icon="calendar-outline" title="Site visits">
          <CTA label="NEW SITE VISIT" icon="add" onPress={p.onNewVisit} />
          {ev.length === 0 && <Empty title="No visits yet" text="Start your first site visit." />}
          {ev.map((v) => {
            const all = findings(v);
            const red = countIn(all, 'action');
            const amber = countIn(all, 'monitor');
            return (
              <Pressable key={v.id} style={styles.rcard} onPress={() => p.onOpenVisit(v.id)}>
                <DateBox date={v.date} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rcardTitle} numberOfLines={1}>
                    {v.title ? v.title + ' · ' : ''}{(v.fieldIds || []).length > 6 ? v.fieldIds.length + ' fields' : 'Fields ' + ((v.fieldIds || []).map(fcode).join(', ') || '-')}
                  </Text>
                  <View style={styles.chips}>
                    {red > 0 && <Chip tone="att" dot label={red + ' action'} />}
                    {amber > 0 && <Chip tone="mon" dot label={amber + ' monitor'} />}
                    {all.length > 0 && red + amber === 0 && <Chip tone="good" dot label="All good" />}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.muted} />
              </Pressable>
            );
          })}
        </Section>
      )}

      {tab === 'Actions' && (
        <Section icon="flag-outline" title="Follow-up actions" right={<T style={styles.hint}>{open.length} open</T>}>
          {ea.length === 0 && <Empty title="No follow-ups" text="Add them from a site visit (Monitor or Action)." />}
          {sortActions(ea).map((a) => (
            <ActionRow key={a.id} a={a} field={fcode(a.fieldId)} onSave={p.onSaveAction} onDelete={p.onDeleteAction} showAct />
          ))}
        </Section>
      )}

      {tab === 'Cost' && (
        <>
          <T style={styles.hint}>
            Estate cost = field costs weighted by mature ha. Enter costs in each field (Fields tab).
          </T>
          <CostTable obj={ec} readOnly />
          <CostChart obj={ec} />
          <Section icon="grid-outline" title="Cost over budget by field">
            {ef.map((f) => (
              <Pressable key={f.id} style={styles.readRow} onPress={() => p.onOpenField(f.id, 'Cost')}>
                <T style={[styles.bold, { width: 60 }]}>{f.code}</T>
                <View style={[styles.chips, { flex: 1, marginTop: 0 }]}>
                  {costAlerts(f).length ? (
                    costAlerts(f).map((c) => <Chip key={c} tone="att" label={c} />)
                  ) : (
                    <Chip tone="good" dot label="Within budget" />
                  )}
                </View>
              </Pressable>
            ))}
          </Section>
        </>
      )}

      {tab === 'Profit' && (
        <Section icon="trending-up" title="Estate profit" right={<T style={styles.hint}>RM'000 YTD</T>}>
          <View style={styles.row2}>
            <Field label="Region" placeholder="e.g. Pahang" value={estate.region || ''} onChangeText={(t) => onChange({ ...estate, region: t })} />
            <Field label="SOU" placeholder="e.g. SOU 1" value={estate.sou || ''} onChangeText={(t) => onChange({ ...estate, sou: t })} />
          </View>
          <View style={styles.row2}>
            <Field label="Actual" keyboardType="numeric" placeholder="0" value={estate.profitAct || ''} onChangeText={(t) => onChange({ ...estate, profitAct: t })} />
            <Field label="Budget" keyboardType="numeric" placeholder="0" value={estate.profitBgt || ''} onChangeText={(t) => onChange({ ...estate, profitBgt: t })} />
          </View>
          <View style={[styles.profitBox, pv !== null && pv < 0 ? TONE_BG.att : TONE_BG.good]}>
            <T style={styles.meta}>Variance vs budget</T>
            <Text style={[styles.profitBig, { color: pv !== null && pv < 0 ? C.att : C.good }]}>{pctText(pv)}</Text>
            <T style={styles.meta}>
              {num(estate.profitAct) !== null && num(estate.profitBgt) !== null
                ? 'RM ' + money(num(estate.profitAct) - num(estate.profitBgt)) + "'000 vs budget"
                : 'Enter actual and budget'}
            </T>
            {ey && num(estate.profitAct) !== null && (
              <T style={styles.meta}>
                Profit per mature ha: RM {money((num(estate.profitAct) * 1000) / ey.ha)}
              </T>
            )}
          </View>
        </Section>
      )}

      <DeleteBox label={'Delete ' + estate.name + ' with all fields, visits and actions?'} button="Delete estate" confirm={confirm} setConfirm={setConfirm} onDelete={p.onDelete} />
    </ScrollView>
  );
}

function sortActions(list) {
  return [...list].sort((a, b) => {
    if ((a.status === 'done') !== (b.status === 'done')) return a.status === 'done' ? 1 : -1;
    return (a.due || '').localeCompare(b.due || '');
  });
}

function DeleteBox({ label, button, confirm, setConfirm, onDelete }) {
  if (confirm) {
    return (
      <View style={styles.confirm}>
        <T style={styles.confirmText}>{label}</T>
        <View style={styles.row2}>
          <Pressable style={styles.btnGhost} onPress={() => setConfirm(false)}>
            <T style={styles.bold}>Keep</T>
          </Pressable>
          <Pressable style={styles.btnDanger} onPress={onDelete}>
            <T style={[styles.bold, { color: '#fff' }]}>Delete</T>
          </Pressable>
        </View>
      </View>
    );
  }
  return (
    <Pressable onPress={() => setConfirm(true)} style={styles.delRow}>
      <Ionicons name="trash-outline" size={16} color={C.att} />
      <T style={{ color: C.att }}>{button}</T>
    </Pressable>
  );
}

// =====================================================
// FIELD: profile & yield, 12 costs, history
// =====================================================
function FieldScreen(p) {
  const { field, estate, visits, actions, tab, setTab, onChange } = p;
  const [confirm, setConfirm] = useState(false);
  const set = (k, v) => onChange({ ...field, [k]: v });
  const yv = yieldVar(field);
  const ys = yieldStatus(field);
  const fa = actions.filter((a) => a.fieldId === field.id);
  const open = fa.filter((a) => a.status !== 'done');

  // Every finding for this field, newest visit first
  const hist = [];
  visits
    .filter((v) => (v.fieldIds || []).includes(field.id))
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach((v) => {
      const ck = checkOf(v, field.id);
      ACTIVITIES.forEach((act) => {
        const st = actStatus(ck, act);
        if (st && st !== 'good') {
          hist.push({ key: v.id + act.id, date: v.date, act: act, st: st, note: (ck.notes || {})[act.id] || '', photos: (ck.photos || {})[act.id] || [] });
        }
      });
    });
  const maxY = Math.max(num(field.ypAct) || 0, num(field.ypBgt) || 0, num(field.ypLy) || 0, 1);

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Hero
        mini
        eyebrow={estate.name + ' · Field'}
        title={'Field ' + field.code}
        sub={(field.year ? 'Planted ' + field.year + ' · ' : '') + (field.ha || '-') + ' mature ha'}
        stats={[
          { ic: 'leaf', v: field.ypAct || '-', l: 'Yield mt/ha', tone: ys ? STATUS[ys].tone : null },
          { ic: 'cash', v: String(costAlerts(field).length), l: 'Cost over', tone: costAlerts(field).length ? 'att' : 'good' },
          { ic: 'flag', v: String(open.length), l: 'Follow-ups', tone: open.length ? 'mon' : 'good' },
        ]}
      />

      <Seg options={['Profile', 'Cost', 'History']} value={tab} onChange={setTab} />

      {tab === 'Profile' && (
        <>
          <Section icon="information-circle-outline" title="Field profile">
            <View style={styles.row2}>
              <Field label="Field code" autoCapitalize="characters" value={field.code} onChangeText={(t) => set('code', t.toUpperCase())} />
              <Field label="Planted (year)" keyboardType="numeric" value={field.year || ''} onChangeText={(t) => set('year', t)} />
              <Field label="Mature ha" keyboardType="numeric" value={field.ha || ''} onChangeText={(t) => set('ha', t)} />
            </View>
          </Section>
          <Section icon="leaf-outline" title="Yield YTD" right={<T style={styles.hint}>mt/ha</T>}>
            <View style={styles.row2}>
              <Field label="Actual" keyboardType="numeric" placeholder="0.0" value={field.ypAct || ''} onChangeText={(t) => set('ypAct', t)} />
              <Field label="Budget" keyboardType="numeric" placeholder="0.0" value={field.ypBgt || ''} onChangeText={(t) => set('ypBgt', t)} />
              <Field label="Last year" keyboardType="numeric" placeholder="0.0" value={field.ypLy || ''} onChangeText={(t) => set('ypLy', t)} />
            </View>
            <View style={[styles.profitBox, ys ? TONE_BG[STATUS[ys].tone] : TONE_BG.muted]}>
              <T style={styles.meta}>Yield vs budget</T>
              <Text style={[styles.profitBig, { color: ys ? TONE_FG[STATUS[ys].tone] : C.muted }]}>{pctText(yv)}</Text>
              <T style={styles.meta}>
                {ys ? STATUS[ys].label + ' · ' : ''}Action below {LIMITS.yieldRed}%, Monitor below {LIMITS.yieldAmber}%
              </T>
              {num(field.ypLy) !== null && (
                <T style={styles.meta}>vs last year: {pctText(variance(field.ypAct, field.ypLy))}</T>
              )}
            </View>
            {num(field.ypAct) !== null && (
              <>
                <Bar label="Actual" value={num(field.ypAct)} max={maxY} color={ys ? TONE_FG[STATUS[ys].tone] : C.good} right={field.ypAct} />
                <Bar label="Budget" value={num(field.ypBgt) || 0} max={maxY} color={C.muted} right={field.ypBgt || '-'} />
                <Bar label="Last year" value={num(field.ypLy) || 0} max={maxY} color={C.rnd} right={field.ypLy || '-'} />
              </>
            )}
          </Section>
        </>
      )}

      {tab === 'Cost' && (
        <>
          <CostTable obj={field} onChange={onChange} />
          <CostChart obj={field} />
        </>
      )}

      {tab === 'History' && (
        <>
          <Section icon="flag-outline" title="Follow-up actions" right={<T style={styles.hint}>{open.length} open</T>}>
            {fa.length === 0 ? (
              <T style={styles.hint}>No follow-ups for this field.</T>
            ) : (
              sortActions(fa).map((a) => (
                <ActionRow key={a.id} a={a} onSave={p.onSaveAction} onDelete={p.onDeleteAction} showAct />
              ))
            )}
          </Section>
          <Section icon="time-outline" title="Findings from visits">
            {hist.length === 0 ? (
              <T style={styles.hint}>No Monitor or Action findings yet.</T>
            ) : (
              hist.map((h) => (
                <View key={h.key} style={styles.rcard}>
                  <DateBox date={h.date} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T style={styles.bold}>{no2(h.act.id)}. {h.act.name}</T>
                    {h.note ? <T style={styles.meta}>{h.note}</T> : null}
                    <View style={styles.chips}>
                      <Chip tone={STATUS[h.st].tone} dot label={STATUS[h.st].label} />
                    </View>
                    {h.photos.length > 0 && <PhotoStrip photos={h.photos} readOnly />}
                  </View>
                </View>
              ))
            )}
          </Section>
        </>
      )}

      <DeleteBox label={'Delete field ' + field.code + ' and its follow-ups?'} button="Delete field" confirm={confirm} setConfirm={setConfirm} onDelete={p.onDelete} />
    </ScrollView>
  );
}

// ===== 12 cost elements table (field = edit, estate = read only) =====
function CostTable({ obj, onChange, readOnly }) {
  const setCost = (i, k, v) => {
    const costs = { ...(obj.costs || {}) };
    costs[i] = { ...(costs[i] || {}), [k]: v };
    onChange({ ...obj, costs: costs });
  };
  let ta = 0;
  let tb = 0;
  COSTS.forEach((n, i) => {
    ta += num(costOf(obj, i).act) || 0;
    tb += num(costOf(obj, i).bgt) || 0;
  });
  return (
    <Section icon="cash-outline" title="12 cost elements" right={<T style={styles.hint}>RM/ha YTD</T>}>
      <T style={styles.hint}>Red = more than {LIMITS.cost}% above budget.</T>
      <View style={styles.costRow}>
        <T style={[styles.costName, styles.kvLabel]}>Element</T>
        <T style={[styles.costCell, styles.kvLabel]}>Actual</T>
        <T style={[styles.costCell, styles.kvLabel]}>Budget</T>
        <T style={[styles.costVar, styles.kvLabel]}>Var</T>
      </View>
      {COSTS.map((name, i) => {
        const c = costOf(obj, i);
        const v = variance(c.act, c.bgt);
        const over = v !== null && v > LIMITS.cost;
        return (
          <View key={name} style={[styles.costRow, over && { backgroundColor: C.attBg }]}>
            <T style={styles.costName} numberOfLines={2}>{name}</T>
            {readOnly ? (
              <>
                <T style={[styles.costCell, styles.costRo]}>{money(c.act)}</T>
                <T style={[styles.costCell, styles.costRo]}>{money(c.bgt)}</T>
              </>
            ) : (
              <>
                <TextInput style={[styles.input, styles.costCell, styles.costIn]} keyboardType="numeric" placeholder="0" placeholderTextColor="#8A8F80" value={c.act || ''} onChangeText={(t) => setCost(i, 'act', t)} />
                <TextInput style={[styles.input, styles.costCell, styles.costIn]} keyboardType="numeric" placeholder="0" placeholderTextColor="#8A8F80" value={c.bgt || ''} onChangeText={(t) => setCost(i, 'bgt', t)} />
              </>
            )}
            <T style={[styles.costVar, { color: over ? C.att : v !== null && v <= 0 ? C.good : C.muted }]}>
              {pctText(v)}
            </T>
          </View>
        );
      })}
      <View style={[styles.costRow, styles.totalRow]}>
        <T style={[styles.costName, styles.bold]}>TOTAL</T>
        <T style={[styles.costCell, styles.bold]}>{money(ta)}</T>
        <T style={[styles.costCell, styles.bold]}>{money(tb)}</T>
        <T style={[styles.costVar, styles.bold]}>{pctText(variance(ta, tb))}</T>
      </View>
    </Section>
  );
}

function CostChart({ obj }) {
  let max = 1;
  COSTS.forEach((n, i) => {
    max = Math.max(max, num(costOf(obj, i).act) || 0, num(costOf(obj, i).bgt) || 0);
  });
  const rows = COSTS.map((name, i) => ({ name: name, c: costOf(obj, i) })).filter(
    (r) => num(r.c.act) !== null
  );
  if (rows.length === 0) return null;
  return (
    <Section icon="bar-chart-outline" title="Actual vs budget">
      {rows.map((r) => {
        const v = variance(r.c.act, r.c.bgt);
        return (
          <Bar
            key={r.name}
            label={r.name}
            value={num(r.c.act)}
            max={max}
            marker={num(r.c.bgt) === null ? undefined : num(r.c.bgt)}
            color={v !== null && v > LIMITS.cost ? C.att : v !== null && v > 0 ? C.mon : C.good}
            right={pctText(v)}
          />
        );
      })}
      <T style={styles.hint}>Bar = actual. Black line = budget. Red = over the limit.</T>
    </Section>
  );
}

// ===== One follow-up action (tick to close) =====
function ActionRow({ a, field, onSave, onDelete, showAct }) {
  const done = a.status === 'done';
  const late = isOverdue(a);
  return (
    <View style={[styles.rcard, late && { borderColor: C.att }]}>
      <Pressable
        hitSlop={8}
        onPress={() => onSave({ ...a, status: done ? 'open' : 'done', doneAt: done ? null : today() })}>
        <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={done ? C.good : late ? C.att : C.muted} />
      </Pressable>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T style={[styles.bold, done && styles.strike]}>
          {field ? '[' + field + '] ' : ''}
          {a.text}
        </T>
        <T style={styles.meta} numberOfLines={1}>
          {(showAct ? no2(a.actId) + '. ' + actOf(a.actId).name + ' · ' : '') + 'PIC ' + (a.pic || '-')}
        </T>
        <View style={styles.chips}>
          {done ? (
            <Chip tone="good" dot label={'Done ' + showDate(a.doneAt)} />
          ) : late ? (
            <Chip tone="att" dot label={'Overdue · due ' + showDate(a.due)} />
          ) : (
            <Chip tone="mon" dot label={'Open · due ' + showDate(a.due)} />
          )}
        </View>
      </View>
      {onDelete && (
        <Pressable onPress={() => onDelete(a.id)} hitSlop={10}>
          <Ionicons name="trash-outline" size={18} color={C.att} />
        </Pressable>
      )}
    </View>
  );
}

// =====================================================
// SITE VISIT: pick fields, then check 10 activities per field
// =====================================================
function VisitScreen(p) {
  const { visit, estate, estateFields, actions, fields, onChange } = p;
  const ids = visit.fieldIds || [];
  const [cur, setCur] = useState(ids[0] || null);
  const [openAct, setOpenAct] = useState(null);
  const [newCode, setNewCode] = useState('');
  const [form, setForm] = useState({ text: '', pic: '', due: addDays(today(), 7) });
  const [msg, setMsg] = useState('');

  const curId = ids.includes(cur) ? cur : ids[0] || null;
  const curField = estateFields.find((f) => f.id === curId);
  const ck = curId ? checkOf(visit, curId) : null;

  const toggleField = (fid) => {
    const on = ids.includes(fid);
    const next = on ? ids.filter((x) => x !== fid) : [...ids, fid];
    onChange({ ...visit, fieldIds: next });
    if (!on) setCur(fid);
  };

  const quickAdd = () => {
    const code = newCode.trim().toUpperCase();
    if (!code) return;
    const f = { id: newId(), estateId: estate.id, code: code, year: '', ha: '', ypAct: '', ypBgt: '', ypLy: '', costs: {} };
    p.onAddField(f);
    onChange({ ...visit, fieldIds: [...ids, f.id] });
    setCur(f.id);
    setNewCode('');
  };

  const setCheck = (patch) => {
    const checks = { ...(visit.checks || {}) };
    checks[curId] = { ...checkOf(visit, curId), ...patch };
    onChange({ ...visit, checks: checks });
  };
  const setReading = (rid, val) => setCheck({ readings: { ...(ck.readings || {}), [rid]: val } });
  const setManual = (aid, st) => {
    const manual = { ...(ck.manual || {}) };
    if (st) manual[aid] = st;
    else delete manual[aid];
    setCheck({ manual: manual });
  };
  const setNote = (aid, t) => setCheck({ notes: { ...(ck.notes || {}), [aid]: t } });
  const setPhotos = (aid, list) => setCheck({ photos: { ...(ck.photos || {}), [aid]: list } });

  const addFollowUp = (act) => {
    const text = form.text.trim() || (ck.notes || {})[act.id] || '';
    if (!text) return;
    p.onAddAction({
      id: newId(), estateId: estate.id, visitId: visit.id, fieldId: curId,
      actId: act.id, text: text, pic: form.pic.trim(), due: form.due,
      status: 'open', createdAt: today(),
    });
    setForm({ text: '', pic: form.pic, due: addDays(today(), 7) });
  };

  const share = async () => {
    try {
      await Share.share({ message: visitReport(visit, estate, fields, actions) });
    } catch (e) {
      setMsg('Sharing works on the phone, not in this preview.');
    }
  };

  const all = findings(visit);
  const fcount = (fid, st) =>
    ACTIVITIES.filter((a) => actStatus(checkOf(visit, fid), a) === st).length;

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Hero
        mini
        eyebrow={(visit.title || 'Site visit') + ' · ' + estate.name}
        title={showDate(visit.date)}
        sub={ids.length + ' fields visited'}
        stats={[
          { ic: 'alert-circle', v: String(countIn(all, 'action')), l: 'Action', tone: 'att' },
          { ic: 'warning', v: String(countIn(all, 'monitor')), l: 'Monitor', tone: 'mon' },
          { ic: 'checkmark-circle', v: String(countIn(all, 'good')), l: 'Good', tone: 'good' },
        ]}
      />

      <Section icon="grid-outline" title="1. Fields visited">
        <View style={styles.row2}>
          <DateField label="Visit date" value={visit.date} onChange={(d) => onChange({ ...visit, date: d })} />
        </View>
        <View style={styles.chips}>
          {estateFields.map((f) => {
            const on = ids.includes(f.id);
            return (
              <Pressable key={f.id} style={[styles.pickChip, on && styles.pickChipOn]} onPress={() => toggleField(f.id)}>
                <Ionicons name={on ? 'checkbox' : 'square-outline'} size={16} color={on ? '#fff' : C.accent} />
                <T style={[styles.pickChipText, on && { color: '#fff' }]}>{f.code}</T>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.row2}>
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="New field code" placeholderTextColor="#8A8F80" autoCapitalize="characters" value={newCode} onChangeText={setNewCode} />
          <Pressable style={styles.addBtn} onPress={quickAdd}>
            <Ionicons name="add" size={24} color="#fff" />
          </Pressable>
        </View>
      </Section>

      {ids.length === 0 ? (
        <Empty title="Pick a field" text="Tick the fields you visited to start checking activities." />
      ) : (
        <>
          <T style={styles.kvLabel}>2. Check activities in field</T>
          <View style={styles.chips}>
            {ids.map((fid) => {
              const f = estateFields.find((x) => x.id === fid) || {};
              const on = fid === curId;
              const red = fcount(fid, 'action');
              return (
                <Pressable key={fid} style={[styles.fieldTab, on && styles.fieldTabOn]} onPress={() => { setCur(fid); setOpenAct(null); }}>
                  <Text style={[styles.fieldTabText, on && { color: '#fff' }]}>{f.code}</Text>
                  {red > 0 && (
                    <View style={styles.tabBadge}>
                      <T style={styles.badgeText}>{red}</T>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {curField && (
            <View style={styles.fieldInfo}>
              <T style={styles.meta}>
                Field {curField.code}
                {curField.ha ? ' · ' + curField.ha + ' ha' : ''}
                {curField.ypAct ? ' · yield ' + curField.ypAct + ' vs ' + (curField.ypBgt || '-') + ' mt/ha' : ''}
              </T>
              {yieldStatus(curField) && (
                <Chip tone={STATUS[yieldStatus(curField)].tone} dot label={'Yield ' + pctText(yieldVar(curField))} />
              )}
            </View>
          )}

          {ACTIVITIES.map((act) => {
            const st = actStatus(ck, act);
            const auto = autoStatus(ck, act);
            const manual = (ck.manual || {})[act.id];
            const isOpen = openAct === act.id;
            const tone = st ? STATUS[st].tone : null;
            const fups = actions.filter((x) => x.visitId === visit.id && x.fieldId === curId && x.actId === act.id);
            return (
              <View key={act.id} style={[styles.actCard, tone && { borderColor: TONE_FG[tone] }]}>
                <Pressable style={styles.actHead} onPress={() => setOpenAct(isOpen ? null : act.id)}>
                  <View style={[styles.actIc, tone ? TONE_BG[tone] : { backgroundColor: C.accentSoft }]}>
                    <Ionicons name={act.icon} size={18} color={tone ? TONE_FG[tone] : C.accent} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T style={styles.bold} numberOfLines={1}>{no2(act.id)}. {act.name}</T>
                    <View style={styles.chips}>
                      {st ? (
                        <Chip tone={tone} dot label={STATUS[st].label + (manual ? '' : ' (auto)')} />
                      ) : (
                        <Chip tone="muted" label="Not checked" />
                      )}
                      {fups.length > 0 && <Chip tone="rnd" label={fups.length + ' follow-up'} />}
                      {((ck.photos || {})[act.id] || []).length > 0 && (
                        <Chip tone="muted" label={((ck.photos || {})[act.id] || []).length + ' photo'} />
                      )}
                    </View>
                  </View>
                  <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={C.muted} />
                </Pressable>

                {isOpen && (
                  <View style={styles.actBody}>
                    <T style={styles.kvLabel}>Readings in field {curField ? curField.code : ''}</T>
                    {act.rules.map((r) => {
                      const raw = (ck.readings || {})[r.id];
                      const res = evaluate(r, raw);
                      return (
                        <View key={r.id} style={styles.readRow}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <T style={styles.ruleName}>{r.name}</T>
                            <T style={styles.meta}>{limitText(r)}</T>
                          </View>
                          {r.op === 'yes' ? (
                            <View style={styles.yesNo}>
                              {['no', 'yes'].map((k) => (
                                <Pressable
                                  key={k}
                                  style={[styles.ynBtn, raw === k && { backgroundColor: k === 'yes' ? C.att : C.good, borderColor: k === 'yes' ? C.att : C.good }]}
                                  onPress={() => setReading(r.id, raw === k ? '' : k)}>
                                  <T style={[styles.ynText, raw === k && { color: '#fff' }]}>{k === 'yes' ? 'Yes' : 'No'}</T>
                                </Pressable>
                              ))}
                            </View>
                          ) : (
                            <TextInput style={[styles.input, styles.readIn]} keyboardType="numeric" placeholder={r.unit} placeholderTextColor="#8A8F80" value={raw || ''} onChangeText={(t) => setReading(r.id, t)} />
                          )}
                          <View style={[styles.resDot, { backgroundColor: res ? TONE_FG[STATUS[res].tone] : C.line }]} />
                        </View>
                      );
                    })}

                    <T style={styles.kvLabel}>Status {auto ? '(auto: ' + STATUS[auto].label + ')' : ''}</T>
                    <StatusPicker value={manual || null} onChange={(k) => setManual(act.id, k)} />

                    {(st === 'monitor' || st === 'action') && (
                      <>
                        <Field label="Finding / note" full multiline placeholder="What you saw, where, why" value={(ck.notes || {})[act.id] || ''} onChangeText={(t) => setNote(act.id, t)} />
                        <T style={styles.kvLabel}>Photos</T>
                        <PhotoStrip photos={(ck.photos || {})[act.id]} onChange={(l) => setPhotos(act.id, l)} />
                        <View style={styles.fupBox}>
                          <T style={styles.kvLabel}>Follow-up actions</T>
                          {fups.map((a) => (
                            <ActionRow key={a.id} a={a} onSave={p.onSaveAction} />
                          ))}
                          <Field label="Action to take" full placeholder="e.g. Dispatch extra crew" value={form.text} onChangeText={(t) => setForm({ ...form, text: t })} />
                          <View style={styles.row2}>
                            <Field label="PIC" placeholder="Name" value={form.pic} onChangeText={(t) => setForm({ ...form, pic: t })} />
                            <DateField label="Due date" value={form.due} onChange={(d) => setForm({ ...form, due: d })} />
                          </View>
                          <CTA label="ADD FOLLOW-UP" icon="flag" color={C.rnd} onPress={() => addFollowUp(act)} />
                        </View>
                      </>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </>
      )}

      <CTA label="SHARE VISIT REPORT (WHATSAPP)" icon="share-social" onPress={share} />
      {msg ? <T style={styles.hint}>{msg}</T> : null}

      <Pressable onPress={p.onDelete} style={styles.delRow}>
        <Ionicons name="trash-outline" size={16} color={C.att} />
        <T style={{ color: C.att }}>Delete this visit</T>
      </Pressable>
    </ScrollView>
  );
}

// =====================================================
// EXAMPLE DATA (to try the app)
// =====================================================
function exampleData() {
  const t = today();
  const base = [[420, 400], [180, 190], [600, 520], [150, 160], [90, 95], [55, 40], [55, 60], [20, 25], [80, 90], [125, 120], [110, 105], [70, 75]];
  // field costs = base with a small change per field
  const costs = (k) => {
    const c = {};
    base.forEach((b, i) => {
      const f = 1 + (((i * 7 + k * 3) % 9) - 4) / 50;
      c[i] = { act: String(Math.round(b[0] * f)), bgt: String(b[1]) };
    });
    return c;
  };
  const F = (id, estateId, code, year, ha, a, b, ly, k) => ({
    id: id, estateId: estateId, code: code, year: year, ha: ha,
    ypAct: a, ypBgt: b, ypLy: ly, costs: costs(k),
  });
  const fields = [
    F('f1', 'e1', '3C', '2008', '45.2', '18.2', '21.5', '20.1', 1),
    F('f2', 'e1', '4A', '2012', '38.5', '22.0', '21.0', '19.8', 2),
    F('f3', 'e1', '7A', '2016', '52.0', '19.1', '20.0', '18.0', 3),
    F('f4', 'e2', 'C12', '2010', '40.0', '23.1', '22.0', '21.5', 4),
    F('f5', 'e2', 'C14', '2014', '35.5', '18.9', '21.0', '20.2', 5),
  ];
  const estates = [
    { id: 'e1', name: 'Sungai Mai', region: 'Pahang', sou: 'SOU 1', profitAct: '8450', profitBgt: '9100' },
    { id: 'e2', name: 'Chenor', region: 'Pahang', sou: 'SOU 2', profitAct: '6120', profitBgt: '5800' },
  ];
  const v1 = {
    id: 'v1', estateId: 'e1', date: addDays(t, -2), fieldIds: ['f1', 'f2'],
    checks: {
      f1: {
        readings: { h_int: '14', h_ffb: '8', q_loose: '3', m_out: '92' },
        manual: { 4: 'good', 7: 'good', 8: 'good', 9: 'good', 10: 'good' },
        notes: { 1: 'Interval 14 days, oil loss risk', 2: 'Loose fruit in palm circles near path 2' },
      },
      f2: {
        readings: { p_gano: 'yes', w_log: '0', f_late: '9' },
        manual: { 1: 'good', 2: 'good', 4: 'good' },
        notes: { 6: 'Ganoderma confirmed, 6 palms', 5: 'Manuring round 9 days late' },
      },
    },
  };
  const v2 = {
    id: 'v2', estateId: 'e2', date: addDays(t, -5), fieldIds: ['f4', 'f5'],
    checks: {
      f4: {
        readings: { h_int: '9', l_brk: '2.5' },
        manual: { 2: 'good', 4: 'good' },
        notes: { 9: 'Tractor T-45 breakdown' },
      },
      f5: {
        readings: { r_bridge: '6', u_cov: '82' },
        manual: { 1: 'good' },
        notes: { 8: 'Culvert C1 cracking', 4: 'Weeding coverage behind target' },
      },
    },
  };
  const actions = [
    { id: 'a1', estateId: 'e1', visitId: 'v1', fieldId: 'f1', actId: 1, text: 'Dispatch extra harvesting crew', pic: 'Mandor Ali', due: addDays(t, -1), status: 'open', createdAt: v1.date },
    { id: 'a2', estateId: 'e1', visitId: 'v1', fieldId: 'f2', actId: 6, text: 'Remove Ganoderma palms', pic: 'Assistant Div 2', due: addDays(t, 5), status: 'open', createdAt: v1.date },
    { id: 'a3', estateId: 'e2', visitId: 'v2', fieldId: 'f4', actId: 9, text: 'Repair T-45 hydraulic hose', pic: 'Workshop', due: addDays(t, -3), status: 'done', doneAt: addDays(t, -4), createdAt: v2.date },
  ];
  return { estates: estates, fields: fields, visits: [v1, v2], actions: actions };
}

// =====================================================
// UPLOAD SCREEN: pick Excel/CSV or paste from Excel
// =====================================================
function UploadScreen({ estates, fields, onImport, onDone }) {
  const [paste, setPaste] = useState('');
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [replace, setReplace] = useState(false);

  // Read the first sheet that has Estate + Field columns
  const readWorkbook = (wb) => {
    // A full estate report (Performance + Cost sheets): read it all
    if (isReportWorkbook(wb)) return readReportWorkbook(wb);
    let best = null;
    wb.SheetNames.forEach((n) => {
      if (best && !best.error) return;
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: '' });
      const r = readRows(rows);
      if (!best || !r.error) best = { ...r, sheet: n };
    });
    if (best && best.error) {
      best.error += '\nSheets in file: ' + wb.SheetNames.join(', ');
    }
    return best || { error: 'The file has no sheets.' };
  };

  const pickFile = async () => {
    setDone(null);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const asset = res.assets[0];
      setBusy(true);
      setFileName(asset.name || 'file');
      let wb;
      if (asset.file) {
        // web preview
        const buf = await asset.file.arrayBuffer();
        wb = XLSX.read(buf, { type: 'array' });
      } else {
        // phone: read the file as base64
        const b64 = await readAsBase64(asset.uri);
        if (!b64) throw new Error('the file looks empty (0 bytes). Save it again and retry.');
        wb = XLSX.read(b64, { type: 'base64' });
      }
      setResult(readWorkbook(wb));
    } catch (e) {
      setResult({ error: 'Could not read the file: ' + e.message });
    }
    setBusy(false);
  };

  const readPaste = () => {
    setDone(null);
    setFileName('Pasted data');
    if (!paste.trim()) {
      setResult({ error: 'The paste box is empty. To upload a file, use PICK EXCEL / CSV FILE above.' });
      return;
    }
    setResult(readRows(textToRows(paste)));
  };

  const doImport = () => {
    const out = applyImport(result.rows, estates, fields, replace);
    const items = result.report ? reportItems(result, out.estates, out.fields) : null;
    onImport(out.estates, out.fields, items);
    setDone({ ...out, nv: items ? items.visits.length : 0, na: items ? items.actions.length : 0 });
    setResult(null);
    setPaste('');
  };

  const shareTemplate = async () => {
    try {
      await Share.share({ message: templateHeader() });
    } catch (e) {
      // ignore
    }
  };

  const ests = result && result.rows ? [...new Set(result.rows.map((r) => r.estate))] : [];

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Hero
        mini
        eyebrow="Upload estate data"
        title="Excel, CSV or paste"
        sub="One row per field. The app finds the columns by name."
        stats={[
          { ic: 'business', v: String(estates.length), l: 'Estates' },
          { ic: 'grid', v: String(fields.length), l: 'Fields' },
          { ic: 'document-text', v: 'xlsx', l: 'csv · paste', tone: 'rnd' },
        ]}
      />

      {done && (
        <View style={[styles.result, TONE_BG.good]}>
          <Ionicons name="checkmark-circle" size={22} color={C.good} />
          <View style={{ flex: 1, gap: 6 }}>
            <T style={[styles.bold, { color: C.good }]}>
              Imported: {done.newE} new estates, {done.newF} new fields, {done.updF} fields updated
              {done.delE + done.delF > 0 ? ', ' + done.delE + ' estates and ' + done.delF + ' fields removed' : ''}
              {done.nv || done.na ? ', ' + done.nv + ' visits and ' + done.na + ' follow-ups added' : ''}.
            </T>
            <Pressable onPress={onDone}>
              <T style={styles.link}>Go to Home</T>
            </Pressable>
          </View>
        </View>
      )}

      <Section icon="cloud-upload-outline" title="1. Upload a file">
        <T style={styles.hint}>Excel (.xlsx / .xls) or CSV from your phone, Drive or email.</T>
        <CTA label={busy ? 'READING…' : 'PICK EXCEL / CSV FILE'} icon="document-attach" onPress={pickFile} />
      </Section>

      <Section icon="clipboard-outline" title="Or paste from Excel">
        <T style={styles.hint}>Select the cells in Excel (with the header row), copy, and paste here.</T>
        <TextInput
          style={[styles.input, styles.pasteBox]}
          multiline
          placeholder={'Estate\tField\tMature ha\tYield Act ...'}
          placeholderTextColor="#8A8F80"
          value={paste}
          onChangeText={setPaste}
        />
        <CTA label="READ PASTED DATA" icon="reader-outline" color={C.rnd} onPress={readPaste} />
      </Section>

      {result && result.error && (
        <View style={[styles.result, TONE_BG.att]}>
          <Ionicons name="alert-circle" size={22} color={C.att} />
          <T style={[styles.resultText, { color: C.att, flex: 1 }]}>{result.error}</T>
        </View>
      )}

      {result && result.rows && (
        <Section icon="eye-outline" title="2. Check before import">
          <T style={styles.meta}>
            {fileName}
            {result.sheet ? ' · sheet "' + result.sheet + '"' : ''}
          </T>
          <View style={styles.kv}>
            <KV label="Rows (fields)" value={String(result.rows.length)} />
            <KV label="Estates" value={String(ests.length)} />
            <KV label="Skipped rows" value={String(result.skipped)} />
            <KV label={result.report ? 'Sheets read' : 'Columns read'} value={String(result.found.length)} />
            {result.report && <KV label="Fields with cost" value={String(result.costFields)} />}
            {result.report && <KV label="Visits (PMU, agronomist)" value={String(result.visits.length)} />}
            {result.report && <KV label="Follow-ups (Mission 1)" value={String(result.actions.length)} />}
          </View>
          <T style={styles.kvLabel}>{result.report ? 'Sheets used' : 'Columns recognised'}</T>
          <View style={styles.chips}>
            {result.found.map((c) => (
              <Chip key={c} tone="good" label={c} />
            ))}
          </View>
          {result.ignored.length > 0 && (
            <>
              <T style={styles.kvLabel}>Not used</T>
              <View style={styles.chips}>
                {result.ignored.map((c, i) => (
                  <Chip key={i} tone="muted" label={String(c)} />
                ))}
              </View>
            </>
          )}
          <T style={styles.kvLabel}>First rows</T>
          {result.rows.slice(0, 6).map((r, i) => (
            <View key={i} style={styles.readRow}>
              <T style={[styles.bold, { width: 90 }]} numberOfLines={1}>{r.estate}</T>
              <T style={[styles.bold, { width: 44 }]}>{r.code}</T>
              <T style={[styles.meta, { flex: 1 }]} numberOfLines={1}>
                {(r.ha || '-') + ' ha · yield ' + (r.ypAct || '-') + ' / ' + (r.ypBgt || '-') + ' · ' + Object.keys(r.costs).length + ' costs'}
              </T>
            </View>
          ))}
          <Pressable style={[styles.switchRow, replace && styles.switchRowOn]} onPress={() => setReplace(!replace)}>
            <Ionicons name={replace ? 'checkbox' : 'square-outline'} size={22} color={replace ? C.att : C.accent} />
            <View style={{ flex: 1 }}>
              <T style={styles.bold}>Replace all data</T>
              <T style={styles.meta}>
                {replace
                  ? 'Estates and fields NOT in this file will be removed (with their visits and follow-ups). Matching ones keep their history.'
                  : 'Off: merge. Same estate/field is updated, others are kept. Blank cells keep the old value.'}
              </T>
            </View>
          </Pressable>
          <CTA
            label={(replace ? 'REPLACE WITH ' : 'IMPORT ') + result.rows.length + ' FIELDS'}
            icon="checkmark-done"
            color={replace ? C.att : C.good}
            onPress={doImport}
          />
        </Section>
      )}

      <Section icon="help-circle-outline" title="File format">
        <T style={styles.meta}>
          Needed: <T style={styles.bold}>Estate</T>, <T style={styles.bold}>Field</T>.
          {'\n'}Optional: Region, SOU, Planted, Mature ha, Yield Act, Yield Bgt, Yield LY, Profit Act, Profit Bgt (RM'000, estate level), and for each of the 12 cost elements {'"<Element> Act"'} and {'"<Element> Bgt"'} (RM/ha), e.g. "Manuring Act", "Manuring Bgt".
        </T>
        <CTA label="SHARE TEMPLATE HEADER ROW" icon="share-outline" color={C.muted} onPress={shareTemplate} />
      </Section>
    </ScrollView>
  );
}

// Read a picked file on the phone as base64 text
async function readAsBase64(uri) {
  // 1st try: Expo file system (most reliable on Android)
  try {
    const b64 = await new File(uri).base64();
    if (b64) return b64;
  } catch (e) {
    // fall back below
  }
  // 2nd try: fetch + FileReader
  const res = await fetch(uri);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = () => reject(new Error('cannot open file'));
    r.readAsDataURL(blob);
  });
}

function KV({ label, value }) {
  return (
    <View style={styles.kvItem}>
      <T style={styles.kvLabel}>{label}</T>
      <T style={styles.kvValue} numberOfLines={1}>
        {value}
      </T>
    </View>
  );
}

// =====================================================
// DATE FIELD: tap to open a calendar (no typing)
// =====================================================
const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function DateField({ label, value, onChange, style }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState((value || today()).slice(0, 7));

  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7)) - 1;
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  const shift = (n) => {
    const d = new Date(y, m + n, 1);
    setMonth(toKey(d).slice(0, 7));
  };
  const pick = (d) => {
    onChange(toKey(new Date(y, m, d)));
    setOpen(false);
  };

  return (
    <View style={[styles.field, style]}>
      {label ? <T style={styles.label}>{label}</T> : null}
      <Pressable
        style={[styles.input, styles.dateBtn]}
        onPress={() => {
          setMonth((value || today()).slice(0, 7));
          setOpen(true);
        }}>
        <Ionicons name="calendar-outline" size={17} color={C.accent} />
        <T style={styles.dateBtnText}>{value ? showDate(value) : 'Pick a date'}</T>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBg} onPress={() => setOpen(false)}>
          <Pressable style={styles.calCard} onPress={() => {}}>
            <View style={styles.calHead}>
              <Pressable style={styles.iconBtn} onPress={() => shift(-1)}>
                <Ionicons name="chevron-back" size={20} color={C.ink} />
              </Pressable>
              <Text style={styles.calTitle}>
                {MONTHS[m]} {y}
              </Text>
              <Pressable style={styles.iconBtn} onPress={() => shift(1)}>
                <Ionicons name="chevron-forward" size={20} color={C.ink} />
              </Pressable>
            </View>
            <View style={styles.calGrid}>
              {WEEK.map((w, i) => (
                <T key={'w' + i} style={styles.calWeek}>{w}</T>
              ))}
              {cells.map((d, i) => {
                if (!d) return <View key={'e' + i} style={styles.calCell} />;
                const key = toKey(new Date(y, m, d));
                const on = key === value;
                const isToday = key === today();
                return (
                  <Pressable
                    key={key}
                    style={[styles.calCell, on && styles.calOn, !on && isToday && styles.calToday]}
                    onPress={() => pick(d)}>
                    <T style={[styles.calDay, on && { color: '#fff' }]}>{d}</T>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.row2}>
              <Pressable style={styles.btnGhost} onPress={() => { onChange(today()); setOpen(false); }}>
                <T style={styles.bold}>Today</T>
              </Pressable>
              <Pressable style={styles.btnGhost} onPress={() => setOpen(false)}>
                <T style={styles.bold}>Close</T>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// =====================================================
// PHOTOS: take or pick, show thumbnails, tap to view
// =====================================================
function PhotoStrip({ photos, onChange, readOnly }) {
  const [view, setView] = useState(null);
  const [msg, setMsg] = useState('');
  const list = photos || [];

  const add = async (camera) => {
    setMsg('');
    try {
      if (camera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setMsg('Camera permission is needed to take photos.');
          return;
        }
      }
      const opts = { mediaTypes: ['images'], quality: 0.4, allowsEditing: false };
      const res = camera
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts);
      if (res.canceled) return;
      onChange([...list, ...res.assets.map((a) => a.uri)]);
    } catch (e) {
      setMsg(camera ? 'Camera is not available here. Use Gallery.' : 'Could not open photos: ' + e.message);
    }
  };

  return (
    <View style={{ gap: 8 }}>
      {list.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.photoRow}>
            {list.map((uri, i) => (
              <Pressable key={uri + i} onPress={() => setView(uri)}>
                <Image source={{ uri: uri }} style={styles.thumb} />
                {!readOnly && (
                  <Pressable
                    style={styles.thumbX}
                    hitSlop={8}
                    onPress={() => onChange(list.filter((x, j) => j !== i))}>
                    <Ionicons name="close" size={14} color="#fff" />
                  </Pressable>
                )}
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
      {!readOnly && (
        <View style={styles.row2}>
          <Pressable style={styles.photoBtn} onPress={() => add(true)}>
            <Ionicons name="camera" size={17} color={C.accent} />
            <T style={styles.photoBtnText}>Camera</T>
          </Pressable>
          <Pressable style={styles.photoBtn} onPress={() => add(false)}>
            <Ionicons name="images" size={17} color={C.accent} />
            <T style={styles.photoBtnText}>Gallery</T>
          </Pressable>
        </View>
      )}
      {msg ? <T style={styles.hint}>{msg}</T> : null}
      <Modal visible={!!view} transparent animationType="fade" onRequestClose={() => setView(null)}>
        <Pressable style={styles.photoView} onPress={() => setView(null)}>
          {view && <Image source={{ uri: view }} style={styles.photoBig} resizeMode="contain" />}
          <T style={styles.photoClose}>Tap to close</T>
        </Pressable>
      </Modal>
    </View>
  );
}

// =====================================================
// SETTINGS: change trigger limits without coding
// =====================================================
function SettingsScreen({ settings, setSettings, counts, onClearAll }) {
  const [openAct, setOpenAct] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const s = settings || {};
  const setTop = (k, v) => setSettings({ ...s, [k]: v });
  const setRule = (rid, k, v) => {
    const rules = { ...(s.rules || {}) };
    rules[rid] = { ...(rules[rid] || {}), [k]: v };
    setSettings({ ...s, rules: rules });
  };
  const val = (rid, k) => {
    const o = (s.rules || {})[rid] || {};
    return o[k] !== undefined ? o[k] : '';
  };
  const changed = Object.keys(s.rules || {}).length + ['cost', 'yieldRed', 'yieldAmber'].filter((k) => s[k] !== undefined && s[k] !== '').length;

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Hero
        mini
        eyebrow="Settings"
        title="Trigger limits"
        sub="Leave a box empty to use the default (shown in grey)."
        stats={[
          { ic: 'cash', v: LIMITS.cost + '%', l: 'Cost limit', tone: 'att' },
          { ic: 'leaf', v: LIMITS.yieldRed + '%', l: 'Yield action', tone: 'att' },
          { ic: 'options', v: String(changed), l: 'Changed', tone: changed ? 'mon' : 'good' },
        ]}
      />

      <Section icon="cash-outline" title="Cost & yield">
        <Field
          label={'Cost over budget = Action when above (%) · default ' + DEFAULT_LIMITS.cost}
          full
          keyboardType="numeric"
          placeholder={String(DEFAULT_LIMITS.cost)}
          value={s.cost || ''}
          onChangeText={(t) => setTop('cost', t)}
        />
        <View style={styles.row2}>
          <Field
            label={'Yield Action below (%)'}
            keyboardType="numeric"
            placeholder={String(DEFAULT_LIMITS.yieldRed)}
            value={s.yieldRed || ''}
            onChangeText={(t) => setTop('yieldRed', t)}
          />
          <Field
            label={'Yield Monitor below (%)'}
            keyboardType="numeric"
            placeholder={String(DEFAULT_LIMITS.yieldAmber)}
            value={s.yieldAmber || ''}
            onChangeText={(t) => setTop('yieldAmber', t)}
          />
        </View>
      </Section>

      <Section icon="flash-outline" title="Activity triggers">
        <T style={styles.hint}>Tap an activity to change its Action and Monitor numbers.</T>
        {ACTIVITIES.map((a) => {
          const isOpen = openAct === a.id;
          const nums = a.rules.filter((r) => r.op !== 'yes');
          return (
            <View key={a.id} style={styles.rcardCol}>
              <Pressable style={styles.setHead} onPress={() => setOpenAct(isOpen ? null : a.id)}>
                <Ionicons name={a.icon} size={18} color={C.accent} />
                <T style={[styles.bold, { flex: 1 }]}>{no2(a.id)}. {a.name}</T>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={C.muted} />
              </Pressable>
              {isOpen &&
                nums.map((r) => (
                  <View key={r.id} style={{ gap: 4 }}>
                    <T style={styles.ruleName}>
                      {r.name} ({r.unit}) · {r.op === '>' ? 'higher is worse' : 'lower is worse'}
                    </T>
                    <View style={styles.row2}>
                      <Field
                        label="Action"
                        keyboardType="numeric"
                        placeholder={String(DEFAULT_RULES[r.id].red)}
                        value={val(r.id, 'red')}
                        onChangeText={(t) => setRule(r.id, 'red', t)}
                      />
                      <Field
                        label="Monitor"
                        keyboardType="numeric"
                        placeholder={String(DEFAULT_RULES[r.id].amber)}
                        value={val(r.id, 'amber')}
                        onChangeText={(t) => setRule(r.id, 'amber', t)}
                      />
                    </View>
                  </View>
                ))}
            </View>
          );
        })}
      </Section>

      <CTA label="RESET LIMITS TO DEFAULT" icon="refresh" color={C.muted} onPress={() => setSettings({})} />

      <Section icon="trash-outline" title="Clear all data">
        <T style={styles.meta}>
          Removes {counts.estates} estates, {counts.fields} fields, {counts.visits} visits and {counts.actions} follow-ups
          (including photos) from this phone. Trigger limits are kept. This cannot be undone.
        </T>
        {confirm ? (
          <View style={styles.confirm}>
            <T style={styles.confirmText}>Are you sure? Everything will be deleted.</T>
            <View style={styles.row2}>
              <Pressable style={styles.btnGhost} onPress={() => setConfirm(false)}>
                <T style={styles.bold}>Cancel</T>
              </Pressable>
              <Pressable style={styles.btnDanger} onPress={onClearAll}>
                <T style={[styles.bold, { color: '#fff' }]}>Yes, clear all</T>
              </Pressable>
            </View>
          </View>
        ) : (
          <CTA label="CLEAR ALL DATA" icon="trash" color={C.att} onPress={() => setConfirm(true)} />
        )}
      </Section>
    </ScrollView>
  );
}

// =====================================================
// DROPDOWN: tap to open a list (with search)
// =====================================================
function Dropdown({ label, value, options, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const sel = options.find((o) => o.value === value);
  const list = options.filter((o) => norm(o.label).includes(norm(q)));
  return (
    <View style={styles.field}>
      {label ? <T style={styles.label}>{label}</T> : null}
      <Pressable style={[styles.input, styles.ddBtn]} onPress={() => setOpen(true)}>
        <T style={[styles.ddText, !sel && { color: '#8A8F80' }]} numberOfLines={1}>
          {sel ? sel.label : placeholder || 'Select'}
        </T>
        <Ionicons name="chevron-down" size={18} color={C.accent} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBg} onPress={() => setOpen(false)}>
          <Pressable style={styles.ddCard} onPress={() => {}}>
            <Text style={styles.calTitle}>{label || 'Select'}</Text>
            {options.length > 6 && (
              <TextInput
                style={styles.input}
                placeholder="Search"
                placeholderTextColor="#8A8F80"
                value={q}
                onChangeText={setQ}
              />
            )}
            <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
              {list.map((o) => {
                const on = o.value === value;
                return (
                  <Pressable
                    key={String(o.value)}
                    style={[styles.ddRow, on && styles.ddRowOn]}
                    onPress={() => {
                      onChange(o.value);
                      setOpen(false);
                      setQ('');
                    }}>
                    <View style={{ flex: 1 }}>
                      <T style={[styles.bold, on && { color: C.accent }]}>{o.label}</T>
                      {o.sub ? <T style={styles.meta}>{o.sub}</T> : null}
                    </View>
                    {o.tone && <View style={[styles.resDot, { backgroundColor: TONE_FG[o.tone] }]} />}
                    {on && <Ionicons name="checkmark" size={18} color={C.accent} />}
                  </Pressable>
                );
              })}
              {list.length === 0 && <T style={styles.hint}>Nothing found.</T>}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// =====================================================
// ALL TRIGGERS FOR ONE FIELD
// =====================================================
function fieldTriggers(f, visits, actions) {
  const out = [];
  const ys = yieldStatus(f);
  if (ys === 'action' || ys === 'monitor') {
    out.push({ key: 'y', st: ys, icon: 'trending-down', text: 'Yield below budget', sub: f.ypAct + ' vs ' + f.ypBgt + ' mt/ha (' + pctText(yieldVar(f)) + ')' });
  }
  COSTS.forEach((name, i) => {
    const v = variance(costOf(f, i).act, costOf(f, i).bgt);
    if (v !== null && v > LIMITS.cost) {
      out.push({ key: 'c' + i, st: 'action', icon: 'cash', text: name + ' cost over budget', sub: money(costOf(f, i).act) + ' vs ' + money(costOf(f, i).bgt) + ' RM/ha (' + pctText(v) + ')' });
    }
  });
  const lv = latestFieldVisit(visits, f.id);
  if (lv) {
    const ck = checkOf(lv, f.id);
    ACTIVITIES.forEach((a) => {
      const st = actStatus(ck, a);
      if (st === 'action' || st === 'monitor') {
        out.push({ key: 'a' + a.id, st: st, icon: a.icon, text: no2(a.id) + '. ' + a.name, sub: ((ck.notes || {})[a.id] || 'Visit ' + showDate(lv.date)), photos: (ck.photos || {})[a.id] || [] });
      }
    });
  }
  actions
    .filter((x) => x.fieldId === f.id && x.status !== 'done')
    .forEach((x) => {
      out.push({ key: 'f' + x.id, st: isOverdue(x) ? 'action' : 'monitor', icon: isOverdue(x) ? 'time' : 'flag', text: 'Follow-up: ' + x.text, sub: (isOverdue(x) ? 'Overdue · due ' : 'Due ') + showDate(x.due) + ' · PIC ' + (x.pic || '-') });
    });
  return out.sort((a, b) => RANK[b.st] - RANK[a.st]);
}

// =====================================================
// FILTERS: Region > SOU > Estate > Field
// =====================================================
const ALL = '__all__';

function uniq(list) {
  return [...new Set(list.filter(Boolean))].sort();
}

// Estates that match the chosen Region and SOU
function estatesIn(estates, sel) {
  return estates.filter(
    (e) => (!sel.region || e.region === sel.region) && (!sel.sou || e.sou === sel.sou)
  );
}

function Filters({ estates, fields, visits, actions, sel, onChange }) {
  const regions = uniq(estates.map((e) => e.region));
  const sous = uniq(estates.filter((e) => !sel.region || e.region === sel.region).map((e) => e.sou));
  const es = estatesIn(estates, sel);
  const estate = es.find((e) => e.id === sel.estateId) || null;
  const ef = estate ? fields.filter((f) => f.estateId === estate.id) : [];

  const fieldOpts = [{ value: ALL, label: 'All fields (estate summary)' }].concat(
    ef.map((f) => {
      const t = fieldTriggers(f, visits, actions);
      const red = countIn(t, 'action');
      const amb = countIn(t, 'monitor');
      return {
        value: f.id,
        label: 'Field ' + f.code,
        sub: (f.year ? 'PY ' + f.year + ' · ' : '') + (f.ha || '-') + ' ha · ' + (red ? red + ' action' : amb ? amb + ' monitor' : 'all good'),
        tone: red ? 'att' : amb ? 'mon' : 'good',
      };
    })
  );

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.row2}>
        <Dropdown
          label="Region"
          value={sel.region || ALL}
          options={[{ value: ALL, label: 'All regions' }].concat(
            regions.map((r) => ({ value: r, label: r, sub: estates.filter((e) => e.region === r).length + ' estates' }))
          )}
          onChange={(v) => onChange({ region: v === ALL ? null : v })}
        />
        <Dropdown
          label="SOU"
          value={sel.sou || ALL}
          options={[{ value: ALL, label: 'All SOU' }].concat(
            sous.map((u) => ({ value: u, label: u, sub: estates.filter((e) => e.sou === u).length + ' estates' }))
          )}
          onChange={(v) => onChange({ region: sel.region, sou: v === ALL ? null : v })}
        />
      </View>
      <View style={styles.row2}>
        <Dropdown
          label="Estate"
          value={estate ? estate.id : ALL}
          options={[{ value: ALL, label: 'All estates (summary)' }].concat(
            es.map((e) => ({
              value: e.id,
              label: e.name,
              sub: [e.sou, fields.filter((f) => f.estateId === e.id).length + ' fields'].filter(Boolean).join(' · '),
            }))
          )}
          onChange={(v) => onChange({ region: sel.region, sou: sel.sou, estateId: v === ALL ? null : v })}
        />
        <Dropdown
          label="Field"
          value={sel.fieldId || ALL}
          placeholder={estate ? 'All fields' : 'Pick estate first'}
          options={estate ? fieldOpts : []}
          onChange={(v) => onChange({ region: sel.region, sou: sel.sou, estateId: estate ? estate.id : null, fieldId: v === ALL ? null : v })}
        />
      </View>
    </View>
  );
}

// =====================================================
// LOOKUP: Region / SOU / Estate / Field views
// =====================================================
function LookupScreen(p) {
  const { estates, fields, sel, setSel } = p;
  const es = estatesIn(estates, sel);
  const estate = es.find((e) => e.id === sel.estateId) || null;
  const ef = estate ? fields.filter((f) => f.estateId === estate.id) : [];
  const field = ef.find((f) => f.id === sel.fieldId) || null;

  if (estates.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Empty title="No estates yet" text="Upload your estate data or load the example data on Home." />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <View style={styles.selBar}>
        <Filters {...p} sel={sel} onChange={setSel} />
      </View>

      {field ? (
        <FieldLookup {...p} estate={estate} field={field} />
      ) : estate ? (
        <EstateLookup {...p} estate={estate} ef={ef} onPickField={(id) => setSel({ ...sel, estateId: estate.id, fieldId: id })} />
      ) : (
        <GroupLookup {...p} es={es} onPickEstate={(id) => setSel({ ...sel, estateId: id, fieldId: null })} />
      )}
    </ScrollView>
  );
}

// Summary for a Region / SOU (or all estates)
function GroupLookup(p) {
  const { es, fields, visits, actions, sel } = p;
  const title = sel.sou || sel.region || 'All estates';
  const rows = es
    .map((e) => {
      const ef = fields.filter((f) => f.estateId === e.id);
      let red = 0;
      let amb = 0;
      ef.forEach((f) => {
        const t = fieldTriggers(f, visits, actions);
        red += countIn(t, 'action');
        amb += countIn(t, 'monitor');
      });
      return { e: e, ef: ef, red: red, amb: amb, ey: estateYield(ef), pv: profitVar(e) };
    })
    .sort((a, b) => b.red - a.red || b.amb - a.amb);
  const allF = fields.filter((f) => es.some((e) => e.id === f.estateId));
  const gy = estateYield(allF);
  let pa = 0;
  let pb = 0;
  es.forEach((e) => {
    if (num(e.profitAct) !== null && num(e.profitBgt) !== null) {
      pa += num(e.profitAct);
      pb += num(e.profitBgt);
    }
  });
  const gpv = pb ? ((pa - pb) / pb) * 100 : null;
  const totalRed = rows.reduce((s, r) => s + r.red, 0);
  const maxP = rows.reduce((m, r) => Math.max(m, num(r.e.profitAct) || 0, num(r.e.profitBgt) || 0), 1);

  return (
    <>
      <Hero
        mini
        eyebrow={sel.sou ? 'SOU summary' : sel.region ? 'Region summary' : 'All estates'}
        title={title}
        sub={es.length + ' estates · ' + allF.length + ' fields' + (gy ? ' · ' + gy.ha.toFixed(0) + ' mature ha' : '')}
        stats={[
          { ic: 'alert-circle', v: String(totalRed), l: 'Action', tone: 'att' },
          { ic: 'leaf', v: gy ? pctText(gy.v) : '-', l: 'Yield var', tone: gy && gy.v < LIMITS.yieldAmber ? 'att' : 'good' },
          { ic: 'trending-up', v: pctText(gpv), l: 'Profit var', tone: gpv !== null && gpv < 0 ? 'att' : 'good' },
        ]}
      />
      <Section icon="podium-outline" title="Estates by urgency" right={<T style={styles.hint}>Tap to open</T>}>
        {rows.length === 0 && <T style={styles.hint}>No estates in this selection.</T>}
        {rows.map((r) => (
          <Pressable key={r.e.id} style={styles.rcard} onPress={() => p.onPickEstate(r.e.id)}>
            <View style={[styles.estBox, r.red ? { backgroundColor: C.att } : null]}>
              <Text style={styles.estBoxText}>{r.e.name.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.rcardTitle}>{r.e.name}</Text>
              <T style={styles.meta} numberOfLines={1}>
                {[r.e.sou, r.ef.length + ' fields', r.ey ? 'yield ' + pctText(r.ey.v) : null, 'profit ' + pctText(r.pv)].filter(Boolean).join(' · ')}
              </T>
              <View style={styles.chips}>
                {r.red > 0 && <Chip tone="att" dot label={r.red + ' action'} />}
                {r.amb > 0 && <Chip tone="mon" dot label={r.amb + ' monitor'} />}
                {r.red + r.amb === 0 && <Chip tone="good" dot label="All clear" />}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.muted} />
          </Pressable>
        ))}
      </Section>
      {rows.some((r) => num(r.e.profitAct) !== null) && (
        <Section icon="bar-chart-outline" title="Profit by estate" right={<T style={styles.hint}>RM'000 YTD</T>}>
          {rows
            .filter((r) => num(r.e.profitAct) !== null)
            .map((r) => (
              <Bar
                key={r.e.id}
                label={r.e.name + '  ' + money(r.e.profitAct)}
                value={num(r.e.profitAct)}
                max={maxP}
                marker={num(r.e.profitBgt) === null ? undefined : num(r.e.profitBgt)}
                color={r.pv !== null && r.pv < 0 ? C.att : C.good}
                right={pctText(r.pv)}
              />
            ))}
          <T style={styles.hint}>Bar = actual profit. Black line = budget.</T>
        </Section>
      )}
    </>
  );
}

function FieldLookup(p) {
  const { field, estate, visits, actions } = p;
  const trig = fieldTriggers(field, visits, actions);
  const red = countIn(trig, 'action');
  const amb = countIn(trig, 'monitor');
  const ys = yieldStatus(field);
  const lv = latestFieldVisit(visits, field.id);
  const ck = lv ? checkOf(lv, field.id) : null;
  const fa = actions.filter((a) => a.fieldId === field.id);
  const maxY = Math.max(num(field.ypAct) || 0, num(field.ypBgt) || 0, num(field.ypLy) || 0, 1);
  const over = costAlerts(field).length;

  return (
    <>
      <Hero
        mini
        eyebrow={estate.name}
        title={'Field ' + field.code}
        sub={(field.year ? 'Planted ' + field.year + ' · ' : '') + (field.ha || '-') + ' mature ha'}
        stats={[
          { ic: 'alert-circle', v: String(red), l: 'Action', tone: 'att' },
          { ic: 'warning', v: String(amb), l: 'Monitor', tone: 'mon' },
          { ic: 'leaf', v: pctText(yieldVar(field)), l: 'Yield var', tone: ys ? STATUS[ys].tone : null },
        ]}
      />

      {trig.length > 0 ? (
        <View style={styles.exc}>
          <View style={styles.excHead}>
            <View style={[styles.hic, { backgroundColor: C.att }]}>
              <Ionicons name="alert" size={17} color="#fff" />
            </View>
            <Text style={styles.excTitle}>TRIGGERED IN THIS FIELD</Text>
            <View style={{ flex: 1 }} />
            <View style={styles.excCount}>
              <T style={styles.excCountText}>{trig.length}</T>
            </View>
          </View>
          {trig.map((t) => (
            <View key={t.key} style={styles.exRow}>
              <View style={[styles.exIc, TONE_BG[STATUS[t.st].tone]]}>
                <Ionicons name={t.icon} size={19} color={TONE_FG[STATUS[t.st].tone]} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <T style={styles.exTitle}>{t.text}</T>
                <T style={styles.meta}>{t.sub}</T>
                {t.photos && t.photos.length > 0 && <PhotoStrip photos={t.photos} readOnly />}
              </View>
              <Chip tone={STATUS[t.st].tone} dot label={STATUS[t.st].label} />
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.result, TONE_BG.good]}>
          <Ionicons name="checkmark-circle" size={22} color={C.good} />
          <T style={[styles.bold, { color: C.good, flex: 1 }]}>All clear. Nothing triggered in this field.</T>
        </View>
      )}

      <View style={styles.row2}>
        <View style={{ flex: 1 }}>
          <CTA label="NEW VISIT HERE" icon="add" onPress={() => p.onNewVisit(estate.id, [field.id])} />
        </View>
        <View style={{ flex: 1 }}>
          <CTA label="EDIT DATA" icon="create" color={C.muted} onPress={() => p.onOpenField(field.id, 'Profile')} />
        </View>
      </View>

      <Section icon="leaf-outline" title="Yield YTD" right={<T style={styles.hint}>mt/ha</T>}>
        {num(field.ypAct) === null ? (
          <T style={styles.hint}>No yield data yet.</T>
        ) : (
          <>
            <Bar label="Actual" value={num(field.ypAct)} max={maxY} color={ys ? TONE_FG[STATUS[ys].tone] : C.good} right={field.ypAct + ' (' + pctText(yieldVar(field)) + ')'} />
            <Bar label="Budget" value={num(field.ypBgt) || 0} max={maxY} color={C.muted} right={field.ypBgt || '-'} />
            <Bar label="Last year" value={num(field.ypLy) || 0} max={maxY} color={C.rnd} right={field.ypLy || '-'} />
          </>
        )}
      </Section>

      <Section icon="cash-outline" title="Cost" right={<T style={[styles.hint, over && { color: C.att }]}>{over} of 12 over budget</T>}>
        <CostMini obj={field} />
      </Section>

      <Section icon="calendar-outline" title={lv ? 'Latest visit · ' + showDate(lv.date) : 'Latest visit'}>
        {!lv ? (
          <T style={styles.hint}>This field has not been visited yet.</T>
        ) : (
          <View style={styles.actGrid}>
            {ACTIVITIES.map((a) => {
              const st = actStatus(ck, a);
              const tone = st ? STATUS[st].tone : 'muted';
              return (
                <Pressable key={a.id} style={[styles.actTile, TONE_BG[tone]]} onPress={() => p.onOpenVisit(lv.id)}>
                  <Ionicons name={a.icon} size={16} color={TONE_FG[tone]} />
                  <T style={[styles.actTileText, { color: TONE_FG[tone] }]} numberOfLines={2}>
                    {no2(a.id)} {a.name}
                  </T>
                </Pressable>
              );
            })}
          </View>
        )}
      </Section>

      <Section icon="flag-outline" title="Follow-ups">
        {fa.length === 0 ? (
          <T style={styles.hint}>No follow-ups for this field.</T>
        ) : (
          sortActions(fa).map((a) => <ActionRow key={a.id} a={a} onSave={p.onSaveAction} showAct />)
        )}
      </Section>
    </>
  );
}

// Compact list of the 12 costs (bar = actual, line = budget)
function CostMini({ obj }) {
  let max = 1;
  COSTS.forEach((n, i) => {
    max = Math.max(max, num(costOf(obj, i).act) || 0, num(costOf(obj, i).bgt) || 0);
  });
  const rows = COSTS.map((name, i) => ({ name: name, c: costOf(obj, i) })).filter((r) => num(r.c.act) !== null);
  if (!rows.length) return <T style={styles.hint}>No cost data yet.</T>;
  return rows.map((r) => {
    const v = variance(r.c.act, r.c.bgt);
    return (
      <Bar
        key={r.name}
        label={r.name + '  ' + money(r.c.act)}
        value={num(r.c.act)}
        max={max}
        marker={num(r.c.bgt) === null ? undefined : num(r.c.bgt)}
        color={v !== null && v > LIMITS.cost ? C.att : v !== null && v > 0 ? C.mon : C.good}
        right={pctText(v)}
      />
    );
  });
}

function EstateLookup(p) {
  const { estate, ef, visits, actions } = p;
  const ey = estateYield(ef);
  const pv = profitVar(estate);
  const rows = ef
    .map((f) => {
      const t = fieldTriggers(f, visits, actions);
      return { f: f, t: t, red: countIn(t, 'action'), amb: countIn(t, 'monitor') };
    })
    .sort((a, b) => b.red - a.red || b.amb - a.amb);
  const totalRed = rows.reduce((s, r) => s + r.red, 0);

  return (
    <>
      <Hero
        mini
        eyebrow="Estate summary"
        title={estate.name}
        sub={ef.length + ' fields · ' + (ey ? ey.ha.toFixed(1) + ' mature ha' : 'no area yet')}
        stats={[
          { ic: 'alert-circle', v: String(totalRed), l: 'Action', tone: 'att' },
          { ic: 'leaf', v: ey ? pctText(ey.v) : '-', l: 'Yield var', tone: ey && ey.v < LIMITS.yieldAmber ? 'att' : 'good' },
          { ic: 'trending-up', v: pctText(pv), l: 'Profit var', tone: pv !== null && pv < 0 ? 'att' : 'good' },
        ]}
      />
      <Section icon="podium-outline" title="Fields by urgency" right={<T style={styles.hint}>Tap to open</T>}>
        {rows.length === 0 && <T style={styles.hint}>No fields yet.</T>}
        {rows.map((r) => {
          const ys = yieldStatus(r.f);
          return (
            <Pressable key={r.f.id} style={styles.rcard} onPress={() => p.onPickField(r.f.id)}>
              <View style={[styles.fieldBox, r.red ? TONE_BG.att : r.amb ? TONE_BG.mon : TONE_BG.good]}>
                <Text style={[styles.fieldBoxText, { color: r.red ? C.att : r.amb ? C.mon : C.good }]}>{r.f.code}</Text>
                <T style={styles.fieldBoxSub}>{r.f.ha ? r.f.ha + ' ha' : ''}</T>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T style={styles.bold} numberOfLines={1}>
                  {r.t.length ? r.t[0].text : 'All clear'}
                </T>
                <View style={styles.chips}>
                  {r.red > 0 && <Chip tone="att" dot label={r.red + ' action'} />}
                  {r.amb > 0 && <Chip tone="mon" dot label={r.amb + ' monitor'} />}
                  {ys && <Chip tone={STATUS[ys].tone} label={'Yield ' + pctText(yieldVar(r.f))} />}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.muted} />
            </Pressable>
          );
        })}
      </Section>
    </>
  );
}

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

function firstLine(v, max) {
  const s = String(v || '').split(/\r?\n/).map((x) => x.trim()).filter((x) => x)[0] || '';
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

// Which of the 10 activities a finding belongs to
function activityFor(text) {
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
function isReportWorkbook(wb) {
  return !!(findSheet(wb, 'Performance') && wb.SheetNames.some((n) => / cost$/i.test(n.trim())));
}

function readReportWorkbook(wb) {
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
function reportItems(result, es, fs) {
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

// ===== STYLES =====
const TOP_PAD =
  Platform.OS === 'ios'
    ? 50
    : Platform.OS === 'android'
    ? (StatusBar.currentHeight || 24) + 6
    : 10;

const SHADOW = {
  shadowColor: '#302C1E',
  shadowOpacity: 0.08,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: C.bg },
  loading: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { fontFamily: F.body, color: C.ink, fontSize: 15 },
  page: { padding: 16, paddingBottom: 32, gap: 12 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: TOP_PAD,
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: C.skyTop,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: { fontFamily: F.display, fontSize: 24, color: C.ink },
  topTitleB: { fontFamily: F.displayBold, color: C.accent },
  topSub: { fontSize: 12, color: C.muted, fontFamily: F.semi },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: C.att,
    borderWidth: 2,
    borderColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontFamily: F.bold },
  hero: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.line,
    minHeight: 178,
    backgroundColor: C.sky2,
  },
  heroMini: { minHeight: 168 },
  scene: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  heroTx: { paddingHorizontal: 14, paddingTop: 12, gap: 2 },
  eyebrowGold: {
    fontSize: 11,
    fontFamily: F.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: C.gold,
  },
  heroTitle: { fontFamily: F.display, fontSize: 25, color: C.ink },
  heroTitleMini: { fontSize: 23 },
  heroStats: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingBottom: 10,
    marginTop: 'auto',
    paddingTop: 12,
  },
  hstat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,253,248,0.9)',
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 7,
  },
  sic: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hstatVal: { fontFamily: F.display, fontSize: 22, color: C.ink, lineHeight: 24 },
  hstatLbl: { fontSize: 10.5, color: C.muted, fontFamily: F.semi },
  section: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    padding: 14,
    gap: 12,
    ...SHADOW,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hic: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontFamily: F.display, fontSize: 21, color: C.ink },
  hint: { fontSize: 12.5, color: C.muted, fontFamily: F.semi },
  meta: { fontSize: 13, color: C.muted },
  link: { color: C.accent, fontFamily: F.semi, fontSize: 13, textDecorationLine: 'underline' },
  kv: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 },
  kvItem: { width: '50%', paddingRight: 8 },
  kvLabel: {
    fontSize: 10.5,
    fontFamily: F.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: C.muted,
  },
  kvValue: { fontFamily: F.semi, fontSize: 15, marginTop: 2 },
  seg: { flexDirection: 'row', gap: 6 },
  segBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
    alignItems: 'center',
  },
  segBtnOn: { backgroundColor: C.accent, borderColor: C.accent },
  segText: { fontFamily: F.semi, fontSize: 14, color: C.muted },
  segTextOn: { color: '#fff' },
  row2: { flexDirection: 'row', gap: 10 },
  field: { flex: 1, gap: 4 },
  fieldFull: { gap: 4 },
  inputMulti: { minHeight: 76, textAlignVertical: 'top' },
  label: { fontSize: 13, fontFamily: F.semi, color: C.muted },
  input: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: F.body,
    color: C.ink,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingVertical: 12,
  },
  ctaText: { fontFamily: F.display, fontSize: 19, color: '#fff', letterSpacing: 0.6 },
  empty: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: C.line,
    borderRadius: 14,
    gap: 4,
  },
  emptyTitle: { fontFamily: F.display, fontSize: 21, color: C.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 5 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { fontSize: 12, fontFamily: F.semi },
  barTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: C.sunk,
    overflow: 'hidden',
  },
  barFill: { height: 10, borderRadius: 5 },
  confirm: {
    backgroundColor: C.attBg,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  confirmText: { color: C.att, fontFamily: F.semi },
  btnGhost: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnDanger: {
    flex: 1,
    backgroundColor: C.att,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  delRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  ruleName: { fontFamily: F.semi, fontSize: 14 },
  result: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 12,
    padding: 12,
    alignItems: 'flex-start',
  },
  resultText: { fontFamily: F.semi, fontSize: 14 },
  readRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exc: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.attBg,
    overflow: 'hidden',
    ...SHADOW,
  },
  excHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: C.attBg,
  },
  excTitle: { fontFamily: F.display, fontSize: 19, color: C.att, letterSpacing: 0.5 },
  excCount: {
    backgroundColor: C.surface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  excCountText: { fontSize: 12, fontFamily: F.bold, color: C.att },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  exIc: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exTitle: { fontSize: 14.5, fontFamily: F.semi },
  rcard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 14,
    padding: 10,
  },
  rcardTitle: { fontFamily: F.display, fontSize: 20, color: C.ink },
  dateBox: {
    width: 50,
    borderRadius: 12,
    backgroundColor: C.brand,
    alignItems: 'center',
    paddingVertical: 6,
  },
  dateBoxBig: { fontFamily: F.display, fontSize: 22, color: '#fff', lineHeight: 24 },
  dateBoxSmall: {
    fontSize: 10,
    fontFamily: F.bold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#D9F2E0',
  },
  estBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: C.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  estBoxText: { fontFamily: F.display, fontSize: 20, color: '#fff' },
  addBtn: {
    width: 46,
    height: 44,
    borderRadius: 10,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bold: { fontFamily: F.semi, fontSize: 14.5, color: C.ink },
  strike: { textDecorationLine: 'line-through', color: C.muted },
  costRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  totalRow: { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10 },
  costName: { flex: 1, minWidth: 0, fontSize: 13 },
  costCell: { width: 70, minWidth: 0, textAlign: 'right' },
  costIn: { paddingHorizontal: 8, paddingVertical: 7, fontSize: 14 },
  costVar: { width: 52, textAlign: 'right', fontSize: 12, fontFamily: F.bold },
  profitBox: { borderRadius: 12, padding: 14, alignItems: 'center' },
  profitBig: { fontFamily: F.display, fontSize: 38 },
  stBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
  },
  stText: { fontFamily: F.semi, fontSize: 13 },
  barHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  barLabel: { flex: 1, fontSize: 13, fontFamily: F.semi },
  barRight: { fontSize: 12, fontFamily: F.bold },
  barMark: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 3,
    marginLeft: -1.5,
    backgroundColor: C.ink,
  },
  actCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    ...SHADOW,
  },
  actHead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  actIc: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actBody: {
    paddingHorizontal: 12,
    paddingBottom: 14,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 12,
  },
  readIn: { width: 84, textAlign: 'right' },
  yesNo: { flexDirection: 'row', gap: 4 },
  ynBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.bg,
  },
  ynText: { fontFamily: F.semi, fontSize: 13 },
  resDot: { width: 12, height: 12, borderRadius: 6 },
  fupBox: {
    backgroundColor: C.bg,
    borderRadius: 12,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: C.line,
  },
  fieldBox: {
    width: 56,
    height: 50,
    borderRadius: 12,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldBoxText: { fontFamily: F.display, fontSize: 19, color: C.accent, lineHeight: 21 },
  fieldBoxSub: { fontSize: 9.5, fontFamily: F.bold, color: C.muted },
  costRo: { fontFamily: F.semi, fontSize: 14 },
  pickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.bg,
  },
  pickChipOn: { backgroundColor: C.accent, borderColor: C.accent },
  pickChipText: { fontFamily: F.semi, fontSize: 14 },
  fieldTab: {
    minWidth: 64,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
    alignItems: 'center',
  },
  fieldTabOn: { backgroundColor: C.brand, borderColor: C.brand },
  fieldTabText: { fontFamily: F.display, fontSize: 20, color: C.ink },
  tabBadge: {
    position: 'absolute',
    top: -7,
    right: -7,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: C.att,
    borderWidth: 2,
    borderColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.accentSoft,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  pasteBox: { minHeight: 110, textAlignVertical: 'top', fontSize: 13 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateBtnText: { fontFamily: F.semi, fontSize: 15 },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  calCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calTitle: { fontFamily: F.display, fontSize: 22, color: C.ink },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calWeek: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 12,
    fontFamily: F.bold,
    color: C.muted,
    paddingVertical: 4,
  },
  calCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  calOn: { backgroundColor: C.accent },
  calToday: { borderWidth: 1.5, borderColor: C.gold },
  calDay: { fontFamily: F.semi, fontSize: 15 },
  photoRow: { flexDirection: 'row', gap: 8 },
  thumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: C.sunk },
  thumbX: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.accent,
    backgroundColor: C.surface,
  },
  photoBtnText: { fontFamily: F.semi, color: C.accent },
  photoView: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBig: { width: '94%', height: '80%' },
  photoClose: { color: '#fff', marginTop: 10 },
  rcardCol: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  setHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ddBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ddText: { flex: 1, fontFamily: F.semi, fontSize: 15 },
  ddCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  ddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  ddRowOn: { backgroundColor: C.accentSoft },
  selBar: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    padding: 12,
    ...SHADOW,
  },
  actGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actTile: {
    width: '48.8%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  actTileText: { flex: 1, fontSize: 12, fontFamily: F.semi },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.bg,
  },
  switchRowOn: { borderColor: C.att, backgroundColor: C.attBg },
});
