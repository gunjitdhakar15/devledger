# DevLedger

**High-Performance Project Management Dashboard** - Modern team collaboration with real-time analytics, task tracking, and role-based access control.

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
git clone https://github.com/yourusername/devledger.git
cd devledger

# Install backend dependencies
cd backend
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your MongoDB connection string
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
# Development mode (with hot reload)
npm run dev

# Production build
npm run build
npm start
```

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

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Run production build |
| `npm run lint` | Lint TypeScript files |
| `npm run typecheck` | Type-check without emit |
| `npm run test` | Run test suite |
| `npm run db:seed` | Seed database |
| `npm run db:status` | Check database status |
| `npm run db:reset` | Reset database |

## 📝 License

MIT
