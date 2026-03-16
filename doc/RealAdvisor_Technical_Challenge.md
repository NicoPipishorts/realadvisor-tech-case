## 🏡 RealAdvisor Technical Challenge — "Agent Dashboard"

**Time estimate:** 5-6 hours

**Context:**
Real estate agents need to track their property portfolio performance. Fake listings are a growing problem in the industry — agents and platforms need tools to detect and manage suspicious properties. Build a dashboard that combines portfolio analytics with a basic scam detection system.

---

### 🎯 Your Mission

Build a **real estate agent dashboard** with **fake listing detection** from scratch.

---

### Technical Requirements

**Mandatory:**

- **Backend:** Node.js + TypeScript + GraphQL
- **Database:** PostgreSQL
- **Frontend:** React + TypeScript
- **Authentication:** Basic JWT or session-based

**Everything else is your choice** — ORM, GraphQL server, UI library, charting, project structure. Justify your choices in SOLUTION.md.

---

### 📊 Data Model

Design the database schema yourself. Here's what the system needs to support:

- **Agents** belong to agencies and have portfolios of properties
- **Properties** go through a lifecycle: `draft → active → sold | archived`
- Properties have standard real estate attributes (price, surface, location, type, etc.)
- Properties can optionally be **co-listed** with another agent
- **Property views** are tracked — who viewed what and when (including anonymous visitors)
- Properties can be **flagged** as suspicious with a confidence score and reason(s)

**Seed data:**

- 3 agents across 2 agencies, with 20-30 properties each
- Mix of statuses (active, sold, archived, draft)
- Generate realistic view history over the last 3 months
- Include 3-5 intentionally suspicious listings in the seed data (e.g., unrealistically low price/m², duplicate descriptions across agents)
- Provide a seed script

> **In SOLUTION.md:** include your full schema with reasoning for your design choices — normalization decisions, index strategy, why you structured relationships the way you did.

---

### Requirements

#### **Backend**

**GraphQL Queries:**

**Dashboard Stats** (for logged-in agent):

- Total properties by status
- Total views (all time + last 30 days)
- Recent sales (count + total revenue last 30 days)
- Average time to sell (from active → sold)
- Top 5 most viewed properties

**Property Management:**

- List agent's properties (with filters: status, date range)
- Get single property with view history
- Pagination for lists

**Scam Detection:**

- List flagged properties with scores and reasons
- Get detection stats (total flagged, auto-detected vs. manually reported)

**GraphQL Mutations:**

- Create property
- Update property (including status changes)
- Delete property
- Record property view (can be called without auth for public tracking)
- Dismiss flag / confirm as scam (changes property status)

**Performance:**

- Dashboard stats must be fast — assume 100k+ properties per agent at scale
- View tracking should handle high traffic without slowing down other mutations
- Use proper indexes

---

#### **Fake Listing Detection**

Implement a basic scam detection system:

**Detection rules** — implement at least 2 concrete rules, for example:

- Price per m² significantly below the average for similar properties (requires computing baseline stats)
- Duplicate detection — same address or very similar title/description posted by different agents
- Suspicious patterns — e.g., new agent posting many high-value listings in a short period

**Flagging system:**

- Properties can be flagged as `suspicious` with a confidence score (0-100) and reason(s)
- Detection can run on property creation/update — synchronous or asynchronous, your choice
- Flags include: rule that triggered, confidence score, details

**Review UI:**

- Dashboard section or page showing flagged properties with reasons
- Agents can see if their own listings were flagged
- Actions: dismiss flag (with reason) or confirm as scam (archives the property)

> **In SOLUTION.md:** explain which detection rules you chose and why, how you'd extend this to handle more sophisticated scams, and the trade-offs between false positives and false negatives in your approach.

---

#### **Frontend**

**Login Page:**

- Email/password authentication

**Dashboard Page (protected):**

- Welcome header with agent name
- **Stats Cards:**
  - Total active properties
  - Total views (this month)
  - Properties sold (this month)
  - Average days to sell
- **Chart/Graph:**
  - Views over time (last 30 days) — any charting library
- **Top Properties Table:**
  - Show 5 most viewed properties with view counts
- **Flagged Listings Section:**
  - Show properties flagged as suspicious with scores and reasons
  - Quick actions to dismiss or confirm

**Properties Page:**

- List all agent's properties
- Filter by status (tabs or dropdown)
- Each row/card shows: title, price, status, view count, created date
- Visual indicator for flagged properties
- "Edit" and "Delete" actions
- "Add Property" button

**Add/Edit Property Form:**

- All property fields
- Status selector
- Form validation
- Save/Cancel actions

**UX:**

- Loading states
- Error handling
- Confirmation before destructive actions
- Success/error messages after actions
- Responsive design

---

### 🔍 Code Review Exercise

Review the following code as if it were a teammate's pull request. Write your review in a file called `CODE_REVIEW.md` — explain what issues you see, why they matter, and how you'd fix them.

```typescript
const dashboardStats = async (_: unknown, __: unknown, { agentId, db }: Context) => {
  const properties = await db.query(
    `SELECT * FROM properties WHERE agent_id = $1`, [agentId]
  );

  const totalViews = properties.rows.reduce(async (sum, p) => {
    const views = await db.query(
      `SELECT COUNT(*) FROM property_views WHERE property_id = $1`, [p.id]
    );
    return (await sum) + parseInt(views.rows[0].count);
  }, Promise.resolve(0));

  const sold = properties.rows.filter(p => p.status === 'sold');
  const avgDaysToSell = sold
    .map(p => (new Date(p.sold_date).getTime() - new Date(p.created_at).getTime()) / 86400000)
    .reduce((a, b) => a + b, 0) / properties.rows.length;

  const recentSales = properties.rows.filter(
    p => p.status === 'sold' && p.sold_date > Date.now() - 30 * 86400000
  );

  return { totalViews: await totalViews, avgDaysToSell, recentSalesCount: recentSales.length };
};
```

---

### 💡 Propose a Feature

> If you had 2 more hours, what would you add and why? Be specific — describe the data model changes, API additions, and UI components. No need to implement it.

---

### 📋 Deliverables

**1. GitHub Repository:**

- Clean project structure
- Meaningful, atomic commits that show your development process — we review git history

**2. README.md:**

- Setup instructions (database, env vars, run commands)
- How to seed data

**3. SOLUTION.md:**

- Database schema with reasoning
- Architecture decisions (libraries, patterns, project structure)
- Scam detection: rules chosen, trade-offs, how you'd extend it
- Dashboard stats: how you calculated them (queries or logic)
- What you'd improve with more time

**4. CODE_REVIEW.md:**

- Your review of the code snippet above

**5. Code Quality:**

- Clean TypeScript
- Proper error handling
- Formatted code

---

### 🎯 Evaluation Criteria

**Architecture & Design (25%):**

- Database schema quality and justification
- Scam detection approach and trade-off reasoning
- SOLUTION.md depth and clarity

**Scam Detection (20%):**

- Detection rules: quality, correctness, edge case handling
- Scoring logic and thresholds
- Review UI usability

**Functionality (20%):**

- Dashboard shows accurate stats
- Property CRUD works correctly
- View tracking works
- Auth protects routes

**Code Review (15%):**

- Issues identified in the code snippet
- Quality of explanations and suggested fixes
- Depth of analysis (surface-level vs. architectural)

**Code Quality & DX (10%):**

- TypeScript usage, project structure
- Git history (atomic commits, meaningful messages)
- Error handling

**UX & Polish (10%):**

- Dashboard is clear and useful
- Good visual hierarchy
- Responsive and polished

**Bonus:**

- Integration test that catches a real edge case in your detection logic
- Explain how you'd scale scam detection to millions of listings
- Real-time updates on flagged properties

---

### 📤 Submission

1. Push to a **public GitHub repository**
2. Email the link to: **guillaume@realadvisor.com, jonas@realadvisor.com**
3. Include: your name + time spent

**Deadline:** 5 days from receiving this challenge

> **Note:** We may schedule a 30-minute follow-up call where we'll ask you to walk through your code and extend it with a small feature. Using AI tools during the challenge is fine — we use them daily — but you should be able to explain and modify every line of your submission.

---

### ❓ Questions?

Email us if you need clarification. Asking good questions is a positive signal, not a negative one.

**Good luck! 🚀**
