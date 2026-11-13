import {
  ACTIVITIES, DEFAULT_LIMITS, LIMITS, applySettings, estateCost, estateYield, evaluate,
  pctText, rmMil, sortActions, variance, yieldStatus,
} from '../rules';
import { addDays, showDate } from '../dates';

afterEach(() => applySettings({}));

describe('evaluate (trigger readings)', () => {
  const higherIsWorse = { op: '>', amber: 15, red: 30 };
  const lowerIsWorse = { op: '<', amber: 90, red: 80 };

  test('bigger is worse', () => {
    expect(evaluate(higherIsWorse, '10')).toBe('good');
    expect(evaluate(higherIsWorse, '15')).toBe('good');
    expect(evaluate(higherIsWorse, '20')).toBe('monitor');
    expect(evaluate(higherIsWorse, '31')).toBe('action');
  });
  test('smaller is worse', () => {
    expect(evaluate(lowerIsWorse, '95')).toBe('good');
    expect(evaluate(lowerIsWorse, '85')).toBe('monitor');
    expect(evaluate(lowerIsWorse, '70')).toBe('action');
  });
  test('yes/no rule', () => {
    expect(evaluate({ op: 'yes' }, 'yes')).toBe('action');
    expect(evaluate({ op: 'yes' }, 'no')).toBe('good');
    expect(evaluate({ op: 'yes' }, '')).toBeNull();
  });
  test('blank or text reading gives no result', () => {
    expect(evaluate(higherIsWorse, '')).toBeNull();
    expect(evaluate(higherIsWorse, undefined)).toBeNull();
    expect(evaluate(higherIsWorse, 'abc')).toBeNull();
  });
});

describe('applySettings', () => {
  test('uses Settings numbers, falls back to defaults', () => {
    const rule = ACTIVITIES.flatMap((a) => a.rules).find((r) => r.op !== 'yes');
    const red = rule.red;
    applySettings({ cost: '25', rules: { [rule.id]: { red: '99' } } });
    expect(LIMITS.cost).toBe(25);
    expect(rule.red).toBe(99);
    applySettings({});
    expect(LIMITS.cost).toBe(DEFAULT_LIMITS.cost);
    expect(rule.red).toBe(red);
  });
});

describe('numbers', () => {
  test('variance', () => {
    expect(variance('110', '100')).toBeCloseTo(10);
    expect(variance('', '100')).toBeNull();
    expect(variance('5', '0')).toBeNull();
  });
  test('pctText', () => {
    expect(pctText(12.345)).toBe('+12.3%');
    expect(pctText(-4)).toBe('-4.0%');
    expect(pctText(null)).toBe('-');
  });
  test('rmMil (RM thousand -> RM mil)', () => {
    expect(rmMil('16260')).toBe('RM 16.26 mil');
    expect(rmMil('1234567')).toBe('RM 1,234.57 mil');
    expect(rmMil('')).toBe('-');
  });
});

describe('estate roll-ups weighted by mature ha', () => {
  const fields = [
    { ha: '100', ypAct: '20', ypBgt: '25', costs: { 0: { act: '300', bgt: '200' } } },
    { ha: '300', ypAct: '24', ypBgt: '25', costs: { 0: { act: '100', bgt: '200' } } },
    { ha: '', ypAct: '99', ypBgt: '1', costs: { 0: { act: '9999', bgt: '1' } } },
  ];
  test('estateCost', () => {
    const c = estateCost(fields).costs[0];
    expect(Number(c.act)).toBeCloseTo(150);
    expect(Number(c.bgt)).toBeCloseTo(200);
    expect(estateCost(fields).costs[1]).toEqual({ act: '', bgt: '' });
  });
  test('estateYield', () => {
    const y = estateYield(fields);
    expect(y.act).toBeCloseTo(23);
    expect(y.bgt).toBeCloseTo(25);
    expect(y.ha).toBe(400);
    expect(estateYield([])).toBeNull();
  });
  test('yieldStatus follows LIMITS', () => {
    expect(yieldStatus({ ypAct: '24', ypBgt: '25' })).toBe('good'); // -4%
    expect(yieldStatus({ ypAct: '23', ypBgt: '25' })).toBe('monitor'); // -8%
    expect(yieldStatus({ ypAct: '20', ypBgt: '25' })).toBe('action'); // -20%
  });
});

test('sortActions: open first, then by due date', () => {
  const out = sortActions([
    { id: 'a', status: 'done', due: '2026-01-01' },
    { id: 'b', status: 'open', due: '2026-03-01' },
    { id: 'c', status: 'open', due: '2026-02-01' },
  ]);
  expect(out.map((x) => x.id)).toEqual(['c', 'b', 'a']);
});

test('dates', () => {
  expect(addDays('2026-02-27', 2)).toBe('2026-03-01');
  expect(showDate('2026-11-03')).toBe('3 Nov 2026');
  expect(showDate('')).toBe('-');
});
