

// ===== HELPERS: dates =====
export const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function toKey(d) {
  return (
    d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

export function today() {
  return toKey(new Date());
}

export function addDays(key, n) {
  const d = new Date(key + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function showDate(key) {
  if (!key || key.length < 10) return key || '-';
  const p = key.split('-');
  return Number(p[2]) + ' ' + MONTHS[Number(p[1]) - 1] + ' ' + p[0];
}

export function newId() {
  return Date.now().toString() + Math.random().toString(36).slice(2, 5);
}

