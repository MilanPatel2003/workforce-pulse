import { APP_MAP, TASK_MAP } from '../utils/canonicalMaps.js';
import { parseTimestamp } from '../utils/timestampParser.js';

const TRUTHY = new Set(['true', '1', 'yes']);
const FALSY = new Set(['false', '0', 'no', '-', 'na', 'n/a']);

function capitalize(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function normalizeRow(raw) {
  const flags = [];

  // employee_id
  const empId = String(raw.employee_id || '').trim().toUpperCase();
  if (!empId || empId === '?' || empId === '') return { row: null, reason: 'invalid_employee_id' };

  // timestamp
  const ts = parseTimestamp(raw.timestamp);
  if (!ts) return { row: null, reason: 'unparseable_timestamp' };

  // app_used
  const appRaw = String(raw.app_used || '').trim().toLowerCase();
  const app = APP_MAP[appRaw] || capitalize(String(raw.app_used || '').trim());
  if (!APP_MAP[appRaw]) flags.push('app_unmapped');

  // task_category
  const taskRaw = String(raw.task_category || '').trim().toLowerCase();
  const task = TASK_MAP[taskRaw] || capitalize(String(raw.task_category || '').trim());
  if (!TASK_MAP[taskRaw]) flags.push('task_unmapped');

  // duration
  const rawDur = raw.duration_minutes;
  if (rawDur === undefined || rawDur === null || rawDur === '') return { row: null, reason: 'missing_duration' };
  const dur = parseFloat(rawDur);
  if (isNaN(dur) || dur <= 0) return { row: null, reason: 'invalid_duration' };
  let duration = dur;
  if (dur > 480) { duration = 480; flags.push('duration_capped'); }

  // is_repetitive
  const boolRaw = String(raw.is_repetitive || '').trim().toLowerCase();
  let isRepetitive = null;
  if (TRUTHY.has(boolRaw)) isRepetitive = true;
  else if (FALSY.has(boolRaw)) isRepetitive = false;

  // week 1-4
  const week = Math.ceil(ts.getDate() / 7);

  return {
    row: {
      employee_id: empId,
      department: String(raw.department || '').trim(),
      timestamp: ts,
      week,
      app_used: app,
      task_category: task,
      duration_minutes: duration,
      is_repetitive: isRepetitive,
      _flags: flags,
    },
    reason: null,
  };
}
