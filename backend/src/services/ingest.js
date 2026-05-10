import { createReadStream, readFileSync } from 'fs';
import { parse } from 'csv-parse';
import { normalizeRow } from './normalize.js';
import { buildEmployeeMap, joinData } from './join.js';

export async function ingestCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    const audit = {
      rows_raw: 0,
      rows_dropped: 0,
      rows_capped: 0,
      drop_reasons: {},
    };

    createReadStream(filePath)
      .pipe(parse({ columns: true, trim: true, skip_empty_lines: true }))
      .on('data', (raw) => {
        audit.rows_raw++;
        const { row, reason } = normalizeRow(raw);
        if (!row) {
          audit.rows_dropped++;
          audit.drop_reasons[reason] = (audit.drop_reasons[reason] || 0) + 1;
        } else {
          if (row._flags.includes('duration_capped')) audit.rows_capped++;
          rows.push(row);
        }
      })
      .on('end', () => {
        // Assign relative week numbers from the earliest timestamp
        if (rows.length > 0) {
          const minTs = Math.min(...rows.map(r => r.timestamp.getTime()))
          const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000
          for (const row of rows) {
            row.week = Math.floor((row.timestamp.getTime() - minTs) / MS_PER_WEEK) + 1
          }
        }
        resolve({ rows, audit })
      })
      .on('error', reject);
  });
}

export function ingestEmployees(filePath) {
  const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
  return buildEmployeeMap(raw);
}

export async function buildDataset(csvPath, jsonPath) {
  const [csvResult, empResult] = await Promise.all([
    ingestCSV(csvPath),
    Promise.resolve(ingestEmployees(jsonPath)),
  ]);

  const { joined, ghostEmployees, noActivityEmployees } = joinData(
    csvResult.rows,
    empResult.employeeMap
  );

  const audit = {
    ...csvResult.audit,
    rows_valid: joined.length,
    employees_in_json: Object.keys(empResult.employeeMap).length,
    employees_in_csv: new Set(csvResult.rows.map((r) => r.employee_id)).size,
    ghost_employees: ghostEmployees,
    no_activity_employees: noActivityEmployees,
    duplicate_resolved: empResult.audit.duplicate_resolved,
    terminated_employees: joined
      .filter((r) => r.employee?.status === 'terminated')
      .map((r) => r.employee_id)
      .filter((v, i, a) => a.indexOf(v) === i),
  };

  return { rows: joined, employeeMap: empResult.employeeMap, audit };
}