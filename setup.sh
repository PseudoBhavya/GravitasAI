#!/bin/bash
# ────────────────────────────────────────────────────────────
#  Gravitas AI v2 — Setup Script (macOS)
#  Run once: chmod +x setup.sh && ./setup.sh
# ────────────────────────────────────────────────────────────

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  GRAVITAS AI v2 — Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Check Node
if ! command -v node &>/dev/null; then
  echo -e "${RED}✗ Node.js not found. Install from https://nodejs.org${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Node $(node -v)${NC}"

# 2. Check PostgreSQL
if ! command -v psql &>/dev/null; then
  echo -e "${YELLOW}⚠ psql not found. Install: brew install postgresql@16 && brew services start postgresql@16${NC}"
else
  echo -e "${GREEN}✓ PostgreSQL found${NC}"
fi

# 3. Create .env if missing
if [ ! -f "backend/.env" ]; then
  cp backend/.env.example backend/.env
  echo -e "${YELLOW}⚠ Created backend/.env — FILL IN YOUR API KEYS BEFORE RUNNING${NC}"
  echo ""
  echo "  Required fields in backend/.env:"
  echo "  - GOOGLE_CLIENT_ID"
  echo "  - GOOGLE_CLIENT_SECRET"
  echo "  - GEMINI_API_KEY"
  echo "  - DB_USER (your Mac username — run: whoami)"
  echo ""
else
  echo -e "${GREEN}✓ backend/.env exists${NC}"
fi

# 4. Create database
DB_USER=$(grep DB_USER backend/.env | cut -d= -f2 | tr -d ' ')
DB_NAME=$(grep DB_NAME backend/.env | cut -d= -f2 | tr -d ' ')
if [ -n "$DB_USER" ] && [ "$DB_USER" != "your_mac_username" ]; then
  psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null && \
    echo -e "${GREEN}✓ Database '$DB_NAME' created${NC}" || \
    echo -e "${GREEN}✓ Database '$DB_NAME' already exists${NC}"
else
  echo -e "${YELLOW}⚠ Set DB_USER in backend/.env then run: psql -U <your_user> -d postgres -c 'CREATE DATABASE gravitas_ai;'${NC}"
fi

# 5. Install backend deps
echo ""
echo "Installing backend dependencies…"
cd backend && npm install --silent && cd ..
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

# 6. Install frontend deps
echo "Installing frontend dependencies…"
cd frontend && npm install --silent && cd ..
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}  Setup complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  1. Fill in backend/.env with your API keys"
echo "  2. Terminal 1: cd backend && npm run dev"
echo "  3. Terminal 2: cd frontend && npm start"
echo "  4. Visit http://localhost:3000"
echo ""
echo "Debug OAuth config: http://localhost:5000/api/auth/debug"
echo ""
