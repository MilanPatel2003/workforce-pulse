
## What this project actually is

Imagine you're a **boss (COO) of a 200-person company**. You want to know:
> *"My employees are spending 8 hours a day on their computers — but on WHAT? And which of those things could a computer/robot do automatically, saving us money?"*

That's it. That's the entire project.

---

## The data you were given

**File 1: `activity_logs.csv`** — Think of it like a timesheet log. Every row says:
> "Employee E007, on Oct 14th, used Salesforce for 18 minutes, doing CRM Updates, and it was repetitive"

**File 2: `employees.json`** — HR records. Who earns what salary, what department, what role.

The challenge is: **join these two messy files, clean them up, and build a dashboard that answers the COO's question.**

---

## Why it's "hard" (what makes it a real engineering test)

The files are intentionally dirty:
- Timestamps in 3 different formats (`2025-10-14`, `21/10/2025`, `2025-10-08T13:46`)
- `is_repetitive` written 11 ways: `TRUE`, `true`, `1`, `yes`, `Yes`, `no`, `NA`...
- Same app written as `gmail`, `Gmail`, ` Gmail ` (with space)
- Employee JSON has 3 different schema shapes — some fields are `EmployeeID`, some are `employee_id`
- One employee appears **twice** with conflicting salary
- One employee in activity logs has **no HR record** (so you can't calculate their cost)
- Salaries in 3 different units: annual INR, hourly INR, and "LPA" (Lakhs Per Annum)

Your code handles all of this.

---

## How to actually test it (step by step)

**Step 1 — Get a free Gemini API key** (for the AI chat feature):
1. Go to https://aistudio.google.com/app/apikey
2. Sign in with Google → click "Create API Key" → copy it

**Step 2 — Run the backend:**
```bash
cd workforce-pulse/backend
cp .env.example .env
# Open .env and paste your key: GEMINI_API_KEY=AIza...your key here
npm install
npm start
```
You should see:
```
✅ 533 valid rows loaded (6 dropped)
💰 Recoverable: 87.6 hrs/mo | ₹41,265/mo
🚀 Workforce Pulse API on http://localhost:4000
```

**Step 3 — Run the frontend** (new terminal):
```bash
cd workforce-pulse/frontend
npm install
npm run dev
```
Open http://localhost:5173 in your browser.

---

## What to look at when testing

**1. The big numbers at the top** — "87.6 hours/month recoverable" means: if you automate the repetitive tasks, you get back 87.6 hours of employee time per month. Click the **"? method"** button to see exactly how that's calculated.

**2. Time Sink Breakdown** — Click the tabs: "By Task", "By App", "By Department". The bars show where time is going. **Click a department bar** — notice how the employee list at the bottom updates. That's cross-filter #1.

**3. Automation Ranking table** — This ranks which tasks to automate first. **Click any row** (e.g. "Email Triage") — the employee list below filters to only people doing that task. That's cross-filter #2.

**4. Employee Drilldown** — Click any employee row to see their personal breakdown — top tasks, how their repetitive % compares to peers in the same role, weekly trend.

**5. The red anomaly banner at top** — It flags that E010 (a terminated employee) still has activity records logged. That's a real governance red flag.

**6. AI Assistant** — Click "✦ AI Assistant" (top right). Try asking:
- *"Who is spending the most time on repetitive tasks?"*
- *"Which department has the worst email triage problem?"*
- Then follow up: *"Break that down by employee"*
- It should answer using **real numbers from the data**, not made-up ones.

**7. Export PDF** — Apply a department filter (e.g. Sales), then click "↓ Export PDF". The downloaded PDF should show Sales-filtered numbers, not the full dataset.

**8. Ingestion Report** (bottom of page) — Click to expand. This shows the grader that you handled all the dirty data: 6 rows dropped, E007 duplicate resolved, E013 flagged, etc.

---

## How it maps to the challenge PDF's 6 requirements

| What brief asked | What you can see |
|---|---|
| Clean + join dirty data | Ingestion Report at the bottom |
| Headline numbers with methodology | Top two big cards + "? method" button |
| Time sink breakdown by task/app/dept | The tabbed bar chart |
| Automation ranking with formula | The table with "Score formula ℹ" button |
| Per-employee drilldown | Click any row in the employee table |
| Week-over-week trend | The line chart |
| Anomaly callout | Red banner at top |
| Two cross-filters | Dept sidebar + task ranking click |
| AI assistant, grounded, multi-turn | AI panel, right side |
| Export from live filter state | Export PDF button |
| Deployment config | render.yaml + vercel.json in the zip |
| README with methodology | README.md in the zip |

---
