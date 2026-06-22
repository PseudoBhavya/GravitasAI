# Gravitas AI

Gravitas AI is a full-stack AI-powered productivity assistant that helps users manage emails, tasks, schedules, and personal productivity from a single dashboard.

The project combines Google integrations with AI-powered agents to reduce context switching and help users focus on important work.

---

## Features

### Authentication

* Google OAuth 2.0 Login
* JWT-based authentication
* Protected routes

### Email Intelligence

* Gmail integration
* Email synchronization
* AI-powered email classification
* Priority detection
* Email summaries
* Task extraction from emails

### Productivity Assistant

* Task management
* AI task prioritization
* Daily plan generation
* Productivity recommendations

### Calendar Integration

* Google Calendar integration
* Event synchronization
* Schedule analysis
* Calendar insights

### Wellness Assistant

* Burnout awareness
* Wellness recommendations
* AI-powered wellness coach
* Break suggestions

### Resilient AI Architecture

* Gemini-powered AI agents
* Rule-based fallback system
* Graceful degradation when AI services are unavailable

---

## AI Agents

### Communication Agent

Responsible for:

* Email classification
* Priority detection
* Email summaries
* Action item extraction

### Productivity Agent

Responsible for:

* Task prioritization
* Daily planning
* Workload analysis
* Calendar recommendations

### Wellness Agent

Responsible for:

* Burnout detection
* Wellness insights
* Coaching suggestions
* Break recommendations

---

## Tech Stack

### Frontend

* React.js
* React Router
* Zustand
* Axios

### Backend

* Node.js
* Express.js

### Database

* PostgreSQL
* Sequelize ORM

### AI & Integrations

* Gemini AI
* Google OAuth
* Gmail API
* Google Calendar API

---

## Project Structure

```text
backend/
├── src/
│   ├── agents/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   └── server.js

frontend/
├── src/
│   ├── components/
│   ├── services/
│   ├── store/
│   └── App.js
```

---

## Environment Variables

Create:

```text
backend/.env
```

Required variables:

```env
PORT=5000
NODE_ENV=development

FRONTEND_URL=http://localhost:3000

JWT_SECRET=your_secret
JWT_EXPIRES_IN=7d

DB_HOST=localhost
DB_PORT=5432
DB_NAME=gravitas_aiv2
DB_USER=your_db_user
DB_PASSWORD=your_db_password

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

GEMINI_API_KEY=
```

---

## Local Setup

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm start
```

---

## Future Improvements

* Weather integration
* News dashboard
* Team collaboration
* Smart meeting scheduling
* Mobile application

---

## Author

Bhavya Pandey
$PseudoBhavya$

Built as a full-stack project exploring AI-powered productivity systems, multi-agent architectures, and real-world API integrations.
