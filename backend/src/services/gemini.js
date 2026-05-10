import axios from 'axios';

let SYSTEM_PROMPT = '';

export function buildSystemPrompt(metrics) {
  const empWeeklyLines = metrics.per_employee.map(e => {
    const trend = e.weekly_trend.map(w => `Wk${w.week}: ${w.rep.toFixed(1)}h rep/${w.total.toFixed(1)}h total`).join(', ');
    const first = e.weekly_trend[0]?.rep || 0;
    const last = e.weekly_trend[e.weekly_trend.length - 1]?.rep || 0;
    const wkChange = last - first;
    return `  ${e.name} (${e.id}, ${e.dept}, ${e.role}): overall_rep%=${e.rep_pct}%, [${trend}], WoW_rep_change=${wkChange >= 0 ? '+' : ''}${wkChange.toFixed(1)}h`;
  }).join('\n');

  SYSTEM_PROMPT = `You are Workforce Pulse AI — a sharp, data-grounded analytics assistant for a COO.
You have access to normalized employee activity data from October–November 2025.

DATASET FACTS — cite ONLY these exact numbers, never invent:
- Valid activity rows: ${metrics.audit?.rows_valid || 'N/A'}
- Date range: ${metrics.dateRange.start} to ${metrics.dateRange.end}
- Total hours logged: ${metrics.headline.total_hours.toFixed(1)} hrs
- Repetitive hours: ${metrics.headline.repetitive_hours.toFixed(1)} hrs (${metrics.headline.repetitive_pct.toFixed(1)}%)
- Recoverable hours/month: ${metrics.headline.recoverable_hours_per_month.toFixed(1)} hrs
- Recoverable INR/month: ₹${Math.round(metrics.headline.recoverable_inr_per_month).toLocaleString('en-IN')}

TOP TASK CATEGORIES (sorted by automation score):
${JSON.stringify(metrics.by_task_category.slice(0, 12).map(t => ({
  task: t.name, total_hours: t.total_hours, rep_hours: t.rep_hours,
  rep_pct: t.rep_pct, employees: t.employee_count,
  cost_per_month_inr: t.cost_per_month, automation_score: t.automation_score,
})), null, 2)}

BY DEPARTMENT:
${JSON.stringify(metrics.by_department.map(d => ({
  dept: d.name, total_hours: d.total_hours, rep_hours: d.rep_hours,
  rep_pct: d.rep_pct, employees: d.employee_count, cost_per_month_inr: d.cost_per_month,
})), null, 2)}

PER-EMPLOYEE WITH WEEKLY REPETITIVE TREND:
${empWeeklyLines}

PER-EMPLOYEE DETAILED:
${JSON.stringify(metrics.per_employee.map(e => ({
  id: e.id, name: e.name, dept: e.dept, role: e.role,
  total_hours: e.total_hours, rep_hours: e.rep_hours, rep_pct: e.rep_pct,
  top_rep_tasks: e.top_rep_tasks?.slice(0, 3),
  hourly_rate_inr: e.hourly_rate,
  annual_ctc_inr: e.annual_ctc,
  status: e.status, metadata_missing: e.metadata_missing,
})), null, 2)}

ANOMALIES:
${JSON.stringify(metrics.anomalies, null, 2)}

STRICT RULES:
1. ONLY cite numbers explicitly present above. NEVER estimate or invent.
2. If unanswerable from this data, say: "I don't have that detail in the dataset."
3. End EVERY response with: [Source: <specific metric>, ${metrics.dateRange.start}–${metrics.dateRange.end}]
4. Multi-turn: use conversation history. Follow-ups like "break that down by department" refer to your previous answer.
5. Format rupees as ₹X,XX,XXX. Max 250 words unless asked for more detail.
6. When listing employees, include their ID, department, and the exact cited figure.`.trim();
}

export async function chatWithGemini(messages) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const response = await axios.post(url, {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: {
      temperature: 0.15,
      maxOutputTokens: 1000,
    },
  });

  const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}
