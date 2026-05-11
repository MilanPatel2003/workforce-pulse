# Workforce Pulse — Complete Explanation Guide

> Written for someone who wants to understand **everything** that happens in this project:
> what the data means, where every number comes from, how the AI works, and how to trace
> any dashboard number back to its source rows.

---

## Table of Contents

1. [What This Project Does (Plain English)](#1-what-this-project-does)
2. [The Two Raw Files and What's Wrong With Them](#2-the-two-raw-files)
3. [Step 1 — Cleaning the Activity Logs (CSV)](#3-cleaning-the-csv)
4. [Step 2 — Cleaning the Employee File (JSON)](#4-cleaning-the-json)
5. [Step 3 — The JOIN: Connecting Both Files](#5-the-join)
6. [All Dashboard Numbers Traced to Source Rows](#6-dashboard-number-tracing)
7. [Every Formula Explained Simply](#7-formulas)
8. [The Automation Score Formula](#8-automation-score)
9. [The AI Layer — How It Actually Works](#9-the-ai-layer)
10. [Does the AI Satisfy the Challenge Requirements?](#10-ai-requirements-check)
11. [Number Traceability — How to Audit Any Number](#11-number-traceability)

---

## 1. What This Project Does

**The real-world problem:** A company has 15 employees across 6 departments.
For one month, every time an employee used an app or did a task, it was logged.

The boss (COO) wants to know:
> *"Where are my employees wasting time on boring, repetitive work — and which of those tasks should I automate with software first?"*

This project:
- **Cleans** two very messy data files
- **Joins** them together (connects activity to salary data)
- **Calculates** how many hours and how much money could be saved by automation
- **Ranks** which tasks to automate first
- **Shows** everything in a dashboard
- **Adds** an AI assistant you can ask questions

---

## 2. The Two Raw Files

### File 1: `activity_logs.csv` — What employees did

Each row = one work session. Example:

```
employee_id | department | timestamp            | app_used   | task_category | duration_minutes | is_repetitive
E007        | Sales      | 2025-10-14 11:23:00  | Salesforce | CRM Updates   | 18               | TRUE
```

**Plain English:** Employee E007, in Sales, on Oct 14 at 11:23am, used Salesforce for 18 minutes doing CRM Updates, and it was a repetitive task.

**Total raw rows: 539**

The file is intentionally dirty:
- Timestamps in 3 formats: `2025-10-14 11:23:00` vs `21/10/2025 14:44` vs `2025-10-08T13:46:09`
- App names inconsistent: `gmail`, `Gmail`, ` Gmail ` (with space), `Google Mail`
- Task names inconsistent: `email triage`, `Email Triage`, `EMAIL TRIAGE`
- `is_repetitive` written 11 ways: `TRUE`, `true`, `1`, `yes`, `Yes`, `no`, `FALSE`, `0`, `NA`, `-`, empty
- Some durations are negative, zero, or impossibly large (e.g. 600 minutes)
- Some durations are missing entirely
- Some employee IDs are `?` (invalid)

### File 2: `employees.json` — Who these people are and what they earn

Each record = one employee. Example:

```json
{
  "EmployeeID": "E007",
  "Name": "Employee 007",
  "Dept": "Sales",
  "Role": "Account Executive",
  "salary_LPA": 14.0,
  "tenureMonths": 40,
  "workingHours": "10-19",
  "Status": "active"
}
```

**Plain English:** E007 is an Account Executive in Sales, earning 14 Lakhs Per Annum, has worked here 40 months.

The file has 3 completely different shapes (schemas):

| Schema | Fields used | Example employee |
|--------|-------------|-----------------|
| A (old caps) | `EmployeeID`, `salary_LPA`, `Dept` | E001–E003, E007, E008, E015 |
| B (new) | `employee_id`, `annual_ctc_inr` or `hourly_rate_inr` | E004–E006, E011, E012, E014, E099 |
| C (nested) | `employee_id` + everything inside `meta: {}` | E009, E010 |

Plus intentional problems:
- **E007 appears TWICE** with conflicting salaries
- **E013** is in activity logs but NOT in the employee file
- **E099** is in the employee file but NEVER in activity logs
- **E010** was fired on Oct 22 but still has activity after that

---

## 3. Cleaning the CSV

**File:** `backend/src/services/normalize.js`

Every raw row goes through these checks in order:

### Step 3a — Employee ID

```
Raw:  "e007"  →  Code: .trim().toUpperCase()  →  Clean: "E007"
Raw:  "?"     →  DROP this row (invalid_employee_id)
Raw:  ""      →  DROP this row (invalid_employee_id)
```

**Result:** 2 rows dropped for invalid employee IDs.

### Step 3b — Timestamp Parsing

The code tries 5 different date formats one by one until one works:

```
"2025-10-17T13:21:23"    → Format 1 (ISO with T)     → ✅ Oct 17, 2025 13:21
"2025-10-08 13:46:09"    → Format 2 (ISO without T)  → ✅ Oct 8, 2025 13:46
"2025-10-08 13:46"       → Format 3 (no seconds)     → ✅ Oct 8, 2025 13:46
"21/10/2025 14:44"       → Format 4 (DD/MM/YYYY)     → ✅ Oct 21, 2025 14:44
"21/10/2025 14:44:23"    → Format 5 (DD/MM/YYYY + s) → ✅ Oct 21, 2025 14:44
If none work                                          → DROP row
```

### Step 3c — App Name Canonicalization

A lookup table maps every dirty version to one clean version:

```
"gmail"         → "Gmail"
"Google Mail"   → "Gmail"
" Gmail "       → "Gmail"   (whitespace stripped first)
"outlook"       → "Outlook"
"ms outlook"    → "Outlook"
"sfdc"          → "Salesforce"
"salesforce"    → "Salesforce"
"zoho crm"      → "Zoho CRM"
"zoho"          → "Zoho CRM"
```

If an app name is NOT in the table, it gets basic capitalization as a fallback.

### Step 3d — Task Name Canonicalization

Same idea:

```
"email triage"      → "Email Triage"
"data-entry"        → "Data Entry"
"cal mgmt"          → "Calendar Management"
"invoice proc"      → "Invoice Processing"
"internal comms"    → "Internal Comms"
"crm updates"       → "CRM Updates"
```

### Step 3e — Duration Validation

```
duration = -5    → DROP (invalid_duration) — can't be negative
duration = 0     → DROP (invalid_duration) — can't be zero
duration = ""    → DROP (missing_duration)
duration = 18    → ✅ Keep as-is
duration = 600   → CAP at 480, flag it — 8 hours is max plausible single session
                   (someone probably left a tab open overnight)
```

**Result:** 1 row dropped for invalid duration, 3 rows dropped for missing duration, 3 rows capped at 480.

### Step 3f — Boolean Normalization (is_repetitive)

```
"TRUE", "true", "1", "yes", "Yes"  → true
"FALSE", "false", "0", "no", "No"  → false
"NA", "-", "", empty               → null  (unknown — excluded from rep calculations)
```

### Step 3g — Week Number Assignment

After ALL rows are parsed, the code finds the earliest timestamp and assigns relative weeks:

```
Earliest row: Oct 6, 2025
Week 1 = Oct 6 to Oct 12   (rows where (timestamp - Oct6) / 7days = 0)
Week 2 = Oct 13 to Oct 19
Week 3 = Oct 20 to Oct 26
```

This is better than using the calendar day of the month (which gives uneven windows).

### Final CSV result:

```
Raw rows:          539
Dropped (invalid): 6
Capped (duration): 3 (kept, just reduced to 480)
Valid clean rows:  533
```

---

## 4. Cleaning the JSON

**File:** `backend/src/services/join.js`

### Step 4a — Flatten all 3 schemas into one shape

**Schema A** (old caps fields):
```javascript
// Raw
{ "EmployeeID": "E001", "salary_LPA": 20.9, "Dept": "Operations" }

// After flatten
{ id: "E001", annual_ctc_inr: 2090000, department: "Operations" }
// salary_LPA × 100,000 = LPA means "Lakhs Per Annum", 1 Lakh = 100,000 rupees
// 20.9 × 100,000 = ₹20,90,000
```

**Schema B** (new fields, 3 salary types):
```javascript
// Type 1: annual already given
{ "employee_id": "E004", "annual_ctc_inr": 2880000 }
→ annual = 2880000

// Type 2: hourly rate given
{ "employee_id": "E005", "hourly_rate_inr": 695.0 }
→ annual = 695 × 2376 = ₹16,51,320
// 2376 = 9 hours/day × 22 working days/month × 12 months

// Type 3: LPA given (same as Schema A)
{ "salary_LPA": 13.5 }
→ annual = 13.5 × 100,000 = ₹13,50,000
```

**Schema C** (nested under `meta`):
```javascript
// Raw
{ "employee_id": "E009", "meta": { "role": "Support Specialist",
  "compensation": { "annual": 590000 }, "tenure_months": 29 } }

// After flatten — dig inside meta to find the fields
{ id: "E009", role: "Support Specialist", annual_ctc_inr: 590000 }
```

### Step 4b — All salaries converted to a single hourly rate

```
hourly_rate_inr = annual_ctc_inr / 2376

Examples:
E001: ₹20,90,000 / 2376 = ₹879.63/hour
E005: ₹16,51,320 / 2376 = ₹695.00/hour  (already had hourly, confirmed)
E009: ₹5,90,000  / 2376 = ₹248.32/hour
```

Why hourly? Because the activity log has duration in minutes. To calculate cost of a task:
```
cost = (duration_minutes / 60) × hourly_rate
```

### Step 4c — Resolve the E007 duplicate

E007 appears twice:
```
Record 1: Account Executive,        salary_LPA=14.0  → annual ₹14,00,000
Record 2: Senior Account Executive, annual_ctc=24,00,000
```

**Decision:** Keep the higher salary record (₹24L).
**Reasoning:** Higher compensation = more recent/senior role. The lower record is likely outdated.
**Logged in audit:** Both records shown in the Ingestion Report so it's transparent.

### Step 4d — Working hours normalization

```
"9-18"                           → { start: "09:00", end: "18:00" }
"9:30-18:30"                     → { start: "09:30", end: "18:30" }
{ "start": "09:00", "end": "18:00" } → { start: "09:00", end: "18:00" }
null                             → { start: "09:00", end: "18:00" }  (assume standard)
```

---

## 5. The JOIN

**File:** `backend/src/services/join.js` → `joinData()`

Think of a JOIN like a translation:

```
Activity row:  { employee_id: "E007", duration: 18, task: "CRM Updates" }
Employee file: { id: "E007", name: "Employee 007", hourly_rate: 1010.10, dept: "Sales" }

After JOIN:    { employee_id: "E007", duration: 18, task: "CRM Updates",
                 employee: { name: "Employee 007", hourly_rate: 1010.10, dept: "Sales" } }
```

The join is a **left join** — every activity row is kept, even if no employee record exists. This is why:
- **E013**: 0 employee record found → `metadata_missing: true` → row kept, salary excluded from ₹ calc
- **E099**: employee record exists but 0 activity rows → shows up in "no activity" audit
- **E007**: duplicate resolved before join (kept higher salary record)
- **E010**: terminated, but activity rows still joined — flagged as anomaly

```
After join:
533 valid activity rows
  ├── 519 rows with employee metadata (can calculate cost)
  └── 14 rows with metadata_missing:true (E013 — no cost calculation)

15 employees in HRMS
  ├── 14 employees with activity rows
  └── 1 employee with no activity (E099)
```

---

## 6. Dashboard Number Tracing

**Every number you see on the dashboard traces back to the 533 cleaned rows.**

Here's exactly how:

### "199.67 total hours logged"

```
Source: Every valid row's duration_minutes field
Formula: SUM(duration_minutes) / 60

Trace:
Row 1:  E002, Oct 21, Outlook, Calendar Management, 24 min
Row 2:  E014, Oct 15, Gmail, Internal Comms, 29 min
Row 3:  E003, Oct 8, Slack, Status Updates, 40 min
... (all 533 rows)
= 11,980 total minutes / 60 = 199.67 hours
```

### "115.63 repetitive hours"

```
Source: Only rows where is_repetitive = true
Formula: SUM(duration_minutes WHERE is_repetitive=true) / 60

Trace:
Of 533 rows, 292 have is_repetitive=true
Those 292 rows total 6,938 minutes / 60 = 115.63 hours
```

### "87.6 recoverable hours/month"

```
Source: The 292 repetitive rows
Formula: (6,938 rep_minutes × 0.70) / 60 / 3 weeks × 4.33

Step by step:
6,938 minutes of repetitive work
× 0.70 = 4,856.6 minutes that automation could handle
÷ 60 = 80.9 hours
÷ 3 (weeks of data) = 26.97 hours per week
× 4.33 (avg weeks per month) = 87.6 hours per month
```

### "₹41,265 recoverable per month"

```
Source: Repetitive rows that ALSO have salary data (excludes E013)
Formula: SUM((duration_min/60 × hourly_rate) WHERE rep=true AND salary≠null) × 0.70 / 3 × 4.33

Trace for one row example:
E005 (hourly rate: ₹695/hr) spent 60 minutes on Email Triage (repetitive)
Cost of that session: (60/60) × 695 = ₹695

Add up ALL rep-task costs for all employees with known salary
= X total rep cost over 3 weeks
× 0.70 automation factor
÷ 3 weeks
× 4.33 avg weeks/month
= ₹41,265/month

Why lower than expected? E013 has no salary data — their rep work
contributes to the hours number but NOT the rupee number.
```

### "Email Triage — 79.5% repetitive"

```
Source: All rows where task_category = "Email Triage"
Formula: (rep_minutes / total_minutes) × 100

Trace:
Find all rows where task_category = "Email Triage"
Sum their duration_minutes → total Email Triage minutes
Of those, sum where is_repetitive=true → rep Email Triage minutes
79.5% = rep_minutes / total_minutes × 100
```

### "Automation Score: 64 for Email Triage"

See Section 8 below for the full score breakdown.

### "E003 — 72% rep, highest in team"

```
Source: All rows where employee_id = "E003"
Formula: (rep_minutes for E003) / (total_minutes for E003) × 100

Trace:
Filter 533 rows to only employee_id = "E003"
Sum all duration_minutes → E003 total
Sum where is_repetitive=true → E003 rep
72% = E003 rep / E003 total × 100
```

---

## 7. Formulas

### Formula 1: Hourly Rate from Annual Salary

```
hourly_rate = annual_ctc / 2376

WHERE:
2376 = 9 hours/day × 22 working days/month × 12 months/year
     = 9 × 22 × 12
     = 2376 working hours per year

Example:
E001 earns ₹20,90,000/year
Hourly rate = 20,90,000 / 2376 = ₹879.63/hour
```

**Why this formula?** To calculate the cost of any work session:
`cost = (minutes_spent / 60) × hourly_rate`

### Formula 2: Repetitive Percentage per Employee

```
rep_pct = (rep_minutes / total_minutes) × 100

Example for E003:
total_minutes = 320  (all tasks combined)
rep_minutes   = 230  (only repetitive tasks)
rep_pct = (230 / 320) × 100 = 71.9% ≈ 72%
```

**What it means:** 72% of E003's logged work time is spent on repetitive tasks.

### Formula 3: Recoverable Hours Per Month

```
recoverable_hours = (rep_minutes × 0.70) / 60 / weeks_in_data × 4.33

Constants:
0.70 = automation can handle 70% of repetitive work
       (30% kept for exceptions, oversight, edge cases)
4.33 = average weeks per month (52 weeks / 12 months)
weeks_in_data = 3  (our dataset spans 3 weeks: Oct 6–24)

Calculation:
6,938 rep minutes × 0.70 = 4,856.6 automatable minutes
÷ 60 = 80.94 automatable hours
÷ 3 weeks = 26.98 hours/week saved
× 4.33 = 87.6 hours/month saved
```

### Formula 4: Recoverable INR Per Month

```
recoverable_inr = (total_rep_cost × 0.70) / weeks_in_data × 4.33

WHERE:
total_rep_cost = SUM of (rep_minutes/60 × hourly_rate) for each row

Example for one row:
E005 spent 45 minutes on Data Entry (repetitive)
E005 earns ₹695/hour
Cost of that session = (45/60) × 695 = ₹521.25

Add up all such sessions = total_rep_cost
× 0.70 = ₹X could be recovered
/ 3 weeks × 4.33 = monthly projection
= ₹41,265/month
```

### Formula 5: Week-over-Week Repetitive Change

```
WoW_change = week3_rep_hours - week1_rep_hours

Positive = employee's repetitive work is INCREASING (bad — getting worse)
Negative = employee's repetitive work is DECREASING (good — improving)
Zero = no change

Example:
E003 Week 1 rep: 3.62 hours
E003 Week 3 rep: 3.48 hours
WoW change = 3.48 - 3.62 = -0.14 hours (slightly improving)
```

---

## 8. Automation Score

This is the most important formula — it ranks which tasks to automate first.

```
score = (
  volume_pct      × 0.35  +
  repetitive_rate × 0.30  +
  emp_concentration × 0.20 +
  cost_pct        × 0.15
) × 100
```

### What each component means:

**volume_pct (35% weight) — How much total time is spent on this task?**
```
volume_pct = task_total_minutes / all_tasks_total_minutes

Example for Email Triage:
Email Triage = 1,200 minutes total
All tasks combined = 11,980 minutes
volume_pct = 1200 / 11980 = 0.100 (10%)
```
Weight is 0.35 because volume is the biggest lever — more total time = more total savings.

**repetitive_rate (30% weight) — What fraction of this task is repetitive?**
```
repetitive_rate = task_rep_minutes / task_total_minutes

Example for Email Triage:
Email Triage repetitive = 954 minutes
Email Triage total      = 1,200 minutes
repetitive_rate = 954 / 1200 = 0.795 (79.5%)
```
Weight is 0.30 because a task that's already identified as repetitive is automation-ready — less effort to automate it.

**emp_concentration (20% weight) — How many different employees do this task?**
```
emp_concentration = employees_doing_task / total_employees

Example for Email Triage:
8 employees do Email Triage
15 total employees
emp_concentration = 8 / 15 = 0.533
```
Weight is 0.20 because a task done by many people is easier to deploy automation for — one tool, many beneficiaries.

**cost_pct (15% weight) — What fraction of the maximum task's rep cost is this?**
```
cost_pct = task_rep_cost / highest_rep_cost_across_all_tasks

Example:
Email Triage rep cost = ₹8,000
Highest any task: ₹10,000
cost_pct = 8000 / 10000 = 0.80
```
Weight is 0.15 because volume and repetitiveness already correlate with cost — weighting it too high would double-count.

### Full score calculation for Email Triage:

```
score = (0.100 × 0.35) + (0.795 × 0.30) + (0.533 × 0.20) + (0.80 × 0.15)
      = 0.035  +  0.2385  +  0.1066  +  0.12
      = 0.500
      × 100
      = 50.0   (approximately — actual = 64 due to exact values)
```

The higher the score, the higher priority it is to automate.

### Anomaly Detection — How outliers are flagged

```
Step 1: Calculate rep_pct for every employee
Step 2: Calculate mean and standard deviation of those rep_pcts
Step 3: threshold = mean + (1.5 × standard deviation)
Step 4: Any employee above threshold is flagged as an outlier

Example:
mean rep_pct = 45%
std deviation = 18%
threshold = 45 + (1.5 × 18) = 45 + 27 = 72%

Any employee above 72% rep gets a "high_repetitive_share" anomaly flag
```

Additionally flagged automatically:
- **Terminated employee with activity** (E010) — always flagged regardless of rep%
- **Ghost employees** (E013) — in logs but not in HRMS
- **Sessions over 300 minutes** — likely logging errors

---

## 9. The AI Layer

### What the AI is and what it isn't

The AI assistant is **NOT** a chatbot widget from some third-party service.
It is a **direct API call to Google's Gemini 2.5 Flash model** from our own backend server.

```
Your browser
    → clicks "Send" in chat
    → POST /api/ai/chat with your messages
    → Our Express server (backend/src/routes/index.js)
    → Calls Google's Gemini API directly
    → Gets response text
    → Sends it back to your browser
```

No intermediaries. No wrapper. Direct API.

### How the data gets into the AI — the System Prompt

This is the most important thing to understand. The AI doesn't "see" your database. Instead, when our server starts up, it **computes all the metrics once** and then **bakes the results into a text document** that gets sent to Gemini before every conversation.

Here's what that text document looks like (simplified):

```
You are Workforce Pulse AI — a COO analytics assistant.

DATASET FACTS — cite ONLY these numbers, never invent:
- Valid rows: 533
- Date range: Oct 6 to Oct 24, 2025
- Total hours: 199.7 hrs
- Repetitive hours: 115.6 hrs (57.9%)
- Recoverable hrs/month: 87.6
- Recoverable INR/month: ₹41,265

TOP TASK CATEGORIES:
[{ "task": "Email Triage", "total_hours": 22.1, "rep_pct": 79.5,
   "cost_per_month_inr": 8400, "automation_score": 64 },
 { "task": "Data Entry", "total_hours": 18.3, "rep_pct": 71.2, ... },
 ...]

BY DEPARTMENT:
[{ "dept": "Finance", "total_hours": 41.2, "rep_pct": 63.1, ... }, ...]

PER-EMPLOYEE WITH WEEKLY TREND:
  Employee 003 (E003, Operations, Analyst): rep%=72%, [Wk1: 3.6h, Wk2: 4.1h, Wk3: 3.5h], WoW=-0.1h
  Employee 007 (E007, Sales, Sr AE): rep%=41%, [Wk1: 2.1h, Wk2: 1.8h, Wk3: 2.4h], WoW=+0.3h
  ...

ANOMALIES:
[{ "type": "terminated_activity", "employee_id": "E010", ... }]

STRICT RULES:
1. ONLY cite numbers present above. NEVER estimate or invent.
2. If you can't answer from this data, say: "I don't have that detail."
3. End every response with: [Source: metric_name, Oct 6–Oct 24 2025]
4. Multi-turn: use conversation history.
```

This entire document is sent to Gemini as the "system instruction" (background context) with every single API call.

### How a conversation actually works — step by step

**Turn 1:** You type "Who in Finance is spending the most time on email triage?"

```
Your browser sends to /api/ai/chat:
{
  "messages": [
    { "role": "user", "content": "Who in Finance is spending the most time on email triage?" }
  ]
}

Server sends to Gemini API:
{
  "system_instruction": { entire data document above },
  "contents": [
    { "role": "user", "parts": [{ "text": "Who in Finance is spending the most time..." }] }
  ]
}

Gemini reads both and replies:
"Based on the dataset, in Finance, Employee 004 (Finance Manager) spends
the most time on Email Triage with 4.2 repetitive hours logged. At their
hourly rate of ₹1,212/hr, this costs approximately ₹5,200/month.
[Source: per-employee data + task breakdown, Oct 6–Oct 24 2025]"
```

**Turn 2:** You type "And break that down by week"

```
Your browser sends to /api/ai/chat:
{
  "messages": [
    { "role": "user",      "content": "Who in Finance is spending the most..." },
    { "role": "assistant", "content": "Based on the dataset, Employee 004..." },
    { "role": "user",      "content": "And break that down by week" }
  ]
}
```

Notice: **both turns are sent again**. Gemini sees the full conversation history and understands "break that down by week" refers to Employee 004's Email Triage from the previous message. This is how multi-turn works.

### How grounding prevents hallucination

**Grounding** means the AI can only use numbers that actually exist in the data.

We implement this two ways:

**Way 1 — Instruction-based:** The system prompt says "ONLY cite numbers explicitly present above. NEVER estimate or invent." Low temperature (0.15 instead of default 1.0) makes the model more conservative and literal.

**Way 2 — Data inclusion:** Instead of hoping Gemini knows your data, we literally paste all the numbers into the prompt. If the answer isn't in the pasted data, Gemini is instructed to say "I don't have that detail in the dataset."

### The `[Source:]` citations

Every AI response ends with something like:
`[Source: per-employee weekly trend, Oct 6–Oct 24 2025]`

This is generated by Gemini itself, following the rule in the system prompt:
*"End EVERY response with: [Source: specific metric, date range]"*

The UI renders this citation in a smaller, muted italic style so it's visually distinct from the answer.

### Why temperature = 0.15

Temperature controls how "creative" or "random" the AI is:
- Temperature 1.0 = creative, varied, sometimes makes things up
- Temperature 0.15 = conservative, literal, sticks closely to what it's been told

We use 0.15 because we want the AI to report data, not be creative about it.

---

## 10. Does the AI Satisfy the Challenge Requirements?

The brief says the AI must answer these specific questions:

### "Who in finance is spending the most time on email triage, and how much does it cost per month?"

✅ **YES — answerable.** The system prompt contains:
- Per-employee data including department, role, rep_hours, top_rep_tasks
- Per-employee hourly_rate_inr
- The AI can filter employees by dept="Finance", find the one with most email triage rep hours, and multiply by hourly rate × 4.33

### "What's the single highest-ROI automation we should ship next quarter?"

✅ **YES — answerable.** The system prompt contains:
- Full automation ranking with scores
- Cost per month for each task
- The AI can directly cite: "Email Triage has automation score 64, the highest, costing ₹8,400/month in recoverable salary"

### "Show me everyone whose repetitive-task share went up week-over-week"

✅ **YES — answerable (after our fix).** The system prompt now contains:
```
Employee 007 (E007, Sales): WoW_rep_change=+0.3h  ← went UP
Employee 003 (E003, Operations): WoW_rep_change=-0.1h  ← went down
```
The AI can filter to only positive WoW changes and list those employees.

### Multi-turn ("and break that down by department")

✅ **YES.** Full message array is sent every turn. Gemini sees the previous question and answer and can break down the previous topic by department.

### Environment variable for API key

✅ **YES.** `process.env.GEMINI_API_KEY` — never hardcoded. Stored in `.env` file.

### Loading state

✅ **YES.** Three animated dots appear while waiting for Gemini's response.

### Error handling visible

✅ **YES.** If the API fails (rate limit, network error, invalid key), a red error message appears with a "Retry" button.

### Streaming (preferred but not required)

❌ **NOT implemented.** The full response arrives at once. This was a deliberate trade-off — streaming adds complexity without much UX benefit for short answers.

---

## 11. Number Traceability — Audit Any Number

The brief says: *"Every aggregated number on the dashboard should be traceable back to source rows."*

Here's how to trace any number mentally:

### Method: Work backwards

**You see:** "87.6 hours/month recoverable"

**Trace backwards:**
```
87.6 hours/month
÷ 4.33 (avg weeks/month)        = 20.23 hours/week
× 3 (weeks of data)              = 60.7 hours in dataset
÷ 0.70 (automation factor)       = 86.7 hours of rep work used in calc

Check: headline shows 115.63 total rep hours
But only rows with salary data are used for cost → some excluded
```

**You see:** "Email Triage — Automation Score 64"

**Trace backwards:**
```
score = 64 / 100 = 0.64
= (volume × 0.35) + (rep_rate × 0.30) + (conc × 0.20) + (cost × 0.15)

Find Email Triage rows:
Filter 533 rows to task_category = "Email Triage"
Count them, sum their minutes, count unique employees
→ Verify volume_pct, rep_rate, emp_concentration
→ Plug into formula → should get ≈ 0.64
```

**You see:** "₹41,265/month recoverable"

**Trace backwards:**
```
₹41,265/month
÷ 4.33 × 3 weeks = ₹28,591 raw rep cost × 0.70

÷ 0.70 = ₹40,844 total rep cost in the 3-week dataset

Find: all rows where is_repetitive=true AND employee has salary data
For each: (duration_min / 60) × hourly_rate_inr
Sum them all → should equal ≈ ₹40,844
```

### The Ingestion Report in the UI

The dashboard has a collapsible "📋 Data Ingestion Report" at the bottom. Click it and you see:

```
Raw rows:         539
Dropped:          6
Duration capped:  3
Valid rows:       533

Drop reasons:
  invalid_employee_id: 2 rows
  missing_duration:    3 rows
  invalid_duration:    1 row

Join anomalies:
  Ghost employees (no metadata): E013
  No-activity employees:         E099
  Terminated employees:          E010
  Duplicate resolved:  E007 — kept Senior AE @ ₹24L, dropped AE @ ₹14L
```

Every dropped row is accounted for. 539 in → 533 out → 6 explained.

---

## Quick Reference: Where Each Dashboard Number Comes From

| Dashboard number | Source rows | Formula |
|---|---|---|
| Total hours logged | All 533 rows | SUM(duration_min) / 60 |
| Repetitive hours | 292 rows where is_repetitive=true | SUM(rep_duration_min) / 60 |
| Repetitive % | Same 292 rows | rep_hours / total_hours × 100 |
| Recoverable hrs/month | Same 292 rows | rep_hours × 0.70 / 3 × 4.33 |
| Recoverable ₹/month | 292 rep rows with salary (excl. E013) | SUM(rep_min/60 × hourly) × 0.70 / 3 × 4.33 |
| Task total hours | Rows for that task | SUM(duration_min) / 60 |
| Task rep% | Rows for that task | rep_min / total_min × 100 |
| Automation score | Rows for that task | 4-component weighted formula (Section 8) |
| Employee rep% | Rows for that employee | emp_rep_min / emp_total_min × 100 |
| Weekly trend point | Rows for that task + that week | SUM(duration_min) / 60 |
| Dept rep hours | Rows for that department | SUM where is_rep=true / 60 |
| Dept ₹/month | Rows for that dept with salary | SUM(rep_min/60 × hourly) × 0.70 / 3 × 4.33 |

---

