<h1 align="center"><strong>PocketWise</strong></h1>
<h3 align="center">Smart Financial Decision Assistant</h3>

<p align="center"><em>Because your money deserves a brain.</em></p>

---
## 🔴 Problem Statement

Most young people in India earn, spend, and repeat — without ever knowing where their money actually went.

Here's the reality for millions of students and young professionals:

- 💸 Salary credited on the 1st. By the 15th — gone. No idea why  
- 📱 Paying for subscriptions they forgot about  
- 🍕 Food delivery eating 40% of income without realising  
- 🎯 "I'll save next month" — said every month, forever  
- 📊 Banking apps show transactions. Not insights. Not warnings. Not what to do  

There is no simple, smart, free tool that tells a 22-year-old:

> "You've spent 85% of your food budget in 18 days. You're on track to overspend by ₹2,300 this month. Reduce your daily spend by ₹77 to stay on track."

PocketWise solves exactly this.

---

## ⚙️ How It Works

Complete workflow from sign up to smart decisions:

---

### 1. 🔐 Authentication

- User signs up with name, email and password  
- Password hashed with bcrypt  
- JWT token issued and stored  
- Every protected route verified via middleware  

---

### 2. 💰 Income & Budget Setup

- User enters monthly income  
- System auto-suggests category allocations  
- Fully dynamic categories  

**Examples:**  
Food ₹8,000 · Travel ₹5,000 · Netflix ₹499 · Gym ₹2,000  

---

### 3. 💸 Expense Tracking

- Add expense with:
  - Amount  
  - Category (free text)  
  - Description  
  - Date  

- Real-time tracking  
- Edit/Delete supported  
- CSV bulk import supported  

---

### 4. 🧠 Smart Insight Engine

Runs on every dashboard load — pure logic.

Computes:

- Budget usage percentage  
- Daily average spend  
- Week-on-week comparison  
- Month-end projection  

**Example:**

> "At your current pace you will overspend by ₹3,200 this month."

---

### 5. 🚨 Overspending Alerts

- ⚠️ Warning at 80% usage  
- ❌ Danger when exceeded  

- Real-time dashboard alerts  
- Included in PDF reports  

---

### 6. 🎯 Goal-Based Planning

- Set financial goals with amount and deadline  

System computes:

- Affordability  
- Shortfall  
- Safe daily limit  
- Months needed  

---

### 7. 📊 Analytics Dashboard

Four Chart.js charts:

- Pie chart → spending by category  
- Bar chart → monthly trend (last 6 months)  
- Line chart → daily spending (last 30 days)  
- Weekly comparison with percentage change  

---

### 8. 📄 PDF Report Export

One-click monthly report download.

Includes:

- Summary cards  
- Overspend analysis per category  
- All expenses grouped by category  
- Smart insights  
- Concrete action plan  

---

### 9. 🔐 Role-Based Access Control (RBAC)

PocketWise includes RBAC to ensure secure and controlled access.

#### 👥 Roles

- 🛠️ **Admin**
  - Full system access  
  - Add, edit, delete expenses  
  - Manage budgets and categories  
  - Set goals  
  - Import CSV  
  - Generate reports  

- 👀 **Viewer**
  - Read-only access  
  - Can view dashboard, insights and reports  
  - Cannot modify any data  

---

#### ⚙️ How it works

- Role (`admin` / `viewer`) stored in user model  
- Embedded inside JWT token  
- Every request passes through:
  - Authentication middleware (verify JWT)  
  - Authorization middleware (check role)  

## 🛠️ Tech Stack

### Backend

| Technology          | Purpose                                      |
|--------------------|----------------------------------------------|
| Node.js 18+        | Runtime — fast, non-blocking I/O             |
| Express.js 4       | REST API framework                          |
| MongoDB + Mongoose | Database — flexible schema                  |
| JWT                | Stateless authentication                    |
| bcryptjs           | Password hashing (12 salt rounds)           |
| multer + csv-parser| CSV bulk import                             |
| dotenv             | Environment config management               |
| cors               | Secure browser-API communication            |

---

### Frontend

| Technology                     | Purpose                           |
|------------------------------|-----------------------------------|
| HTML5 + CSS3                 | Structure and styling             |
| JavaScript ES6+              | Modular logic, Fetch API          |
| Chart.js 4                   | Data visualisation                |
| jsPDF                        | Client-side PDF report generation |
| Google Fonts (Outfit, DM Sans) | Fintech-grade typography        |

---

## 🏗️ Architecture Patterns

| Pattern                | How It's Used                                      |
|-----------------------|----------------------------------------------------|
| MVC                   | Models → Controllers → Routes → Frontend           |
| REST API              | Clean endpoints, proper HTTP status codes          |
| JWT Middleware        | Every protected route passes through auth          |
| Dynamic Budget Engine | Real-time recalculation on expense updates         |
| Insight Engine        | Percentage calculations, projections, comparisons  |
| RBAC Middleware       | Restricts access based on user role                |

---

## 🔗 Links

| Resource | URL |
|----------|-----|
| 🌐 Live App | https://pocketwise.onrender.com |
| 📦 GitHub | https://github.com/agameraki/pocketwise |

---

## 🚀 Future Advancements

- 🤖 AI spending predictions  
- 🗣️ Natural language expense entry  
- 🏦 Bank statement import via OCR  
- 📱 Progressive Web App  
- 💬 WhatsApp bot  
- 👥 Shared budgets  
- 🏆 Spending streaks & health score  
- 📈 Investment tracker  

---

## 💡 Why PocketWise is Actually Useful

| Regular Expense App            | PocketWise                          |
|-------------------------------|------------------------------------|
| Shows past spending           | Tells what to do next              |
| Transaction list              | Groups, analyzes, alerts           |
| Generic charts                | Dynamic insights                   |
| CSV export                    | Smart PDF report                   |
| Fixed categories              | Fully customizable                 |
| Tracks spending               | Guides financial decisions         |

---

## 🎯 Target User

A 23-year-old software fresher earning ₹35,000/month:

- Rent ₹12,000  
- Food delivery addiction  
- EMI on a phone  
- OTT subscriptions  
- Sends money home  

👉 Ends with **₹0 savings and no idea why**

PocketWise helps by:

- Showing where money went  
- Giving daily spending limits  
- Providing clear actions  

---

## 🏁 Summary

PocketWise is a production-ready, full-stack FinTech application that solves a real problem for a real audience.

- ✅ Strong backend architecture  
- - ✅ Real business logic  
- ✅ Clean frontend  
- ✅ Deployment ready  
- ✅ Resume quality  

---

**Built with 💚 and a lot of financial anxiety**
