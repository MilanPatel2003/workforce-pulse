import { format, min, max } from 'date-fns';

const AUTOMATION_FACTOR = 0.70;
const WEEKS_IN_DATASET = 4;
const AVG_WEEKS_PER_MONTH = 4.33;

function stddev(arr) {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.map((x) => (x - mean) ** 2).reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(variance);
}

export function computeMetrics(rows, employeeMap, audit) {
  // Date range
  const timestamps = rows.map((r) => r.timestamp).filter(Boolean);
  const dateStart = timestamps.length ? format(min(timestamps), 'MMM d, yyyy') : 'N/A';
  const dateEnd = timestamps.length ? format(max(timestamps), 'MMM d, yyyy') : 'N/A';

  // Headline numbers
  const validRep = rows.filter((r) => r.is_repetitive === true);
  const totalMinutes = rows.reduce((s, r) => s + r.duration_minutes, 0);
  const repMinutes = validRep.reduce((s, r) => s + r.duration_minutes, 0);
  const totalHours = totalMinutes / 60;
  const repHours = repMinutes / 60;
  const recoverableHoursPerMonth =
    (repMinutes * AUTOMATION_FACTOR) / 60 / WEEKS_IN_DATASET * AVG_WEEKS_PER_MONTH;

  // INR recoverable
  const repWithSalary = validRep.filter((r) => r.employee?.hourly_rate_inr);
  const repCostTotal = repWithSalary.reduce(
    (s, r) => s + (r.duration_minutes / 60) * r.employee.hourly_rate_inr,
    0
  );
  const recoverableINRPerMonth =
    (repCostTotal * AUTOMATION_FACTOR) / WEEKS_IN_DATASET * AVG_WEEKS_PER_MONTH;

  // By task category
  const taskMap = {};
  for (const r of rows) {
    const t = r.task_category;
    if (!taskMap[t]) {
      taskMap[t] = {
        name: t,
        total_minutes: 0,
        rep_minutes: 0,
        cost: 0,
        rep_cost: 0,
        employees: new Set(),
      };
    }
    taskMap[t].total_minutes += r.duration_minutes;
    if (r.is_repetitive === true) taskMap[t].rep_minutes += r.duration_minutes;
    taskMap[t].employees.add(r.employee_id);
    const hourly = r.employee?.hourly_rate_inr || 0;
    const rowCost = (r.duration_minutes / 60) * hourly;
    taskMap[t].cost += rowCost;
    if (r.is_repetitive === true) taskMap[t].rep_cost += rowCost;
  }

  const totalAllMinutes = totalMinutes || 1;
  const maxCost = Math.max(...Object.values(taskMap).map((t) => t.rep_cost)) || 1;

  const byTask = Object.values(taskMap).map((t) => {
    const repRate = t.total_minutes > 0 ? t.rep_minutes / t.total_minutes : 0;
    const empConc = t.employees.size / Math.max(Object.keys(employeeMap).length, 1);
    const volPct = t.total_minutes / totalAllMinutes;
    const costPct = t.rep_cost / maxCost;
    const score = (volPct * 0.35 + repRate * 0.30 + empConc * 0.20 + costPct * 0.15) * 100;
    return {
      name: t.name,
      total_hours: +(t.total_minutes / 60).toFixed(2),
      rep_hours: +(t.rep_minutes / 60).toFixed(2),
      rep_rate: +repRate.toFixed(3),
      rep_pct: +(repRate * 100).toFixed(1),
      cost_per_month:
        +((t.rep_cost * AUTOMATION_FACTOR) / WEEKS_IN_DATASET * AVG_WEEKS_PER_MONTH).toFixed(0),
      employee_count: t.employees.size,
      automation_score: +score.toFixed(1),
    };
  }).sort((a, b) => b.automation_score - a.automation_score);

  // By app
  const appMap = {};
  for (const r of rows) {
    const a = r.app_used;
    if (!appMap[a]) appMap[a] = { name: a, total_minutes: 0, rep_minutes: 0, employees: new Set(), cost: 0 };
    appMap[a].total_minutes += r.duration_minutes;
    if (r.is_repetitive === true) appMap[a].rep_minutes += r.duration_minutes;
    appMap[a].employees.add(r.employee_id);
    appMap[a].cost += (r.duration_minutes / 60) * (r.employee?.hourly_rate_inr || 0);
  }
  const byApp = Object.values(appMap).map((a) => ({
    name: a.name,
    total_hours: +(a.total_minutes / 60).toFixed(2),
    rep_hours: +(a.rep_minutes / 60).toFixed(2),
    rep_pct: +(a.total_minutes > 0 ? (a.rep_minutes / a.total_minutes) * 100 : 0).toFixed(1),
    employee_count: a.employees.size,
  })).sort((a, b) => b.total_hours - a.total_hours);

  // By department
  const deptMap = {};
  for (const r of rows) {
    const d = r.department || r.employee?.department || 'Unknown';
    if (!deptMap[d]) deptMap[d] = { name: d, total_minutes: 0, rep_minutes: 0, employees: new Set(), cost: 0 };
    deptMap[d].total_minutes += r.duration_minutes;
    if (r.is_repetitive === true) deptMap[d].rep_minutes += r.duration_minutes;
    deptMap[d].employees.add(r.employee_id);
    deptMap[d].cost += (r.duration_minutes / 60) * (r.employee?.hourly_rate_inr || 0);
  }
  const byDept = Object.values(deptMap).map((d) => ({
    name: d.name,
    total_hours: +(d.total_minutes / 60).toFixed(2),
    rep_hours: +(d.rep_minutes / 60).toFixed(2),
    rep_pct: +(d.total_minutes > 0 ? (d.rep_minutes / d.total_minutes) * 100 : 0).toFixed(1),
    employee_count: d.employees.size,
    cost_per_month: +((d.cost * AUTOMATION_FACTOR) / WEEKS_IN_DATASET * AVG_WEEKS_PER_MONTH).toFixed(0),
  })).sort((a, b) => b.total_hours - a.total_hours);

  // Weekly trend — dynamic week numbers from relative bucketing
  const allWeeks = [...new Set(rows.map(r => r.week))].sort((a, b) => a - b);
  const top5Tasks = byTask.slice(0, 5).map((t) => t.name);
  const weeklyData = { weeks: allWeeks, series: [] };
  for (const taskName of top5Tasks) {
    const values = allWeeks.map((w) => {
      const mins = rows
        .filter((r) => r.task_category === taskName && r.week === w)
        .reduce((s, r) => s + r.duration_minutes, 0);
      return +(mins / 60).toFixed(2);
    });
    weeklyData.series.push({ task: taskName, values });
  }

  // Per-department weekly series (for dept-filtered trend)
  const deptWeeklyMap = {};
  for (const r of rows) {
    const dept = r.department || r.employee?.department || 'Unknown';
    if (!deptWeeklyMap[dept]) deptWeeklyMap[dept] = {};
    const w = r.week;
    if (!deptWeeklyMap[dept][w]) deptWeeklyMap[dept][w] = { total: 0, rep: 0 };
    deptWeeklyMap[dept][w].total += r.duration_minutes;
    if (r.is_repetitive === true) deptWeeklyMap[dept][w].rep += r.duration_minutes;
  }
  const deptWeeklySeries = {};
  for (const [dept, weekMap] of Object.entries(deptWeeklyMap)) {
    deptWeeklySeries[dept] = allWeeks.map(w => ({
      week: w,
      total_hours: +((weekMap[w]?.total || 0) / 60).toFixed(2),
      rep_hours: +((weekMap[w]?.rep || 0) / 60).toFixed(2),
    }));
  }

  // Per-employee
  const empRows = {};
  for (const r of rows) {
    if (!empRows[r.employee_id]) empRows[r.employee_id] = [];
    empRows[r.employee_id].push(r);
  }
  const perEmployee = Object.entries(empRows).map(([id, empR]) => {
    const emp = empR[0].employee;
    const totalMins = empR.reduce((s, r) => s + r.duration_minutes, 0);
    const repMins = empR.filter((r) => r.is_repetitive === true).reduce((s, r) => s + r.duration_minutes, 0);

    // Top REPETITIVE tasks (fix: was total hours, now rep hours)
    const repTaskCounts = {};
    const totalTaskCounts = {};
    for (const r of empR) {
      totalTaskCounts[r.task_category] = (totalTaskCounts[r.task_category] || 0) + r.duration_minutes;
      if (r.is_repetitive === true) {
        repTaskCounts[r.task_category] = (repTaskCounts[r.task_category] || 0) + r.duration_minutes;
      }
    }
    const topRepTasks = Object.entries(repTaskCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, mins]) => ({ name, rep_hours: +(mins / 60).toFixed(2) }));

    const topTasks = Object.entries(totalTaskCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, mins]) => ({ name, hours: +(mins / 60).toFixed(2) }));

    // Weekly trend using dynamic week numbers
    const weeklyRep = allWeeks.map((w) => {
      const wr = empR.filter((r) => r.week === w);
      const wTotal = wr.reduce((s, r) => s + r.duration_minutes, 0);
      const wRep = wr.filter((r) => r.is_repetitive === true).reduce((s, r) => s + r.duration_minutes, 0);
      return { week: w, total: +(wTotal / 60).toFixed(2), rep: +(wRep / 60).toFixed(2) };
    });
    return {
      id,
      name: emp?.name || id,
      dept: emp?.department || empR[0].department || 'Unknown',
      role: emp?.role || 'Unknown',
      total_hours: +(totalMins / 60).toFixed(2),
      rep_hours: +(repMins / 60).toFixed(2),
      rep_pct: +(totalMins > 0 ? (repMins / totalMins) * 100 : 0).toFixed(1),
      top_tasks: topTasks,
      top_rep_tasks: topRepTasks,
      hourly_rate: emp?.hourly_rate_inr ? +emp.hourly_rate_inr.toFixed(2) : null,
      annual_ctc: emp?.annual_ctc_inr || null,
      status: emp?.status || 'active',
      metadata_missing: empR[0].metadata_missing,
      weekly_trend: weeklyRep,
    };
  }).sort((a, b) => b.rep_pct - a.rep_pct);

  // Role averages for comparison
  const roleGroups = {};
  for (const e of perEmployee) {
    if (!roleGroups[e.role]) roleGroups[e.role] = [];
    roleGroups[e.role].push(e.rep_pct);
  }
  const roleAvgRepPct = {};
  for (const [role, vals] of Object.entries(roleGroups)) {
    roleAvgRepPct[role] = +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  }

  // Anomalies
  const repShares = perEmployee.map((e) => e.rep_pct);
  const meanRep = repShares.reduce((a, b) => a + b, 0) / (repShares.length || 1);
  const sdRep = stddev(repShares);
  const threshold = meanRep + 1.5 * sdRep;

  const anomalies = [];

  // Terminated employee activity
  const terminatedWithActivity = perEmployee.filter((e) => e.status === 'terminated');
  for (const e of terminatedWithActivity) {
    anomalies.push({
      type: 'terminated_activity',
      employee_id: e.id,
      employee_name: e.name,
      description: `${e.name} (${e.id}) was terminated but has ${empRows[e.id]?.length || 0} activity records logged.`,
      severity: 'high',
      recommendation: 'Audit access logs. Ensure offboarding revoked system access.',
    });
  }

  // High repetitive share outliers
  for (const e of perEmployee) {
    if (e.rep_pct > threshold && !terminatedWithActivity.find((t) => t.id === e.id)) {
      anomalies.push({
        type: 'high_repetitive_share',
        employee_id: e.id,
        employee_name: e.name,
        description: `${e.name} spends ${e.rep_pct.toFixed(0)}% of their time on repetitive tasks (team avg: ${meanRep.toFixed(0)}%).`,
        severity: 'medium',
        recommendation: `${e.name}'s workflow is a high-priority automation candidate.`,
      });
    }
  }

  // Ghost employees
  for (const id of audit.ghost_employees) {
    anomalies.push({
      type: 'ghost_employee',
      employee_id: id,
      employee_name: id,
      description: `${id} has activity records but no employee metadata. Cannot calculate cost impact.`,
      severity: 'medium',
      recommendation: 'Check if this is a contractor or system account.',
    });
  }

  // Sessions > 300 min
  const longSessions = rows.filter((r) => r.duration_minutes >= 300);
  if (longSessions.length > 0) {
    anomalies.push({
      type: 'long_sessions',
      employee_id: null,
      employee_name: null,
      description: `${longSessions.length} session(s) exceed 5 hours on a single task.`,
      severity: 'low',
      recommendation: 'Review if duration logging is accurate for these sessions.',
    });
  }

  return {
    dateRange: { start: dateStart, end: dateEnd },
    headline: {
      total_hours: +totalHours.toFixed(2),
      repetitive_hours: +repHours.toFixed(2),
      repetitive_pct: +(totalHours > 0 ? (repHours / totalHours) * 100 : 0).toFixed(1),
      recoverable_hours_per_month: +recoverableHoursPerMonth.toFixed(1),
      recoverable_inr_per_month: +recoverableINRPerMonth.toFixed(0),
      methodology: `Repetitive task hours (${repHours.toFixed(1)} hrs) × 70% automation factor ÷ ${WEEKS_IN_DATASET} weeks × ${AVG_WEEKS_PER_MONTH} avg weeks/month. INR calculated using each employee's hourly rate (annual CTC ÷ 2,376 working hours/year). 70% factor = typical RPA automation yield; 30% retained for exceptions and oversight.`,
      rows_with_salary_excluded: validRep.length - repWithSalary.length,
    },
    by_task_category: byTask,
    by_app: byApp,
    by_department: byDept,
    automation_ranking: byTask,
    weekly_trend: weeklyData,
    dept_weekly_series: deptWeeklySeries,
    all_weeks: allWeeks,
    per_employee: perEmployee,
    role_avg_rep_pct: roleAvgRepPct,
    anomalies,
  };
}