const HOURS_PER_YEAR = 9 * 22 * 12; // 2376

function parseWorkingHours(wh) {
  if (!wh) return { start: '09:00', end: '18:00' };
  if (typeof wh === 'object' && wh.start) {
    return { start: wh.start.substring(0, 5), end: wh.end.substring(0, 5) };
  }
  if (typeof wh === 'string') {
    const parts = wh.split('-');
    if (parts.length !== 2) return { start: '09:00', end: '18:00' };
    const padTime = (t) => {
      t = t.trim();
      if (t.includes(':')) return t;
      return `${t.padStart(2, '0')}:00`;
    };
    return { start: padTime(parts[0]), end: padTime(parts[1]) };
  }
  return { start: '09:00', end: '18:00' };
}

function toAnnualINR(raw) {
  if (raw.salary_LPA != null) return raw.salary_LPA * 100000;
  if (raw.annual_ctc_inr != null) return raw.annual_ctc_inr;
  if (raw.hourly_rate_inr != null) return raw.hourly_rate_inr * HOURS_PER_YEAR;
  return null;
}

export function flattenEmployee(raw) {
  // Schema C: meta-nested (E009, E010)
  if (raw.meta) {
    const annual = raw.meta.compensation?.annual ?? null;
    const hourly = annual ? annual / HOURS_PER_YEAR : null;
    return {
      id: String(raw.employee_id || '').toUpperCase(),
      name: raw.name,
      department: raw.department,
      role: raw.meta.role,
      annual_ctc_inr: annual,
      hourly_rate_inr: hourly,
      tenure_months: raw.meta.tenure_months,
      working_hours: parseWorkingHours(raw.meta.working_hours),
      status: (raw.status || 'active').toLowerCase(),
      terminated_on: raw.terminated_on || null,
    };
  }

  // Schema A (old caps): EmployeeID, Name, Dept, Role, salary_LPA, tenureMonths, workingHours
  // Schema B (new): employee_id, name, department, role, annual_ctc_inr|hourly_rate_inr, tenure_months, working_hours
  const id = String(raw.EmployeeID || raw.employee_id || '').toUpperCase();
  const annual = toAnnualINR(raw);
  const hourly = annual ? annual / HOURS_PER_YEAR : null;

  return {
    id,
    name: raw.Name || raw.name || null,
    department: raw.Dept || raw.department || null,
    role: raw.Role || raw.role || null,
    annual_ctc_inr: annual,
    hourly_rate_inr: hourly,
    tenure_months: raw.tenureMonths ?? raw.tenure_months ?? null,
    working_hours: parseWorkingHours(raw.workingHours ?? raw.working_hours),
    status: String(raw.Status || raw.status || 'active').toLowerCase(),
    terminated_on: raw.terminated_on || null,
  };
}

export function buildEmployeeMap(employeesJson) {
  const raw = employeesJson.employees || [];
  const audit = {
    duplicate_resolved: [],
    no_activity_employees: [],
  };

  // First pass: flatten all
  const flat = raw.map(flattenEmployee);

  // Deduplicate: keep the one with higher annual_ctc_inr for duplicates
  const map = {};
  for (const emp of flat) {
    if (!emp.id) continue;
    if (map[emp.id]) {
      const existing = map[emp.id];
      const existingAnnual = existing.annual_ctc_inr || 0;
      const newAnnual = emp.annual_ctc_inr || 0;
      if (newAnnual > existingAnnual) {
        map[emp.id] = emp;
        audit.duplicate_resolved.push({
          id: emp.id,
          kept: `${emp.role} @ ₹${newAnnual.toLocaleString('en-IN')}`,
          dropped: `${existing.role} @ ₹${existingAnnual.toLocaleString('en-IN')}`,
        });
      } else {
        audit.duplicate_resolved.push({
          id: emp.id,
          kept: `${existing.role} @ ₹${existingAnnual.toLocaleString('en-IN')}`,
          dropped: `${emp.role} @ ₹${newAnnual.toLocaleString('en-IN')}`,
        });
      }
    } else {
      map[emp.id] = emp;
    }
  }

  return { employeeMap: map, audit };
}

export function joinData(activityRows, employeeMap) {
  const ghostEmployees = new Set();
  const activeEmployeeIds = new Set();

  const joined = activityRows.map((row) => {
    const emp = employeeMap[row.employee_id];
    if (!emp) {
      ghostEmployees.add(row.employee_id);
      return { ...row, metadata_missing: true, employee: null };
    }
    activeEmployeeIds.add(row.employee_id);
    return { ...row, metadata_missing: false, employee: emp };
  });

  // Find no-activity employees
  const noActivityEmployees = Object.keys(employeeMap).filter(
    (id) => !activeEmployeeIds.has(id)
  );

  return { joined, ghostEmployees: [...ghostEmployees], noActivityEmployees };
}
