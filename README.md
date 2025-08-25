# MixerCloud Backend API

A NestJS-based backend service for MixerCloud's real-time audio circles platform. This service provides REST APIs for managing live audio rooms, user authentication, and integration with LiveKit for real-time audio communication.

## 🎯 Overview

MixerCloud Backend is designed to support real-time audio circles with up to **8 simultaneous speakers** and **100 concurrent listeners** per circle. It provides a complete backend infrastructure for the MixerCloud iOS application.

## 🏗️ Architecture

### Tech Stack
- **Framework**: NestJS (Node.js + TypeScript)
- **Authentication**: Firebase Auth + JWT
- **Real-time Audio**: LiveKit Cloud
- **Database**: Firebase Firestore
- **Storage**: Google Cloud Storage
- **Documentation**: Swagger/OpenAPI

### Project Structure
```
src/
├── auth/           # Authentication & authorization
├── circles/        # Circle management endpoints
├── config/         # Configuration management
├── firebase/       # Firebase integration services
├── livekit/        # LiveKit audio service integration
├── app.controller.ts
├── app.service.ts
├── app.module.ts
└── main.ts
```

## 🚀 Features

### Core Functionality
- **Circle Management**: Create, update, and manage audio circles
- **Real-time Audio**: LiveKit integration for WebRTC audio streaming
- **User Authentication**: Firebase Auth integration with JWT tokens
- **Member Management**: Join/leave circles, role management (host/speaker/listener)
- **Hand Raise System**: Queue management for speaker requests
- **Moderation Tools**: Mute, kick, and demote participants

### API Endpoints
- `POST /circles` - Create a new circle
- `GET /circles` - List circles with filtering
- `PATCH /circles/{id}` - Update circle details
- `DELETE /circles/{id}` - End a circle
- `POST /circles/{id}/join` - Join a circle
- `POST /circles/{id}/leave` - Leave a circle
- `POST /circles/{id}/hand-raise` - Raise/lower hand
- `POST /circles/{id}/promote` - Promote listener to speaker

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Firebase project with Firestore enabled
- LiveKit Cloud account
- Google Cloud Storage bucket

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mixercloud-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   # Firebase Configuration
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY=your-private-key
   FIREBASE_CLIENT_EMAIL=your-client-email
   
   # LiveKit Configuration
   LIVEKIT_API_KEY=your-livekit-api-key
   LIVEKIT_API_SECRET=your-livekit-api-secret
   LIVEKIT_URL=wss://your-livekit-instance.livekit.cloud
   
   # JWT Secret
   JWT_SECRET=your-jwt-secret
   
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

4. **Firebase Service Account**
   Place your Firebase service account key file (`serviceAccountKey.json`) in the root directory.

## 🏃‍♂️ Running the Application

### Development
```bash
# Start in development mode with hot reload
npm run start:dev

# Start in debug mode
npm run start:debug
```

### Production
```bash
# Build the application
npm run build

# Start in production mode
npm run start:prod
```

### Testing
```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Run test coverage
npm run test:cov
```

## 📚 API Documentation

Once the application is running, you can access the Swagger API documentation at:
```
http://localhost:3000/api
```

## 🔐 Authentication

The API uses Firebase Authentication with JWT tokens. All protected endpoints require a valid Bearer token in the Authorization header:

```
Authorization: Bearer <firebase-id-token>
```

## 🎵 LiveKit Integration

The backend integrates with LiveKit Cloud for real-time audio communication:

- **Token Generation**: Automatic JWT token generation for LiveKit rooms
- **Role Management**: Different permissions for hosts, speakers, and listeners
- **Room Management**: Automatic room creation and cleanup

## 📊 Data Models

### Circle
```typescript
{
  id: string;
  title: string;
  category: string;
  privacy: 'public' | 'private' | 'secret';
  hostUid: string;
  coverUrl?: string;
  startAt: Date;
  durationMin: number;
  status: 'scheduled' | 'live' | 'ended';
  maxSpeakers: number;
  micPolicy: 'pushToTalk' | 'open' | 'handRaise';
}
```

### Circle Member
```typescript
{
  id: string;
  userId: string;
  role: 'host' | 'speaker' | 'listener';
  isMuted: boolean;
  joinedAt: Date;
  hasHandRaised: boolean;
}
```

## 🚀 Deployment

### Environment Variables
Ensure all required environment variables are set in your production environment.

### Build and Deploy
```bash
# Build the application
npm run build

# The built application will be in the `dist/` directory
```

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
```

## 🔍 Monitoring & Logging

The application includes comprehensive logging for debugging and monitoring:
- Request/response logging
- Error tracking
- Performance metrics
- LiveKit connection status

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is proprietary software for MixerCloud.

## 🆘 Support

For support and questions:
- Check the API documentation at `/api`
- Review the Firebase and LiveKit documentation
- Contact the development team

---

**MixerCloud Backend** - Powering real-time audio communities
