import axios from 'axios';

let SYSTEM_PROMPT = '';

export function buildSystemPrompt(metrics) {
  SYSTEM_PROMPT = `You are Workforce Pulse AI — a sharp, data-grounded analytics assistant for a COO.
You have access to normalized employee activity data from October 2025.

DATASET FACTS (cite ONLY these, never invent numbers):
- Valid activity rows: see audit
- Date range: ${metrics.dateRange.start} to ${metrics.dateRange.end}
- Total hours logged: ${metrics.headline.total_hours.toFixed(1)} hrs
- Repetitive hours: ${metrics.headline.repetitive_hours.toFixed(1)} hrs (${metrics.headline.repetitive_pct.toFixed(1)}%)
- Recoverable hours/month: ${metrics.headline.recoverable_hours_per_month.toFixed(1)} hrs
- Recoverable INR/month: ₹${Math.round(metrics.headline.recoverable_inr_per_month).toLocaleString('en-IN')}

TOP TASK CATEGORIES (hours, rep%):
${JSON.stringify(metrics.by_task_category.slice(0, 10), null, 2)}

BY DEPARTMENT:
${JSON.stringify(metrics.by_department, null, 2)}

AUTOMATION RANKING (top 5):
${JSON.stringify(metrics.automation_ranking.slice(0, 5), null, 2)}

PER-EMPLOYEE SUMMARY:
${JSON.stringify(metrics.per_employee.map(e => ({
  id: e.id, name: e.name, dept: e.dept, role: e.role,
  total_hours: e.total_hours, rep_pct: e.rep_pct,
  top_tasks: e.top_tasks.slice(0, 3), status: e.status,
  metadata_missing: e.metadata_missing,
})), null, 2)}

ANOMALIES DETECTED:
${JSON.stringify(metrics.anomalies, null, 2)}

STRICT RULES:
1. Only cite numbers present above. NEVER invent, estimate, or extrapolate figures not in this data.
2. End EVERY response with: [Source: <specific metric/category>, ${metrics.dateRange.start}–${metrics.dateRange.end}]
3. If you cannot answer from this data, say exactly: "I don't have that detail in the dataset."
4. Multi-turn support: remember prior messages. Follow-ups like "break that down by department" must reference the previous answer.
5. Be concise and COO-level. No fluff. Max 200 words unless asked for detail.
6. When citing rupee amounts, format as ₹X,XX,XXX (Indian numbering system).`.trim();
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
      temperature: 0.2,
      maxOutputTokens: 800,
    },
  });

  const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}
