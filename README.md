# Raffles Praslin Concierge System

A full-stack, production-ready concierge management application built for Raffles Praslin, Seychelles. Features a luxury guest-facing website, a full admin panel, and a concierge staff dashboard.

---

## Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | Next.js 14 (App Router) + Tailwind CSS |
| Backend    | NestJS (Node.js)                  |
| Database   | PostgreSQL 15 + Prisma ORM        |
| Auth       | JWT (RS256) + Role-Based Access   |
| Media      | Multer — disk storage             |
| Deployment | Docker + Docker Compose + Nginx   |

---

## Project Structure

```
concierge-app/
├── backend/                  # NestJS API
│   ├── src/
│   │   ├── auth/             # JWT auth, guards, strategy
│   │   ├── users/            # User CRUD (Admin only)
│   │   ├── categories/       # Category CRUD
│   │   ├── services/         # Service CRUD
│   │   ├── reservations/     # Reservation CRUD + status
│   │   ├── audit/            # Immutable audit log
│   │   ├── media/            # Image upload/delete
│   │   ├── settings/         # Site settings key-value
│   │   └── prisma/           # PrismaService (global)
│   ├── prisma/
│   │   ├── schema.prisma     # Full database schema
│   │   └── seed.ts           # All Excel data pre-loaded
│   └── Dockerfile
│
├── frontend/                 # Next.js App
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                      # Guest home
│   │   │   ├── services/[slug]/page.tsx       # Category detail
│   │   │   ├── login/page.tsx                 # Staff login
│   │   │   └── dashboard/
│   │   │       ├── layout.tsx                 # Sidebar layout
│   │   │       ├── page.tsx                   # Dashboard home
│   │   │       ├── reservations/              # Reservations CRUD
│   │   │       └── admin/                     # Admin-only pages
│   │   │           ├── services/
│   │   │           ├── categories/
│   │   │           ├── users/
│   │   │           └── settings/
│   │   └── lib/
│   │       ├── api.ts        # All API calls (axios)
│   │       └── auth.tsx      # Auth context + hook
│   └── Dockerfile
│
├── nginx/
│   └── nginx.conf            # Reverse proxy + rate limiting
│
├── scripts/
│   ├── install-deps.sh       # Install Docker on Ubuntu
│   ├── start.sh              # First-time start + seed
│   ├── update.sh             # Pull + redeploy
│   └── backup.sh             # PostgreSQL backup
│
├── docker-compose.yml
├── .env                      # Edit before deploying
└── README.md
```

---

## Roles & Permissions

| Feature                  | Concierge | Admin |
|--------------------------|:---------:|:-----:|
| View guest website       | ✅        | ✅    |
| Login to dashboard       | ✅        | ✅    |
| Create reservations      | ✅        | ✅    |
| Edit own reservations    | ✅        | ✅    |
| Edit any reservation     | ❌        | ✅    |
| Delete reservations      | ✅ (own)  | ✅    |
| View audit logs          | ✅        | ✅    |
| Manage services          | ❌        | ✅    |
| Manage categories        | ❌        | ✅    |
| Upload images            | ❌        | ✅    |
| Manage users             | ❌        | ✅    |
| Change site settings     | ❌        | ✅    |

---

## API Endpoints

### Auth
```
POST   /auth/login
```

### Categories (public read, admin write)
```
GET    /categories              # Visible only
GET    /categories?all=true     # All (auth required)
GET    /categories/:slug/by-slug
GET    /categories/:id
POST   /categories              # Admin only
PUT    /categories/:id          # Admin only
DELETE /categories/:id          # Admin only
```

### Services (public read, admin write)
```
GET    /services
GET    /services?categoryId=xxx
GET    /services?all=true       # Include hidden
GET    /services/:id
POST   /services                # Admin only
PUT    /services/:id            # Admin only
DELETE /services/:id            # Admin only
```

### Media (admin only)
```
POST   /media/services/:id/images    # Upload images (multipart)
DELETE /media/images/:imageId
```

### Reservations (authenticated)
```
GET    /reservations            # Own (Concierge) or all (Admin)
GET    /reservations/stats      # Dashboard stats
GET    /reservations/:id        # With audit log
POST   /reservations
PUT    /reservations/:id
DELETE /reservations/:id
```

### Audit (authenticated)
```
GET    /audit
GET    /audit?reservationId=xxx
```

### Settings
```
GET    /settings                # Public
PUT    /settings                # Admin only
```

### Users (admin only)
```
GET    /users
GET    /users/:id
POST   /users
PUT    /users/:id
DELETE /users/:id
```

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- Docker Desktop
- npm

### 1. Clone and configure
```bash
git clone <your-repo-url>
cd concierge-app
cp .env .env.local       # Edit values if needed
```

### 2. Start the database
```bash
docker compose up postgres -d
```

### 3. Run the backend
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npx ts-node prisma/seed.ts   # Seeds all Excel data
npm run start:dev
```

### 4. Run the frontend
```bash
cd frontend
npm install
npm run dev
```

Access:
- Guest site: http://localhost:3000
- Admin login: http://localhost:3000/login
- API: http://localhost:4000

---

## Production Deployment on Ubuntu Server

### Step 1 — Provision your server
Recommended: Ubuntu 22.04 LTS, minimum 2 vCPU / 2GB RAM (4GB preferred).

### Step 2 — SSH in and install dependencies
```bash
ssh user@your-server-ip
git clone <your-repo-url> /opt/concierge-app
cd /opt/concierge-app
bash scripts/install-deps.sh
```
Log out and back in after this step (required for docker group).

### Step 3 — Configure environment
```bash
cd /opt/concierge-app
nano .env
```
Set these values:
```env
POSTGRES_USER=concierge
POSTGRES_PASSWORD=<strong-random-password>
POSTGRES_DB=concierge_db

JWT_SECRET=<minimum-32-character-random-string>
JWT_EXPIRES_IN=7d
NODE_ENV=production

NEXT_PUBLIC_API_URL=http://your-server-ip-or-domain:4000
# OR if using domain with nginx proxy:
# NEXT_PUBLIC_API_URL=https://yourdomain.com
```

### Step 4 — Build and start
```bash
bash scripts/start.sh
```
This will:
1. Build all Docker images
2. Start all services (postgres, backend, frontend, nginx)
3. Run database migrations
4. Seed the database with all concierge data from Excel

### Step 5 — Verify
```bash
docker compose ps          # All services should be "Up"
docker compose logs -f     # Watch live logs
```

Access at: **http://your-server-ip**

Default credentials:
- **Admin:** admin@raffles-concierge.com / Admin@2024!
- **Concierge:** concierge@raffles-concierge.com / Concierge@2024!

⚠️ **Change both passwords immediately via the Users panel.**

---

## HTTPS / SSL Setup (optional but recommended)

### Using Let's Encrypt (Certbot)
```bash
sudo apt install certbot -y
sudo certbot certonly --standalone -d yourdomain.com

# Certificates will be at:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

Then update `nginx/nginx.conf`:
1. Uncomment the HTTPS server block
2. Set your domain name
3. Map the certificate paths into the nginx container in docker-compose.yml:
```yaml
nginx:
  volumes:
    - /etc/letsencrypt/live/yourdomain.com/fullchain.pem:/etc/nginx/ssl/fullchain.pem:ro
    - /etc/letsencrypt/live/yourdomain.com/privkey.pem:/etc/nginx/ssl/privkey.pem:ro
```
4. Restart: `docker compose restart nginx`

---

## Database Management

### View database in Prisma Studio
```bash
cd backend
npx prisma studio
```

### Manual backup
```bash
bash scripts/backup.sh
```

### Restore from backup
```bash
gunzip backups/concierge_backup_YYYYMMDD_HHMMSS.sql.gz
docker compose exec -T postgres psql -U concierge concierge_db < backups/concierge_backup_YYYYMMDD_HHMMSS.sql
```

### Run migrations after schema changes
```bash
docker compose exec backend npx prisma migrate deploy
```

---

## Updates / Redeployment

```bash
cd /opt/concierge-app
git pull
bash scripts/update.sh
```

---

## Environment Variables Reference

| Variable              | Required | Description                            |
|-----------------------|----------|----------------------------------------|
| POSTGRES_USER         | ✅       | Database username                      |
| POSTGRES_PASSWORD     | ✅       | Database password (use strong password)|
| POSTGRES_DB           | ✅       | Database name                          |
| JWT_SECRET            | ✅       | JWT signing secret (32+ chars)         |
| JWT_EXPIRES_IN        | ✅       | Token lifetime (e.g. 7d)              |
| NODE_ENV              | ✅       | production or development              |
| NEXT_PUBLIC_API_URL   | ✅       | Full URL to backend API                |
| PORT                  | ❌       | Backend port (default: 4000)           |
| UPLOAD_DIR            | ❌       | Image upload path (default: ./uploads) |
| FRONTEND_URL          | ❌       | CORS origin (default: *)               |

---

## Pre-loaded Data (from Excel)

All data from the concierge directory Excel file is pre-seeded:

| Category              | Services Count |
|-----------------------|---------------|
| Taxi & Transfers       | 15            |
| Boat Excursions        | 23            |
| Catamaran & Vessels    | 15            |
| Car Rental             | 5             |
| Golf                   | 4             |
| Helicopter Transfers   | 17            |
| **Total**              | **79**        |

All pricing, contact names, and phone numbers from the Excel file are included.

---

## Security Notes

- JWT tokens expire in 7 days (configurable)
- Rate limiting: 5 login attempts/min, 30 API calls/min per IP
- Admin-only routes are protected at both API and UI level
- Passwords are bcrypt-hashed (10 salt rounds)
- File uploads are validated by MIME type (images only, max 10MB)
- SQL injection is prevented by Prisma's parameterised queries
- CORS is configured to restrict origins in production
- Security headers added via Nginx (X-Frame-Options, HSTS etc.)

---

## Troubleshooting

**Backend fails to start:**
```bash
docker compose logs backend
# Check DATABASE_URL and that postgres is healthy
docker compose ps
```

**Seed fails on re-run:**
The seed uses `upsert` so re-running is safe. If it errors, check logs:
```bash
docker compose exec backend npx ts-node prisma/seed.ts
```

**Images not showing:**
Check the `NEXT_PUBLIC_API_URL` env var — it must be accessible from the browser.

**Cannot log in:**
Make sure seed ran successfully. Reset admin password:
```bash
docker compose exec backend node -e "
const {PrismaClient} = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();
bcrypt.hash('NewPassword123!', 10).then(h => p.user.update({where:{email:'admin@raffles-concierge.com'}, data:{password:h}})).then(console.log);
"
```
