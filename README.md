# DevLedger

**High-Performance Project Management Dashboard** - Modern team collaboration with real-time analytics, task tracking, and role-based access control.

### ✨ Features
- **Real-time Collaboration**: Instant updates across all clients
- **Role-based Access Control**: Granular permissions for Admin, Manager, and Developer roles
- **Task & Project Management**: Organize work efficiently with drag-and-drop support
- **Rich Analytics**: Dashboard statistics and progress tracking

![Status](https://img.shields.io/badge/status-under%20development-yellow)
![License](https://img.shields.io/badge/license-MIT-blue)

## 🚀 Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Fastify 5 + TypeScript |
| **Database** | MongoDB + Mongoose |
| **Auth** | JWT with Refresh Token Rotation |
| **Frontend** | React + Vite + TailwindCSS |

## 📦 Quick Start

### Prerequisites
- Node.js 20+
- MongoDB (local or [MongoDB Atlas](https://cloud.mongodb.com/))

### Installation

```bash
# Clone the repository
git clone https://github.com/gunjitdhakar15/devledger.git
cd devledger

# Install backend dependencies
cd backend
npm install

# Set up backend environment variables
cp .env.example .env
# Edit .env with your MongoDB connection string

# Install frontend dependencies
cd ../frontend
npm install

# Optional: set frontend API endpoint
cp .env.example .env
```

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/devledger
JWT_SECRET=your-super-secret-key-minimum-32-characters
FRONTEND_URL=http://localhost:5173
```

### Running the Application

```bash
# Backend development mode
cd backend
npm run dev

# Frontend development mode
cd ../frontend
npm run dev

# Frontend production build
cd frontend
npm run build

# Backend deploy/runtime check
cd ../backend
npm run build
npm start
```

### Frontend Modes

- **Live mode**: Sign in with a seeded account and the UI will use the backend API at `VITE_API_URL`
- **Demo mode**: The UI falls back to portfolio-safe demo data when no API session is available

## 🗄️ Database Management

DevLedger includes built-in scripts for database management:

```bash
# Seed database with sample data
npm run db:seed

# Clear and reseed database
npm run db:seed:clean

# Check database status and statistics
npm run db:status

# Reset database (delete all data)
npm run db:reset
```

### Sample Data

After seeding, the database includes:
- **6 Users**: Admin, Manager, 3 Developers, Viewer
- **4 Projects**: Various statuses (Active, Planning, On Hold)
- **12 Tasks**: Different priorities and statuses

**Test Credentials:**
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@devledger.com | Admin@123456 |
| Manager | sarah.manager@devledger.com | Manager@123456 |
| Developer | john.dev@devledger.com | Developer@123456 |

## 📁 Project Structure

```
devledger/
├── docs/
│   ├── runbooks/       # Deployment and production guides
│   └── product/        # Feature and workflow documentation
├── backend/
│   ├── src/
│   │   ├── config/         # Environment & configuration
│   │   ├── modules/        # Feature modules (auth, users, projects, tasks)
│   │   ├── plugins/        # Fastify plugins (db, auth, audit)
│   │   ├── scripts/        # Database seeding & utilities
│   │   └── common/         # Shared utilities
│   └── package.json
├── frontend/
│   └── src/
└── README.md
```

## 📚 Documentation

- [Documentation Index](./docs/README.md)
- [Deployment Runbook](./docs/runbooks/deployment.md)
- [Production Readiness Guide](./docs/runbooks/production-readiness.md)
- [Feature Reference](./docs/product/features.md)
- [Workflow Guide](./docs/product/workflows.md)

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Prepare the app for deployment |
| `npm run start` | Run the backend with `tsx` |
| `npm run lint` | Lint TypeScript files |
| `npm run typecheck` | Type-check without emit |
| `npm run test` | Run test suite |
| `npm run db:seed` | Seed database |
| `npm run db:status` | Check database status |
| `npm run db:reset` | Reset database |

## 🚢 Free Deployment Path

- **Frontend**: Deploy the `frontend` folder to Vercel with `npm run build`, output directory `dist`, and `VITE_API_URL=https://devledger.onrender.com/api/v1`
- **Backend**: Deploy the `backend` folder to Render and run `npm ci --omit=dev && npm run build` as the build command, then `npm start`
- **Database**: Use MongoDB Atlas free tier and set `MONGODB_URI`, `JWT_SECRET`, and `FRONTEND_URL` in your backend environment
- **CORS**: After Vercel deploys, set Render's `FRONTEND_URL` to the exact Vercel app URL and redeploy the backend

## 📝 License

MIT

