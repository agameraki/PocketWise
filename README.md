<h1 align="center"><strong>PocketWise</strong></h1>
<h3 align="center">Smart Financial Decision Assistant</h3>

<p align="center"><em>Because your money deserves a brain.</em></p>

---

🔴 Problem Statement

Most young people in India earn, spend, and repeat — without ever knowing where their money actually went.

Here's the reality for millions of students and young professionals:

💸 Salary credited on the 1st. By the 15th — gone. No idea why.
📱 Paying for subscriptions they forgot about.
🍕 Food delivery eating 40% of income without realising.
🎯 "I'll save next month" — said every month, forever.
📊 Banking apps show transactions. Not insights. Not warnings. Not what to do.

There is no simple, smart, free tool that tells a 22-year-old:

"You've spent 85% of your food budget in 18 days. You're on track to overspend by ₹2,300 this month. Reduce your daily spend by ₹77 to stay on track."

💡 Solution

PocketWise is not just an expense tracker. It is a financial decision-making system that watches your money, learns your patterns, fires alerts before you overspend, and tells you in plain language what to do.

⚙️ How It Works
1. 🔐 Authentication

User signs up with name, email and password. Password hashed with bcrypt. JWT token issued and stored — every protected route verified via JWT middleware.

2. 💰 Income & Budget Setup

User enters monthly income. System auto-suggests category allocations based on income percentage.

User can freely:

Add
Edit
Delete categories

Examples: Food ₹8,000 · Travel ₹5,000 · Netflix ₹499 · Gym ₹2,000

3. 💸 Expense Tracking

Add expenses with:

Amount
Category (free text)
Description
Date

Category matches against user's budget — spending tracked in real time.

Edit/Delete supported
Budget recalculates automatically
CSV bulk import supported
4. 🧠 Smart Insight Engine

Runs on every dashboard load — pure logic, zero AI APIs.

Computes:

Budget usage percentage
Daily average spend
Week-on-week comparison
Month-end projection

Example:

"At your current pace you will overspend by ₹3,200 this month."

5. 🚨 Overspending Alerts

Each category monitored independently:

⚠️ Warning at 80% usage
❌ Danger when exceeded
Real-time dashboard alerts
Included in PDF reports
6. 🎯 Goal-Based Planning

User sets goal with title, amount and optional deadline.

System computes:

Affordability
Shortfall
Safe daily limit
Months needed

Example:

"Hotstar ₹499 — You need ₹312 more. Reduce daily spend by ₹42 for 8 days."

7. 📊 Analytics Dashboard
Pie chart → Spending by category
Bar chart → Monthly trend (6 months)
Line chart → Daily spending (30 days)
Weekly comparison with % change
8. 📄 PDF Report Export

One-click monthly report download.

Includes:

Summary cards
Overspend analysis
Grouped expenses
Smart insights
Action plan
🔐 Role-Based Access Control (RBAC)

PocketWise implements RBAC to ensure secure and structured access.

👥 User Roles
Role	Permissions
🛠️ Admin	Full access — manage expenses, budgets, goals, CSV import, reports
👀 Viewer	Read-only access — can view dashboard, insights and reports
⚙️ Implementation Details
Component	Description
Role Assignment	Stored as admin or viewer in user model
JWT Payload	Role embedded inside token
Auth Middleware	Verifies JWT
Authorization Middleware	Restricts access based on role
if (user.role !== 'admin') {
  return res.status(403).json({ message: 'Access denied' });
}
🔒 Security Benefits
Prevents unauthorized modifications
Ensures data integrity
Enables shared visibility without control
Aligns with real-world FinTech practices
💡 Use Case

A user can give viewer access to a partner or parent to monitor spending habits without allowing any edits — turning PocketWise into a financial accountability system.

🛠️ Tech Stack

Backend
Technology	Purpose
Node.js 18+	Runtime — fast, non-blocking I/O
Express.js 4	REST API framework
MongoDB + Mongoose	Flexible schema for dynamic categories
JWT	Stateless authentication
bcryptjs	Password hashing
multer + csv-parser	CSV bulk import
dotenv	Environment config
cors	Secure API communication

Frontend
Technology	Purpose
HTML5 + CSS3	Structure and styling
Vanilla JavaScript ES6+	Modular logic, Fetch API
Chart.js 4	Data visualisation
jsPDF	PDF generation
Google Fonts	Fintech-grade typography

🏗️ Architecture Patterns
Pattern	How It's Used
MVC	Models → Controllers → Routes → Frontend
REST API	Clean endpoints with HTTP status codes
JWT Middleware	Protects all secured routes
Dynamic Budget Engine	Real-time recalculation
Insight Engine	Computes projections & insights
RBAC Middleware	Controls access based on roles

🔗 Links
Resource	URL
🌐 Live App	https://pocketwise.onrender.com
📦 GitHub	https://github.com/agameraki/pocketwise

🚀 Future Advancements
🤖 AI spending predictions
🗣️ Natural language expense entry
🏦 Bank statement OCR import
📱 Progressive Web App
💬 WhatsApp bot
👥 Shared budgets
🏆 Spending streaks & health score
📈 Investment tracker

💡 Why PocketWise is Actually Useful

Regular Expense App	PocketWise
Shows past spending	Tells what to do next
Transaction list	Insights + trends + alerts
Generic charts	Personalized insights
CSV export	Smart PDF report
Fixed categories	Fully dynamic
Tracks spending	Guides decisions

🎯 Target User
A 23-year-old earning ₹35,000/month:
Rent ₹12,000
Food delivery addiction 🍕
EMI + subscriptions
Sends money home

Ends up with ₹0 savings and no clarity.

👉 PocketWise solves this with:

Real insights
Daily spending limits
Actionable advice
🏁 Summary

PocketWise is a production-ready full-stack FinTech application solving a real problem.

✅ Strong backend architecture
✅ Real financial logic
✅ Clean frontend
✅ Deployment ready
✅ Resume + interview ready

Built with 💚 and a lot of financial anxiety



