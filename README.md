# HUMN Voice Collection Platform API

A Node.js Express API for the HUMN voice collection platform where verified users record 5-second audio clips daily, which are then composed into daily "world anthems" by AI.

## 🎯 Project Overview

HUMN is a revolutionary voice collection platform that brings together voices from around the world to create daily anthems. Users can record 5-second audio clips, contribute to the global chorus, and listen to AI-composed anthems that represent the collective voice of humanity.

## 🚀 Features

- **User Authentication** with World ID integration
- **Audio Contribution** system with daily recording limits
- **AI-Powered Anthem Generation** from user contributions
- **Global Statistics** and leaderboards
- **Geographic Tracking** of contributions
- **Notification System** for daily reminders
- **Admin Panel** for system management
- **Download System** for anthem licensing
- **Comprehensive API** with 50+ endpoints

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- MongoDB (for production)
- Redis (for caching and queues)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend-humn
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **For production**
   ```bash
   npm start
   ```

## 🔧 Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

### Required Variables
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3000)
- `JWT_SECRET` - JWT signing secret
- `DATABASE_URL` - MongoDB connection string

### Optional Variables
- `REDIS_URL` - Redis connection string
- `WORLD_ID_APP_ID` - World ID application ID
- `OPENAI_API_KEY` - OpenAI API key for AI features
- `AWS_S3_BUCKET` - S3 bucket for file storage

## 📡 API Endpoints

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication
- `POST /auth/world-id/verify` - Verify World ID
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user
- `GET /auth/me` - Get current user info

### Users
- `GET /users/:userId` - Get user by ID
- `PATCH /users/:userId` - Update user profile
- `GET /users/:userId/stats` - Get user statistics
- `DELETE /users/:userId` - Delete user account

### Contributions
- `GET /contributions/check-daily` - Check daily contribution status
- `POST /contributions/upload` - Upload audio contribution
- `GET /contributions/my` - Get user's contributions
- `GET /contributions/today` - Get today's contributions
- `GET /contributions/:contributionId` - Get contribution by ID
- `DELETE /contributions/:contributionId` - Delete contribution

### Anthems
- `GET /anthems` - Get all anthems
- `GET /anthems/today` - Get today's anthem
- `GET /anthems/:anthemId` - Get anthem by ID
- `GET /anthems/:anthemId/segments` - Get anthem segments
- `GET /anthems/:anthemId/stream` - Stream anthem audio
- `POST /anthems/:anthemId/play` - Track anthem play
- `GET /anthems/:anthemId/contributors` - Get anthem contributors
- `POST /anthems/:anthemId/share` - Share anthem

### Statistics
- `GET /stats/global` - Get global statistics
- `GET /stats/countries` - Get country statistics
- `GET /stats/leaderboard` - Get leaderboard
- `GET /stats/user/:userId/streak` - Get user streak
- `GET /stats/user/:userId/countries` - Get user countries
- `GET /stats/user/:userId/timeline` - Get user timeline

### Library
- `GET /library/anthems` - Browse anthem library
- `GET /library/my-contributions` - Get user's library contributions
- `GET /library/search` - Search library content
- `GET /library/featured` - Get featured content

### Notifications
- `GET /notifications` - Get user notifications
- `PATCH /notifications/:notificationId/read` - Mark notification as read
- `PATCH /notifications/read-all` - Mark all notifications as read
- `POST /notifications/preferences` - Update notification preferences
- `POST /notifications/register-device` - Register device for push notifications

### Settings
- `GET /settings` - Get user settings
- `PATCH /settings` - Update user settings
- `GET /settings/privacy` - Get privacy settings
- `PATCH /settings/privacy` - Update privacy settings

### Geographic
- `GET /geo/countries` - Get all countries
- `GET /geo/country/:countryCode/stats` - Get country statistics
- `GET /geo/timezones` - Get all timezones

### Downloads
- `POST /downloads/request` - Request download
- `GET /downloads/:requestId` - Get download request status
- `GET /downloads/license` - Get download license

### Admin
- `POST /admin/anthems/generate` - Generate anthem (admin)
- `GET /admin/system/health` - Get system health
- `GET /admin/stats/overview` - Get admin statistics
- `POST /admin/users/:userId/ban` - Ban user (admin)

## 🏗️ Project Structure

```
backend-humn/
├── controllers/          # API controllers
│   ├── auth.controller.js
│   ├── user.controller.js
│   ├── contribution.controller.js
│   ├── anthem.controller.js
│   ├── stats.controller.js
│   ├── library.controller.js
│   ├── notification.controller.js
│   ├── settings.controller.js
│   ├── geo.controller.js
│   ├── download.controller.js
│   └── admin.controller.js
├── middleware/           # Express middleware
│   ├── auth.middleware.js
│   ├── cors.middleware.js
│   ├── error.middleware.js
│   ├── rateLimit.middleware.js
│   ├── upload.middleware.js
│   ├── validation.middleware.js
│   ├── worldId.middleware.js
│   └── admin.middleware.js
├── routes/              # API routes
│   ├── index.js
│   ├── auth.routes.js
│   ├── user.routes.js
│   ├── contribution.routes.js
│   ├── anthem.routes.js
│   ├── stats.routes.js
│   ├── library.routes.js
│   ├── notification.routes.js
│   ├── settings.routes.js
│   ├── geo.routes.js
│   ├── download.routes.js
│   └── admin.routes.js
├── models/              # Database models
├── services/            # Business logic services
├── utils/               # Utility functions
│   ├── response.js      # Response utilities
│   ├── logger.js        # Logging utilities
│   └── validators.js    # Input validation
├── validators/          # Request validators
├── config/              # Configuration files
├── server.js            # Main server file
├── package.json
├── .env.example
└── README.md
```

## 🧪 Testing the API

### Health Check
```bash
curl http://localhost:3000/health
```

### Get API Info
```bash
curl http://localhost:3000/api
```

### Test Authentication
```bash
curl -X POST http://localhost:3000/api/v1/auth/world-id/verify \
  -H "Content-Type: application/json" \
  -d '{"token": "test-token"}'
```

## 📝 Development Notes

- All controller functions currently return placeholder responses with console logs
- Middleware functions are implemented with basic structure and logging
- The server is configured to start without errors and respond to all endpoints
- Each endpoint logs when it's called for easy debugging
- Response format is consistent across all endpoints

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Using PM2
```bash
npm install -g pm2
pm2 start server.js --name "humn-api"
```

## 📊 Monitoring

- Health check endpoint: `/health`
- API info endpoint: `/api`
- Console logging for all route calls
- Error handling with proper HTTP status codes

## 🔒 Security Features

- Helmet.js for security headers
- CORS configuration
- Rate limiting
- Input validation
- JWT authentication (structure ready)
- Admin access controls

## 📈 Performance Features

- Express.js with async/await
- Morgan for request logging
- Redis caching support (configured)
- Efficient error handling
- Response compression support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions, please open an issue in the repository or contact the development team.

---

**Note**: This is a scaffold API with placeholder implementations. All business logic, database operations, and external integrations need to be implemented according to the specific requirements of the HUMN platform.