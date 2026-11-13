import { showDate } from './dates';
import { ACTIVITIES, LIMITS, STATUS, actStatus, checkOf, costAlerts, countIn, estateCost, findings, no2, pctText, profitVar, yieldVar } from './rules';

// ===== WHATSAPP / EMAIL VISIT REPORT =====
export function visitReport(visit, estate, fields, actions) {
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
