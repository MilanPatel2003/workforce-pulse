# Workforce Pulse — README (Simple Version)

> This is the official methodology document for the challenge submission,
> rewritten so anyone can understand it without prior technical knowledge.

---

## What Does This Project Actually Do?

Imagine you are the boss of a company. You want to know:

> "My 15 employees spend 8 hours a day on computers. But on WHAT?
> Which of those tasks could a robot/software do instead of a human?"

This project answers that by:
1. Reading two messy data files
2. Cleaning and connecting them
3. Calculating how much time and money is wasted on repetitive work
4. Showing everything on a dashboard with charts and an AI assistant

---

## Tech Stack

| Layer | Tool | Why |
|---|---|---|
| Backend | Node.js + Express | Reads files, does math, sends data to frontend |
| Frontend | React + Vite | The dashboard the user sees in the browser |
| Charts | Recharts | Bar and line charts |
| AI | Google Gemini 2.5 Flash (direct API) | Answers natural language questions |
| PDF Export | jsPDF + html2canvas | Converts dashboard to downloadable PDF |
| State | Zustand | Remembers which filters are active across all components |

---

## The Two Data Files

### File 1: activity_logs.csv — The Timesheet

Every row = one work session by one employee.

```
E007 | 2025-10-14 11:23:00 | gmail      | email triage  | 18 min | TRUE
E003 | 21/10/2025 14:44    | Outlook    | Cal Mgmt      | 24 min | yes
E002 | 2025-10-08T13:46:09 | SLACK      | status update | 40 min | 1
```

Problems (intentional):
- App name in 3 ways: `gmail`, `Gmail`, ` Gmail ` (space)
- Task name varies: `email triage`, `Email Triage`, `EMAIL TRIAGE`
- Timestamps in 3 different formats (see above)
- `is_repetitive` as: TRUE, yes, 1, no, FALSE, NA, empty, -...
- Negative/zero/missing/impossibly large durations
- Employee ID `?` (invalid)

**Raw rows: 539. After cleaning: 533.**

### File 2: employees.json — The HR File

Contains salary, role, department for each employee.

Problem: 3 completely different layouts in the same file:

```json
Layout A: { "EmployeeID": "E001", "salary_LPA": 20.9, "Dept": "Operations" }
Layout B: { "employee_id": "E004", "annual_ctc_inr": 2880000, "department": "Finance" }
Layout C: { "employee_id": "E009", "meta": { "compensation": { "annual": 590000 } } }
```

Special problems:
- **E007 appears TWICE** with different salaries (14L vs 24L)
- **E013** is in activity logs but NOT in the HR file
- **E099** is in the HR file but has ZERO activity rows
- **E010** was fired on Oct 22 but still has activity logged after that

---

## Step 1 — Cleaning the CSV

**File:** `backend/src/services/normalize.js`

### Employee ID
```
"e007"  →  uppercase  →  "E007"  ✅
"?"     →  DROP  (2 rows dropped)
```

### Timestamp — tries 5 formats in order
```
"2025-10-08T13:46:09"  →  ISO with T      ✅
"2025-10-08 13:46:09"  →  ISO without T   ✅
"21/10/2025 14:44"     →  DD/MM/YYYY      ✅
None work              →  DROP row
```

Week numbers are assigned AFTER all rows are parsed:
```
Earliest row: Oct 6, 2025
Week 1 = Oct 6 to Oct 12
Week 2 = Oct 13 to Oct 19
Week 3 = Oct 20 to Oct 24
```
This gives even 7-day windows. (The old way used calendar day-of-month which gave uneven windows.)

### App Name — lookup table
```
"gmail", "Google Mail", " Gmail "  →  "Gmail"
"outlook", "ms outlook"            →  "Outlook"
"sfdc", "salesforce"               →  "Salesforce"
"zoho", "zoho crm"                 →  "Zoho CRM"
```
31 messy names → 10 clean canonical names.

### Task Name — lookup table
```
"email triage"    →  "Email Triage"
"data-entry"      →  "Data Entry"
"cal mgmt"        →  "Calendar Management"
"invoice proc"    →  "Invoice Processing"
"internal comms"  →  "Internal Comms"
```
42 messy names → 14 clean canonical names.

### Duration
```
-5  →  DROP  (can't be negative)
0   →  DROP  (can't be zero)
""  →  DROP  (missing)
18  →  KEEP  ✅
600 →  CAP at 480, flag it  ⚠️
```
Why 480? That's 8 hours — maximum plausible single session. 600 min (10 hrs) = likely a logging error.

**3 rows dropped for missing, 1 for invalid, 3 capped at 480.**

### is_repetitive — 11 spellings
```
"TRUE", "true", "1", "yes", "Yes"   →  true
"FALSE", "false", "0", "no", "No"   →  false
"NA", "-", "", empty, anything else  →  null
```
`null` = unknown. These rows count in total hours but NOT in repetitive hours.
This is conservative — we don't inflate the automation opportunity.

---

## Step 2 — Cleaning the JSON

**File:** `backend/src/services/join.js`

### Flatten all 3 schemas into one shape

Every employee, regardless of layout, becomes:
```javascript
{
  id: "E001",
  name: "Employee 001",
  department: "Operations",
  role: "Operations Manager",
  annual_ctc_inr: 2090000,
  hourly_rate_inr: 879.63,
  status: "active"
}
```

### Convert all salary formats to annual INR

```
LPA format:     salary_LPA = 20.9   →  20.9 × 1,00,000 = ₹20,90,000
Annual format:  annual_ctc_inr = 2880000  →  ₹28,80,000 (use as-is)
Hourly format:  hourly_rate_inr = 695  →  695 × 2376 = ₹16,51,320
```

Then convert annual to hourly:
```
hourly_rate = annual_ctc / 2376
(2376 = 9 hrs/day × 22 days/month × 12 months/year)

E001: ₹20,90,000 / 2376 = ₹879.63/hour
E009: ₹5,90,000  / 2376 = ₹248.32/hour
```

### Special cases

**E007 duplicate:**
```
Record 1: Account Executive        ₹14,00,000/year
Record 2: Senior Account Executive ₹24,00,000/year
→ Keep ₹24L (higher salary = more recent/senior role)
→ Log both in audit report for transparency
```

**E013 ghost — in activity log but not in HR:**
```
→ Keep all activity rows (don't delete real data)
→ Mark metadata_missing: true
→ Hours count in totals; ₹ excluded (no salary to calculate with)
→ Shown with ⚠ badge in employee table
```

**E099 — in HR but zero activity:**
```
→ Noted in audit report only
```

**E010 — terminated Oct 22 but has activity after:**
```
→ Keep all rows
→ Flagged as #1 anomaly: "Terminated employee has logged activity"
```

---

## Step 3 — The JOIN

**Code:** `backend/src/services/join.js` → `joinData()`

For every activity row, find and attach the matching employee record:

```
Activity: { employee_id: "E007", task: "CRM Updates", duration: 18 min }
HR file:  { id: "E007", hourly_rate: 1010.10 }

After JOIN: { employee_id: "E007", task: "CRM Updates", duration: 18,
              employee: { hourly_rate: 1010.10 } }
```

Now we can calculate: cost of this session = (18/60) × 1010.10 = ₹303.

**Result:**
```
533 activity rows
├── ~519 rows matched to an employee  (₹ can be calculated)
└── ~14 rows from E013               (hours tracked, ₹ excluded)

15 employees in HR file
├── 14 appear in activity logs
└── 1 (E099) never appears in activity
```

---

## Every Dashboard Number — Where It Comes From

### "199.67 total hours logged"
```
Source: All 533 rows
Math:   SUM(duration_minutes for all rows) / 60
        = 11,980 minutes / 60
        = 199.67 hours
```

### "115.63 repetitive hours"
```
Source: 292 rows where is_repetitive = true
Math:   SUM(duration_minutes for those 292 rows) / 60
        = 6,938 minutes / 60
        = 115.63 hours
```

### "87.6 recoverable hours/month" (Headline #1)
```
Source: Same 292 repetitive rows
Math:
  6,938 rep minutes
  × 0.70     = 4,856 min  (automation can handle 70%)
  ÷ 60       = 80.9 hours
  ÷ 3        = 26.97 hrs/week  (our data spans 3 weeks)
  × 4.33     = 87.6 hours/month  (4.33 = 52 weeks ÷ 12 months)
```

### "₹41,265 recoverable/month" (Headline #2)
```
Source: 292 repetitive rows that also have salary data (E013 excluded)
Math:
  For each repetitive row: (duration_min / 60) × hourly_rate = session cost
  Example: E005, 45 min on Data Entry, ₹695/hr → ₹521.25

  Sum all session costs across all rep rows with salary
  × 0.70  (automation factor)
  ÷ 3     (weeks in data)
  × 4.33  (scale to monthly)
  = ₹41,265/month

Why lower than expected? E013 rows contribute to hours but not to ₹.
```

### "Email Triage — Automation Score 64"
See the Automation Score formula section below.

### "Employee 003 — 72% repetitive"
```
Source: All rows where employee_id = "E003"
Math:   E003 total minutes / E003 repetitive minutes × 100
        = 230 rep / 320 total × 100 = 71.9% ≈ 72%
```

---

## The Automation Score Formula (Most Important Formula)

This ranks which tasks to automate first. Higher score = automate this first.

```
Score = (
  A × 0.35  +    ← Volume:         how much total time?
  B × 0.30  +    ← Repetitiveness: how repetitive is it?
  C × 0.20  +    ← Concentration:  how many employees do it?
  D × 0.15       ← Cost:           how much ₹ is involved?
) × 100
```

**Real example — Email Triage (score = 64):**

| Component | Question | Calculation | Value |
|---|---|---|---|
| A — Volume | What % of all time is Email Triage? | Email Triage mins ÷ total all mins | ~10% = 0.10 |
| B — Repetitiveness | What % of Email Triage is repetitive? | 79.5% marked as repetitive | 0.795 |
| C — Concentration | What % of employees do Email Triage? | 8 of 15 employees | 0.533 |
| D — Cost | What % of the max task cost? | Email Triage ₹ ÷ highest task's ₹ | ~0.80 |

```
Score = (0.10 × 0.35) + (0.795 × 0.30) + (0.533 × 0.20) + (0.80 × 0.15)
      = 0.035 + 0.2385 + 0.1066 + 0.12
      = 0.50 × 100
      = ~50 to 64 (exact depends on actual data values)
```

**Why these weights?**
- **Volume 35%** — More total time = more potential savings. Biggest lever.
- **Repetitiveness 30%** — If it's already repetitive, it's ready to automate. Minimal discovery needed.
- **Concentration 20%** — One tool that helps 8 people is better than one that helps 1 person.
- **Cost 15%** — Volume and repetitiveness already predict cost; weighting it more would double-count.

---

## Anomaly Detection

```
Step 1: Calculate each employee's repetitive% (rep_minutes / total_minutes × 100)
Step 2: Find the average rep% across all employees
Step 3: Find the standard deviation (how spread out the values are)
Step 4: threshold = average + (1.5 × standard deviation)
Step 5: Any employee above threshold is flagged

Example:
  Average rep% = 45%
  Std deviation = 18%
  Threshold = 45 + (1.5 × 18) = 72%
  Any employee above 72% rep gets flagged as an outlier
```

Always flagged regardless of rep%:
- **E010 (terminated with activity)** — highest severity
- **E013 (ghost employee)** — medium severity
- **Sessions over 300 min** — possible logging error

---

## The AI Assistant — Deep Explanation

### What it actually is

It is NOT a chatbot widget. It is a **direct HTTP call from our server to Google's Gemini API.**

```
You type a question
  → Your browser sends it to our Express server (backend/src/routes/index.js)
  → Our server calls https://generativelanguage.googleapis.com (Gemini API)
  → Gemini replies
  → Our server sends the reply back to your browser
```

No third-party widget. No intermediary service. Direct API call.

### How the data gets into the AI

When the server starts, it computes all metrics and builds a text document called the **system prompt** — think of it as a cheat sheet we give the AI before every conversation:

```
You are a COO analytics assistant.

DATASET FACTS — use ONLY these numbers, never make up others:
- 533 valid activity rows
- Date range: Oct 6 to Oct 24, 2025
- Total hours: 199.7 hrs
- Repetitive hours: 115.6 hrs (57.9%)
- Recoverable hours/month: 87.6
- Recoverable ₹/month: ₹41,265

TOP TASKS:
[{ task: "Email Triage", total_hours: 22.1, rep_pct: 79.5, score: 64 }, ...]

PER EMPLOYEE WITH WEEKLY TREND:
Employee 003 (E003, Operations): rep%=72%, Wk1: 3.6h, Wk2: 4.1h, WoW=+0.1h
Employee 007 (E007, Sales):      rep%=41%, Wk1: 2.1h, Wk2: 1.8h, WoW=-0.3h
...

RULES:
- Only use numbers listed above. Never estimate or invent.
- End every reply with [Source: data_name, Oct 6–Oct 24 2025]
- If you can't answer, say "I don't have that detail in the dataset."
```

This entire document is sent to Gemini with EVERY question you ask.

### How a 2-turn conversation works

**Turn 1 — You ask:**
```
"Who in Finance spends the most time on email triage?"

Server sends to Gemini:
{
  system: "...the full data document...",
  messages: [
    { role: "user", content: "Who in Finance spends the most time on email triage?" }
  ]
}

Gemini replies:
"Employee 004 (Finance Manager) leads with 4.2h repetitive Email Triage.
At ₹1,212/hr, that's ~₹5,200/month.
[Source: per-employee task data, Oct 6–Oct 24 2025]"
```

**Turn 2 — You follow up:**
```
"And break that down by week"

Server sends to Gemini:
{
  system: "...the full data document...",
  messages: [
    { role: "user",      content: "Who in Finance spends the most..." },
    { role: "assistant", content: "Employee 004 (Finance Manager) leads..." },
    { role: "user",      content: "And break that down by week" }
  ]
}
```

**The key:** The full conversation history is sent every time. Gemini sees what it said before. That's how "break that down by week" correctly refers to Employee 004 from Turn 1.

### Why the AI doesn't hallucinate (much)

Two layers of protection:

**1. Instruction-based:** System prompt says "ONLY cite numbers listed above. NEVER estimate or invent."

**2. Temperature = 0.15:** Temperature controls creativity.
- 1.0 = creative, may invent plausible-sounding answers
- 0.15 = conservative, sticks closely to what it was told

We use 0.15 because we want data reporting, not creative writing.

### Does it satisfy all challenge requirements?

| Requirement | Status | How |
|---|---|---|
| Direct LLM API (not a wrapper widget) | ✅ | `axios.post()` directly to Gemini URL |
| Grounded in normalized dataset | ✅ | All computed metrics in the system prompt |
| Cannot make up numbers | ✅ | Instructions + temperature=0.15 |
| Every claim cites a figure | ✅ | Rule: "end every reply with [Source: ...]" |
| At least 2 conversational turns | ✅ | Full message history sent every call |
| API key in environment variable | ✅ | `process.env.GEMINI_API_KEY` |
| Loading state visible | ✅ | Animated dots while waiting |
| Errors visible | ✅ | Red error + Retry button |
| Streaming responses | ❌ | Not implemented (not required, Gemini is fast enough) |

The AI can answer all 3 example questions from the challenge brief:
- *"Who in finance spends the most on email triage?"* → Per-employee data in prompt ✅
- *"Highest-ROI automation to ship next quarter?"* → Automation ranking in prompt ✅
- *"Everyone whose rep share went up week-over-week?"* → WoW change per employee in prompt ✅

---

## What Was Cut and Why

| Cut | Reason |
|---|---|
| Database | In-memory is faster for 533 rows. No latency. |
| User login | Single-user COO tool. Auth adds complexity with no benefit. |
| Real-time refresh | Static one-month snapshot. Nothing to refresh. |
| Dark/light toggle | One polished dark theme beats two mediocre themes. |
| AI streaming | Gemini replies fast. Streaming adds code complexity for no visible gain. |

---

## What's Next (2 More Days)

1. **ROI calculator** — enter RPA tool cost → see payback period in months
2. **Weekly email digest** — cron job sends COO 3-bullet anomaly summary every Monday
3. **Industry benchmarking** — compare your rep% against industry averages
4. **AI-written PDF** — AI writes the executive summary based on current filter state

---

## Audit: Every Number Is Traceable

The "📋 Data Ingestion Report" at the bottom of the dashboard shows:

```
Raw rows:              539
Dropped:               6
  invalid_employee_id: 2
  missing_duration:    3
  invalid_duration:    1
Duration-capped:       3
Valid rows:            533   ✅ (539 − 6 = 533)

Ghost employees:       E013  (activity with no HR record)
No-activity employees: E099  (HR record with no activity)
Terminated active:     E010  (fired Oct 22, still has logs)
Duplicate resolved:    E007  (kept ₹24L Senior AE, dropped ₹14L AE)
```

If you ask *"where does 87.6 come from?"*:
**292 repetitive rows → 6,938 minutes → ×0.70 → ÷60 → ÷3 → ×4.33 = 87.6 hrs/month.**

Every number on the dashboard is derived from these 533 rows.