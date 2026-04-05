<h1 align="center"><strong>PocketWise</strong></h1>
<h3 align="center">Smart Financial Decision Assistant</h3>

<p align="center"><em>Because your money deserves a brain.</em></p>

---
🔴 Problem Statement

Most young people in India earn, spend, and repeat — without ever knowing where their money actually went.

Here's the reality for millions of students and young professionals:

💸 Salary credited on the 1st. By the 15th — gone. No idea why
📱 Paying for subscriptions they forgot about
🍕 Food delivery eating 40% of income without realising
🎯 "I'll save next month" — said every month, forever
📊 Banking apps show transactions — not insights, not warnings, not actions

There is no simple tool that tells a 22-year-old:

"You've spent 85% of your food budget in 18 days. You're on track to overspend by ₹2,300. Reduce your daily spend by ₹77."

💡 Solution

PocketWise is not just an expense tracker.

It is a financial decision-making system that:

Tracks spending
Learns patterns
Predicts overspending
Gives clear, actionable advice
⚙️ How It Works

Complete workflow from sign up to smart decisions:

1. 🔐 Authentication
User signs up with name, email and password
Password hashed using bcrypt
JWT token issued
Protected routes secured via middleware
2. 💰 Income & Budget Setup
User enters monthly income
System suggests category allocations
Fully dynamic categories

Examples:
Food ₹8,000 · Travel ₹5,000 · Netflix ₹499 · Gym ₹2,000

3. 💸 Expense Tracking
Add expense with:
Amount
Category
Description
Date
Real-time tracking
Edit/Delete supported
CSV bulk upload supported
4. 🧠 Smart Insight Engine

Runs on every dashboard load — pure logic.

Calculates:

Budget usage %
Daily average spend
Weekly trends
Month-end projection

Example:

"At your current pace you will overspend by ₹3,200."

5. 🚨 Overspending Alerts
⚠️ Warning at 80%
❌ Danger at 100%
Real-time alerts
Included in reports
6. 🎯 Goal-Based Planning
Set financial goals
System calculates:
Affordability
Shortfall
Daily limit
Time required
7. 📊 Analytics Dashboard

Four Chart.js charts:

Pie chart → spending by category
Bar chart → monthly trend (6 months)
Line chart → daily spending (30 days)
Weekly comparison with % change
8. 📄 PDF Report Export

One-click monthly report download.

Includes:

Summary cards
Overspend analysis
Expenses grouped by category
Smart insights
Action plan
9. 🔐 Role-Based Access Control (RBAC)

PocketWise includes RBAC for secure access control.

👥 Roles
🛠️ Admin
Full access
Manage expenses, budgets, goals
Import CSV
Generate reports
👀 Viewer
Read-only access
Can view dashboard & reports
Cannot modify data
⚙️ Implementation
Role stored in user model (admin / viewer)
Embedded in JWT
Middleware flow:
Authentication → verify token
Authorization → check role
if (user.role !== 'admin') {
  return res.status(403).json({ message: 'Access denied' });
}
🛠️ Tech Stack
Backend
Technology	Purpose
Node.js 18+	Runtime — fast, non-blocking I/O
Express.js 4	REST API framework
MongoDB + Mongoose	Flexible database
JWT	Authentication
bcryptjs	Password hashing
multer + csv-parser	CSV import
dotenv	Config management
cors	API security

Frontend
Technology	Purpose
HTML5 + CSS3	Structure & styling
JavaScript ES6+	Logic
Chart.js 4	Data visualization
jsPDF	PDF generation
Google Fonts	Typography

🏗️ Architecture Patterns
Pattern	Usage
MVC	Models → Controllers → Routes
REST API	Clean endpoints
JWT Middleware	Secures routes
Dynamic Budget Engine	Real-time updates
Insight Engine	Data analysis
RBAC Middleware	Role-based access
🔗 Links
Resource	URL
🌐 Live App	https://pocketwise.onrender.com
📦 GitHub	https://github.com/agameraki/pocketwise

🚀 Future Advancements
🤖 AI predictions
🗣️ Natural language input
🏦 OCR bank import
📱 PWA support
💬 WhatsApp bot
👥 Shared budgets
🏆 Financial score
📈 Investment tracker

💡 Why PocketWise is Actually Useful
Regular App	PocketWise
Shows past data	Guides decisions
Transaction list	Insights + alerts
Static charts	Smart projections
CSV export	Actionable PDF
Fixed categories	Fully dynamic
🎯 Target User

A 23-year-old earning ₹35,000/month:

Rent ₹12,000
Food delivery addiction
EMI + subscriptions
Sends money home

👉 Ends with ₹0 savings

PocketWise helps by:

Showing where money went
Giving daily spending limits
Providing clear actions
🏁 Summary

PocketWise is a production-ready full-stack FinTech application.

✅ Strong backend
✅ Real financial logic
✅ Clean UI
✅ Deployment ready
✅ Resume-ready project

Built with 💚 and a lot of financial anxiety
