# Workforce Pulse — Methodology & Assumptions

**Stack:** Node.js + Express (backend) · React 18 + Vite (frontend) · Recharts · Gemini 2.5 Flash · jsPDF + html2canvas
**Data:** `activity_logs.csv` (539 raw rows) + `employees.json` (16 records, 3 schema variants)

---

## 🚀 Live Deployment

- **GitHub Repository:** https://github.com/MilanPatel2003/workforce-pulse
- **Frontend (Live):** https://workforce-pulse.vercel.app/
- **Backend (API):** https://workforce-pulse.onrender.com

---

## 📊 Features & Dashboard Components

### Headline Numbers
**What:** Two key metrics at the top of the dashboard.
- **Recoverable Hours/Month:** Total hours that could be automated each month (based on repetitive tasks × 70% automation factor).
- **Cost Recoverable/Month:** Monetary value of those hours based on employee salaries in INR.

**Why it matters:** These are the primary business drivers. A COO uses these numbers to justify automation investment and measure potential ROI.

---

### Time-Sink Breakdown
**What:** Visual breakdown of where time is being spent. Toggle between three views:
- **By Task Category:** Email Triage, Reconciliation, Data Entry, etc.
- **By App:** Salesforce, Gmail, Slack, etc.
- **By Department:** Sales, Finance, HR, Operations, etc.

**Why it matters:** Identifies which tasks, tools, or departments consume the most time. Helps prioritize where automation efforts will have the biggest impact.

---

### Week-over-Week Trend
**What:** Line chart showing how the top 5 task categories changed over the 4-week dataset period.

**Why it matters:** Reveals whether repetitive task volume is growing, shrinking, or stable. A rising trend suggests increasing operational drag; a falling trend shows positive progress.

---

### Automation Priority Ranking
**What:** Ranked table of task categories, sorted by an **automation score** that combines:
- Volume (35% weight): How many total hours.
- Repetitiveness (30% weight): What % is marked as repetitive.
- Employee Concentration (20% weight): How many people do it (easier to automate if many people do it).
- Cost Impact (15% weight): How much it costs in employee hours.

**Why it matters:** Not all repetitive tasks are equal. Email Triage may be highly repetitive but spread across 1 person; Reconciliation might be moderate repetition but done by 10 people. This score balances all factors to show the **single highest-ROI automation candidate**.

**Action:** Click any row to filter the Employee Drilldown to see which employees are involved in that task.

---

### Employee Drilldown
**What:** A list of employees matching your current filters. Click an employee to see:
- **Repetitive % vs Role Average:** A comparison bar showing if they're above or below their peer group.
- **Top Tasks:** Bar chart of their most time-consuming tasks (filtered to the current filter context).
- **Weekly Activity Trend:** Line chart showing their total and repetitive hours week by week.

**Why it matters:** Moves from "what to automate" to "who is affected and how much." A COO can identify which employees would benefit most from automation and plan training or role transitions.

---

### Anomaly Callout
**What:** Highlights at least one governance or data quality risk, such as:
- Terminated employee with recent activity (E010): Security risk — access not revoked.
- Ghost employee (E013): Activity logged for an unknown person.
- Unusually high repetitive % for an individual: Potential burnout or role misalignment.

**Why it matters:** Surfaces hidden risks that require immediate attention, not just automation opportunities.

---

### Ingestion Report
**What:** Transparency into data cleaning. Shows:
- Rows dropped (and why: invalid timestamp, invalid duration, unknown employee).
- Employees in activity logs but not in HRMS (ghost employees).
- Employees in HRMS but with no activity.
- Duplicates resolved.

**Why it matters:** Builds trust. A COO can see exactly what data was used and how edge cases were handled.

---

### Theme Toggle (Light/Dark Mode)
**What:** Switch between dark and light color schemes.

**Why it matters:** Accessibility and user preference. Works across all components and the export PDF.

---

### AI Assistant
**What:** Conversational interface grounded in your normalized dataset. Ask questions like:
- "What's the single highest-ROI automation we should ship next?"
- "Who in Finance is spending the most time on email triage, and how much does it cost?"
- "Show me everyone whose repetitive-task share went up week-over-week."

**Why it matters:** Natural language queries let non-technical stakeholders extract insights without navigating charts. The AI cites the underlying data and remembers multi-turn conversations.

---

### Export PDF
**What:** One-page executive summary containing:
- Current filter state and date range.
- Both headline numbers (recoverable hours and cost).
- Top-5 automation opportunities ranked by score.

**Why it matters:** A COO can forward the PDF to stakeholders or include it in board presentations without additional work.

---

## Cross-Filters
**Department Filter** (sidebar): Click a department to narrow all charts to that team.  
**Task Category Filter** (click a row in Automation Ranking): Narrows the Employee Drilldown to employees involved in that task.

Both filters stack, so you can filter by department AND task category together to drill down deeply.

---

## Files & Assumptions

### activity_logs.csv
- **Timezone:** All timestamps parsed to IST. Three formats handled: ISO with T, ISO without T, DD/MM/YYYY HH:MM. Unparseable timestamps → row dropped.
- **Duration outliers:** Rows ≤ 0 dropped (includes negatives and zeros). Rows > 480 min capped at 480 and flagged. Rationale: 8 hours is the maximum plausible single-session duration.
- **is_repetitive nulls:** 11 raw spellings normalized. Unrecognized values → `null` (excluded from repetitive calc, included in total hours). Conservative: does not inflate the automation opportunity.
- **Unknown `employee_id` "?":** Dropped. Cannot be attributed to any employee.
- **App/task normalization:** ~31 raw app values → 10 canonical names; ~42 raw task values → 14 canonical categories, all via lowercase lookup maps before any aggregation.

### employees.json
- **3 schema variants flattened:** Schema A (old caps fields), Schema B (new snake_case), Schema C (meta-nested; E009 and E010).
- **Compensation → Annual INR:** `salary_LPA × 100,000` | `annual_ctc_inr` as-is | `hourly_rate_inr × 2,376` (9hr × 22 days × 12 months — standard Indian working calendar).
- **working_hours null:** Assumed `09:00–18:00` where null. This is the modal value across employees who specified hours.
- **E007 duplicate:** Two records found. Kept the higher-salary record (₹24,00,000 CTC, Senior Account Executive, tenure 28mo) on the assumption it reflects a role change. Both records logged in the ingestion audit.
- **E013 ghost:** In activity logs, absent from employees.json. Activity retained; excluded from INR calculations (no salary). Shown in UI with `⚠ No meta` badge.
- **E099 no-show:** In employees.json, zero activity rows. Included only in metadata audit.
- **E010 terminated:** `terminated_on: 2025-10-22`. All activity retained as valid data. Surfaced as primary governance anomaly.

---

## Join Strategy

1. Parse and flatten all 16 employee records to canonical schema.
2. Resolve E007 conflict — keep higher CTC, log both in audit.
3. Build `employeeMap` keyed by uppercase employee ID.
4. Left-join each activity row to `employeeMap`.
5. Unmatched rows (E013) → `metadata_missing: true`.
6. Employees with no activity (E099) → logged in `no_activity_employees`.

---

## Headline Number Formulas

**Recoverable hours/month:**
```
Σ(duration_minutes WHERE is_repetitive = true) × 0.70 / 60 / 4_weeks × 4.33
```
The **0.70 automation factor**: 70% of a repetitive task is typically automatable; 30% retained for exceptions, edge cases, and oversight. Consistent with RPA industry benchmarks for structured-data tasks (data entry, email triage, status updates).

**Recoverable INR/month:**
```
Σ((duration_minutes / 60) × hourly_rate WHERE is_repetitive = true AND salary known) × 0.70 / 4 × 4.33
hourly_rate = annual_ctc_inr / 2,376
```
Rows without salary data excluded and counted separately in audit. The formula normalizes across the 4-week dataset to a monthly figure using 4.33 (52 ÷ 12).

---

## Automation Priority Score

```
score = (
  task_hours / total_all_hours     × 0.35   // volume
  repetitive_rate                  × 0.30   // automation feasibility
  employees_doing_task / total_emp × 0.20   // org concentration
  task_cost / max_task_cost        × 0.15   // INR impact
) × 100
```

**Weight rationale:** Volume (35%) is the biggest lever — more total time means more total savings. Repetitiveness (30%) is the feasibility signal — tasks already identified as repetitive are automation-ready with minimal discovery work. Concentration (20%) reflects rollout ease — a task done by 8 people is faster to automate organizationally than one done by 1 (shared tooling, shared training). Cost (15%) is last because volume and repetitiveness already correlate with cost; weighting it higher would double-count.

---

## Anomaly Detection

1. **Per-employee repetitive share** computed. Employees with share > mean + 1.5σ flagged as outliers.
2. **Terminated employee activity** (E010): governance risk — active system access post-termination.
3. **Ghost employees** (E013): activity without identity — cannot calculate cost impact.
4. **Long sessions** (> 300 min): flag for duration logging accuracy review.

Primary anomaly surfaced in dashboard: E010 (terminated Oct 22) with activity records — highest severity.

---

## Cross-Filters

Two working cross-filters:
1. **Department filter** (sidebar pills) → filters HeadlineNumbers, TimeSinkBreakdown, EmployeeDrilldown
2. **Task Category filter** (clicking AutomationRanking rows) → filters EmployeeDrilldown employee list

Both use shared Zustand state. Every component reads from `useFilteredData()` hook which derives filtered rows from the store.

---

## What I Cut

- **Database:** In-memory is sufficient and faster for 533 rows. Adds no latency.
- **Authentication:** Single-tenant COO tool. Not in scope.
- **Real-time refresh:** Dataset is static for this period.
- **Dark/light toggle:** Committed to one polished dark theme rather than two mediocre ones. → **Added back:** Theme toggle with light/dark modes, persisted in localStorage, export respects theme.
- **Streaming AI responses:** Gemini 2.5 Flash is fast enough; streaming would add complexity without meaningful UX gain at this token count.

---

## What I'd Build Next (2 more days)

1. **Automation ROI calculator** — input monthly cost of an RPA tool → payback period in months, break-even visualization.
2. **Weekly email digest** — cron job sends COO a 3-bullet summary of top anomalies every Monday morning.
3. **Peer benchmarking** — compare department repetitive-task rates against industry averages (sourced via API).
4. **AI-generated PDF narrative** — instead of a static export template, ask the AI assistant to write the 1-page summary on demand, grounded in current filter state.

---

## Deployment

- **Backend:** Render.com (Node.js service) — set `GEMINI_API_KEY` env var
- **Frontend:** Vercel — set `VITE_API_URL` to Render backend URL
- Get Gemini API key (free): https://aistudio.google.com/app/apikey
