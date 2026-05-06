import { parse, parseISO, isValid } from 'date-fns';

export function parseTimestamp(raw) {
  if (!raw) return null;
  const s = String(raw).trim();

  // ISO with T: 2025-10-17T13:21:23
  let d = parseISO(s);
  if (isValid(d)) return d;

  // ISO without T: 2025-10-08 13:46:09
  d = parse(s, 'yyyy-MM-dd HH:mm:ss', new Date());
  if (isValid(d)) return d;

  // ISO without T, no seconds: 2025-10-08 13:46
  d = parse(s, 'yyyy-MM-dd HH:mm', new Date());
  if (isValid(d)) return d;

  // DD/MM/YYYY HH:mm: 21/10/2025 14:44
  d = parse(s, 'dd/MM/yyyy HH:mm', new Date());
  if (isValid(d)) return d;

  // DD/MM/YYYY HH:mm:ss
  d = parse(s, 'dd/MM/yyyy HH:mm:ss', new Date());
  if (isValid(d)) return d;

  return null;
}
