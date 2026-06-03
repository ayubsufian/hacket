# HackET - Centralized Hackathon Management System

A comprehensive, bilingual (English & Amharic) multi-tenant platform for managing hackathons in Ethiopia. HackET streamlines event organization, participant management, judging, and real-time communications.

## 🌟 Key Features

- **Event Management** - Create, configure, and manage multiple hackathons
- **Bilingual Support** - Full English and Amharic language support
- **Multi-Tenant Architecture** - Support for multiple organizations
- **Team Management** - Team registration, matching, and coordination
- **Judging System** - Streamlined judging workflows and scoring
- **Notifications** - Real-time notifications with multiple channels
- **Analytics & Reporting** - Event insights and performance metrics
- **Certificate Management** - Automated certificate generation
- **Mentorship Program** - Connect participants with mentors
- **Real-time Communication** - WebSocket-based live updates

## 📋 Project Structure

```
hacket/
├── apps/
│   └── backend/              # Node.js/Express backend server
├── frontend/                 # React/TypeScript frontend
├── packages/
│   └── database/             # Prisma database configuration
├── tests/                    # Test suites (unit, integration, e2e, etc.)
├── docker-compose.yml        # Local development services
└── README.md                 # This file
```

## 🏗️ Architecture

### Backend (`apps/backend`)
- **Framework**: Express.js (Node.js)
- **Database ORM**: Prisma
- **Database**: PostgreSQL
- **Cache**: Redis
- **Real-time**: Socket.IO
- **Authentication**: JWT
- **Validation**: Joi
- **Email**: Nodemailer

### Frontend (`frontend`)
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Icons**: Lucide React

### Database (`packages/database`)
- **ORM**: Prisma
- **Schema**: Multi-tenant design supporting multiple organizations

## 🚀 Getting Started

### Prerequisites

- **Node.js** v16 or higher
- **npm** or **yarn** package manager
- **Docker** (for PostgreSQL and Redis)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hacket
   ```

2. **Install dependencies** (from root directory)
   ```bash
   npm install
   ```

3. **Start local services** (PostgreSQL and Redis)
   ```bash
   docker compose up -d
   ```

4. **Set up environment variables**
   
   Create `.env` file in the `apps/backend` directory:
   ```env
   # Database
   DATABASE_URL="postgresql://postgres:password@localhost:5432/hacket_db"
   
   # Redis
   REDIS_URL="redis://localhost:6379"
   
   # JWT
   JWT_SECRET="your-secret-key"
   JWT_EXPIRY="7d"
   
   # Server
   PORT=3000
   NODE_ENV="development"
   
   # Email (Nodemailer)
   SMTP_HOST="smtp.example.com"
   SMTP_PORT=587
   SMTP_USER="your-email@example.com"
   SMTP_PASSWORD="your-password"
   ```

5. **Initialize the database**
   ```bash
   cd apps/backend
   npm run db:generate
   npm run db:migrate
   npm run db:seed    # Optional: seed with sample data
   ```

6. **Start the backend server**
   ```bash
   cd apps/backend
   npm run dev
   ```
   Backend runs at `http://localhost:3000`

7. **Start the frontend development server** (from root)
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend runs at `http://localhost:5173`

## 📦 Available Scripts

### Root Level
- `npm install` - Install all dependencies for monorepo

### Backend (`apps/backend`)
- `npm run dev` - Start development server with hot reload (nodemon)
- `npm start` - Start production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with initial data
- `npm test` - Run test suite

### Frontend (`frontend`)
- `npm run dev` - Start development server with hot reload (Vite)
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## 🔧 Configuration

### Environment Setup

The application uses environment variables for configuration. Key configurations:

- **Database**: PostgreSQL via Prisma ORM
- **Cache**: Redis for session and data caching
- **Email**: Nodemailer with SMTP configuration
- **Authentication**: JWT-based token authentication

### Docker Services

The `docker-compose.yml` provides:
- **PostgreSQL** (Port 5432)
- **Redis** (Port 6379)

Start services:
```bash
docker compose up -d
```

Stop services:
```bash
docker compose down
```

Reset data:
```bash
docker compose down -v
```

## 📚 API Documentation

The backend provides RESTful APIs for:

- **Authentication** - Login, signup, password reset
- **Events** - Create and manage hackathon events
- **Submissions** - Handle team submissions
- **Judging** - Manage judging workflows
- **Notifications** - Send and manage notifications
- **Profile** - User profile management
- **Matching** - Team matching algorithms
- **Admin** - Administrative functions
- **Analytics** - Event analytics and reporting

Refer to the API controller files in `apps/backend/src/controllers/` for detailed endpoints.

## 🧪 Testing

Testing infrastructure is available in the `tests/` directory:

- **Unit Tests** - `tests/unit/`
- **Integration Tests** - `tests/integration/`
- **E2E Tests** - `tests/e2e/`
- **Functional Tests** - `tests/functional/`
- **UAT Tests** - `tests/uat/`
- **Usability Tests** - `tests/usability/`

To run tests:
```bash
npm test
```

## 📝 Project Features

### Core Modules

| Module | Purpose |
|--------|---------|
| **Auth** | User authentication and authorization |
| **Events** | Hackathon event management |
| **Teams** | Team creation and management |
| **Submissions** | Team submission handling |
| **Judging** | Judging workflows and scoring |
| **Notifications** | Multi-channel notifications |
| **Analytics** | Event metrics and reporting |
| **Admin** | Administrative dashboard |
| **Matching** | Intelligent team matching |
| **Mentorship** | Mentor-participant connections |
| **Certificates** | Certificate generation |
| **Storage** | File storage management |

## 📱 Notifications System

HackET includes a comprehensive notifications system with:
- Email notifications
- In-app notifications
- Real-time WebSocket updates
- Notification preferences
- Batch notification scheduling

See `NOTIFICATIONS.md` for detailed notification types and configurations.

## 🌍 Language Support

The platform supports:
- **English** (en)
- **Amharic** (am)

Language switching is available in user settings and controlled via the LanguageContext.

## 🔐 Security Features

- **JWT Authentication** - Secure token-based auth
- **Rate Limiting** - Express rate-limit middleware
- **Helmet** - HTTP security headers
- **CORS** - Cross-origin resource sharing
- **Input Validation** - Joi schema validation
- **Password Hashing** - bcryptjs for secure password storage

## 🤝 Contributing

To contribute to the project:

1. Create a feature branch
2. Make your changes
3. Run tests to ensure everything works
4. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 👥 Authors

**Senior Research Project Team**

## 📞 Support

For issues, questions, or suggestions, please contact the development team or open an issue in the repository.

## 🚢 Deployment

For production deployment:

1. Set up environment variables for production
2. Build the frontend: `npm run build`
3. Configure database and Redis for production
4. Start the backend server: `npm start`
5. Deploy frontend static files to a CDN or web server

## 📖 Additional Resources

- **Notifications Guide**: See [NOTIFICATIONS.md](NOTIFICATIONS.md)
- **API Endpoints**: Check `apps/backend/src/routes/`
- **Data Models**: Review `packages/database/prisma/schema.prisma`
