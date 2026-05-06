# AI Assistant Test Questions

This file contains sample questions to test the AI assistant and expected outputs based on the normalized dataset.

## Question 1: Highest ROI Automation
**Question:** What is the single highest-ROI automation we should ship next quarter?

**Expected Output:**
- References the top task category from automation ranking (e.g., "Email Triage" or "Reconciliation").
- Cites the automation score and hours (e.g., "Email Triage has the highest automation score of 15.2 and represents 29.7 hours in Oct 2025").
- Ends with source citation like [Source: Automation Ranking, Oct 14–Nov 10, 2025].

## Question 2: Employee Cost Breakdown
**Question:** Who in finance is spending the most time on email triage, and how much does it cost us per month?

**Expected Output:**
- Names an employee from Finance department with high email triage time.
- Cites hours and cost (e.g., "Employee X in Finance spent 12.5 hours on email triage, costing ₹5,000 per month").
- If no exact match, says "I don't have that detail in the dataset."
- Includes date range.

## Question 3: Follow-up Conversation
**Question:** What should we automate next quarter? (Then follow up: And break that down by department.)

**Expected Output:**
- First response: Top automation task.
- Follow-up: Breaks down by department, citing department-specific metrics.
- Maintains conversation context.

## Question 4: Invalid Request
**Question:** What is the weather today?

**Expected Output:**
- "I don't have that detail in the dataset." or similar refusal to answer off-topic.

## Question 5: Filtered Context
**Question:** (After applying Sales department filter) What task should we automate first in Sales?

**Expected Output:**
- References Sales-specific data.
- Cites filtered metrics (e.g., "In Sales, Reconciliation has the highest score with 18.3 hours").
- Notes the filter in the response.

## Notes
- All responses must cite numbers from the dataset.
- No invented figures.
- Responses end with [Source: ...].
- Test multi-turn support.