<h1 align="center"><strong>PocketWise</strong></h1>
<h3 align="center">Smart Financial Decision Assistant</h3>

<p align="center"><em>Because your money deserves a brain.</em></p>

---

## 🔴 Problem Statement

Most young people in India earn, spend, and repeat — without ever knowing where their money actually went.

Here's the reality for millions of students and young professionals:

- 💸 Salary credited on the 1st. By the 15th — gone. No idea why.
- 📱 Paying for subscriptions they forgot about.
- 🍕 Food delivery eating 40% of income without realising.
- 🎯 "I'll save next month" — said every month, forever.
- 📊 Banking apps show transactions. Not **insights**. Not **warnings**. Not **what to do**.

There is no simple, smart, free tool that tells a 22-year-old:

> *"You've spent 85% of your food budget in 18 days. You're on track to overspend by ₹2,300 this month. Reduce your daily spend by ₹77 to stay on track."*

**PocketWise solves exactly this.** It is not just an expense tracker. It is a financial decision-making system that watches your money, learns your patterns, fires alerts before you overspend, and tells you in plain language what to do.

---

## ⚙️ How It Works

Complete workflow from sign up to smart decisions:

**1. 🔐 Authentication**
User signs up with name, email and password. Password hashed with bcrypt. JWT token issued and stored — every protected route verified via JWT middleware.

**2. 💰 Income & Budget Setup**
User enters monthly income. System auto-suggests category allocations based on income percentage. User can freely add, edit or delete categories — fully dynamic, no fixed list. Examples: Food ₹8,000 · Travel ₹5,000 · Netflix ₹499 · Gym ₹2,000.

**3. 💸 Expense Tracking**
Add expenses with amount, category (free text), description and date. Category matches against user's budget — spending tracked in real time. Edit or delete any expense — budget automatically recalculates. Bulk import via CSV upload also supported.

**4. 🧠 Smart Insight Engine**
Runs on every dashboard load — pure logic, zero AI APIs. Computes budget usage percentage, daily average spend, week-on-week comparison and month-end projection. Generates dynamic plain-English messages based on real numbers.
Example: *"At your current pace you will overspend by ₹3,200 this month."*

**5. 🚨 Overspending Alerts**
Each category monitored independently. Warning fires at 80% of budget used. Danger fires when budget is exceeded. Shown on dashboard in real time and included in the PDF report.

**6. 🎯 Goal-Based Planning**
User sets a financial goal with title, amount and optional deadline. System computes whether they can afford it now, what the shortfall is, safe daily limit and months needed to save.
Example: *"Hotstar ₹499 — You need ₹312 more. Reduce daily spend by ₹42 for 8 days."*

**7. 📊 Analytics Dashboard**
Four Chart.js charts — pie chart for spending by category, bar chart for monthly trend (last 6 months), line chart for daily spending (last 30 days) and weekly comparison with percentage change.

**8. 📄 PDF Report Export**
One-click monthly report download. Includes summary cards, overspend analysis per category, all expenses grouped by category, smart insights and a concrete action plan.

---

## 🛠️ Tech Stack

### Backend

| Technology | Purpose |
|-----------|---------|
| Node.js 18+ | Runtime — fast, non-blocking I/O |
| Express.js 4 | REST API framework |
| MongoDB + Mongoose | Database — flexible schema for dynamic categories |
| JWT | Stateless authentication |
| bcryptjs | Password hashing (12 salt rounds) |
| multer + csv-parser | CSV bulk import |
| dotenv | Environment config management |
| cors | Secure browser-API communication |

### Frontend

| Technology | Purpose |
|-----------|---------|
| HTML5 + CSS3 | Structure and styling |
| Vanilla JavaScript ES6+ | Modular logic, Fetch API |
| Chart.js 4 | Data visualisation |
| jsPDF | Client-side PDF report generation |
| Google Fonts — Outfit + DM Sans | Fintech-grade typography |

### Architecture Patterns

| Pattern | How It's Used |
|---------|--------------|
| MVC | Models → Controllers → Routes → Frontend |
| REST API | Clean endpoints, proper HTTP status codes |
| JWT Middleware | Every protected route passes through auth.js |
| Dynamic Budget Engine | recalculateSpending() syncs on every expense change |
| Insight Engine | Pure percentage calculations, projections and comparisons |

---

## 🔗 Links

| Resource | URL |
|----------|-----|
| 🌐 Live App | https://pocketwise.onrender.com |
| 📦 GitHub | https://github.com/agameraki/pocketwise |

---

## 🚀 Future Advancements

- 🤖 **AI spending predictions** — Integrate Gemini API to predict next month's spending and give personalised advice based on patterns.
- 🗣️ **Natural language expense entry** — *"Spent 500 on groceries"* auto-parsed and logged without filling a form.
- 🏦 **Bank statement import** — Auto-parse PDF bank statements via OCR to log all transactions in one go.
- 📱 **Progressive Web App** — Install on phone home screen, receive budget alerts as push notifications.
- 💬 **WhatsApp bot** — Log expenses and check balance by sending a WhatsApp message.
- 👥 **Shared budgets** — Couples or roommates manage a household budget together in real time.
- 🏆 **Spending streaks & health score** — Gamified rewards for staying within budget with a monthly financial health score.
- 📈 **Investment tracker** — Track SIPs, FDs and stocks alongside expenses for net worth visibility.

---

## 💡 Why PocketWise is Actually Useful

Most apps tell you what happened. PocketWise tells you what to do.

| Regular Expense App | PocketWise |
|--------------------|------------|
| Shows: *"You spent ₹8,400 on food"* | Says: *"You overspent your food budget by ₹400. Reduce daily food spend by ₹53 next month."* |
| Shows a list of transactions | Groups them, calculates trends, fires alerts |
| Generic charts | Dynamic insights computed from your specific budget |
| Export to CSV | Professional PDF report with an overspend action plan |
| Fixed categories | You define your own — Gym, Netflix, Chai, anything |
| Just tracks spending | Also plans goals and tells you if you can afford them |

**The target user is real.**

A 23-year-old software fresher earning ₹35,000/month in Bangalore. Rent ₹12,000. Food delivery addiction. EMI on a phone. Three OTT subscriptions. Sends money home. By month 3 — ₹0 saved and no idea why.

PocketWise is the tool that speaks to this person in their language, tells them exactly where the money went, and gives them a concrete daily number to stick to. That is not just a feature. That is a habit-changing tool.

---

## 🏁 Summary

PocketWise is a production-ready, full-stack FinTech application that solves a real problem for a real audience.

✅ Strong backend architecture — MVC, REST, JWT, MongoDB aggregation pipelines

✅ Real business logic — Dynamic budget engine, insight calculations, affordability analysis

✅ Clean frontend — Modular JS, Chart.js, jsPDF, responsive dark/light UI

✅ Deployment ready — Render + MongoDB Atlas, environment config, CORS handled

✅ Resume quality — System design thinking, real-world problem solving, complete feature set

---

*Built with 💚 and a lot of financial anxiety*


