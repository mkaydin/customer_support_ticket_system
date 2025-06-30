
---

```markdown
# Customer Support Ticket System v0.4 🚀

A lightweight, extensible customer support ticketing system built with [Your Tech Stack, e.g. Python/Node.js + Express + MongoDB]. Designed to streamline ticket creation, assignment, tracking, and resolution workflows.

---

## 📦 Features (v0.4)

- **Ticket management** – open, update, assign, close tickets  
- **User roles** – agent vs customer access controls  
- **Commenting & history** – full audit trail on each ticket  
- **Email notifications** – alert on new tickets, updates, assignments  
- **Status and priority tagging** – track urgency & workflow status  
- **RESTful API** – interact via JSON endpoints for frontend or integration use

---

## 🛠️ Prerequisites

- Node.js ≥ 14 (or Python ≥ 3.9 if applicable)  
- MongoDB or your DB of choice  
- Optionally Docker & Docker Compose  

---

## 🚀 Quick Start

1. **Clone the repo**  
   ```bash
   git clone https://github.com/mkaydin/customer_support_ticket_system.git
   cd customer_support_ticket_system
   git checkout v0.4
```

2. **Install dependencies**
    
    ```bash
    npm install
    # or
    pip install -r requirements.txt
    ```
    
3. **Configure environment**  
    Create a `.env` file:
    
    ```env
    PORT=3000
    MONGODB_URI=mongodb://localhost:27017/tickets
    EMAIL_HOST=smtp.example.com
    EMAIL_USER=your@email.com
    EMAIL_PASS=secret
    ```
    
4. **Start the server**
    
    ```bash
    npm start
    # or with Docker:
    docker-compose up --build
    ```
    
5. **Access it**  
    Navigate to `http://localhost:3000/` and start filing tickets!
    

---

## 📋 API Endpoints

|Endpoint|Method|Description|
|---|---|---|
|`/api/tickets`|GET|List all tickets|
|`/api/tickets`|POST|Create a new ticket|
|`/api/tickets/:id`|GET|Fetch ticket by ID|
|`/api/tickets/:id`|PUT|Update ticket details or status|
|`/api/tickets/:id`|POST|Add comment to a ticket|
|`/api/users`|GET|List registered users (agents, customers)|
|`/api/users/:id`|GET|Fetch user info|

---

## 🧩 Architecture & Tech Stack

- **Backend**: Dotnet 9
    
- **Database**: Oracle Free Database 23ai
    
- **Authentication**: JWT-based or session-based
    
- **Frontend**: React Vite Typescript
    

---
