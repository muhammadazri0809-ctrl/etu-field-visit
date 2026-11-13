import { showDate } from './dates';
import { ACTIVITIES, COSTS, LIMITS, RANK, actStatus, checkOf, costOf, isOverdue, latestFieldVisit, money, no2, pctText, variance, yieldStatus, yieldVar } from './rules';

// =====================================================
// ALL TRIGGERS FOR ONE FIELD
// =====================================================
export function fieldTriggers(f, visits, actions) {
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
export const ALL = '__all__';

export function uniq(list) {
  return [...new Set(list.filter(Boolean))].sort();
}

// Estates that match the chosen Region and SOU
export function estatesIn(estates, sel) {
  return estates.filter(
    (e) => (!sel.region || e.region === sel.region) && (!sel.sou || e.sou === sel.sou)
  );
}
