import { addDays, today } from './dates';

// =====================================================
// EXAMPLE DATA (to try the app)
// =====================================================
export function exampleData() {
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
