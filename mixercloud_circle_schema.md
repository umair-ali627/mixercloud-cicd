# MixerCloud Circles - Complete Schema & Firebase Security Rules

## 📋 Table of Contents
1. [Data Model Overview](#data-model-overview)
2. [Circle Entity Schema](#circle-entity-schema)
3. [Circle Member Entity Schema](#circle-member-entity-schema)
4. [Hand Raise Entity Schema](#hand-raise-entity-schema)
5. [API DTOs Schema](#api-dtos-schema)
6. [Firebase Collections Structure](#firebase-collections-structure)
7. [Firebase Security Rules](#firebase-security-rules)
8. [API Endpoints Reference](#api-endpoints-reference)

---

## 🏗️ Data Model Overview

The MixerCloud Circles system uses Firebase Firestore with the following main collections:
- `circles` - Main circle documents
- `circles/{circleId}/members` - Circle participants
- `circles/{circleId}/handRaises` - Hand raise queue
- `users` - User profiles (referenced by hostUid)

---

## 🎯 Circle Entity Schema

### Firestore Collection: `circles`

```typescript
interface Circle {
  // Core Fields
  id: string;                                    // Document ID
  title: string;                                 // Circle title
  description?: string | null;                   // Optional description
  category: string;                              // Category (e.g., 'music', 'tech')
  coverUrl?: string | null;                      // Cover image URL
  hostUid: string;                               // Firebase UID of host
  
  // Configuration
  maxSpeakers: number;                           // Max speakers (default: 8)
  privacy: 'public' | 'private' | 'secret';      // Privacy level
  isReplay: boolean;                             // Whether it's a replay
  
  // Timing & Status
  createdAt: Timestamp;                          // Creation timestamp
  startAt: Timestamp;                            // Scheduled start time
  status: 'scheduled' | 'live' | 'ended';        // Current status
  endedAt?: Timestamp | null;                    // End timestamp
  endReason?: 'host_ended' | 'host_disconnected' | 'timeout' | null;
  hostDisconnectedAt?: Timestamp | null;         // Host disconnect time
  
  // Counters
  participantCount?: number | null;              // Current participants
  
  // Analytics Fields
  totalSpeakTime?: number | null;                // Total speaking time
  handRaiseCount?: number | null;                // Total hand raises
  roleChangeCount?: number | null;               // Total role changes
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique circle identifier |
| `title` | string | ✅ | Circle title (1-100 chars) |
| `description` | string \| null | ❌ | Optional description |
| `category` | string | ✅ | Category classification |
| `coverUrl` | string \| null | ❌ | Cover image URL |
| `hostUid` | string | ✅ | Firebase UID of circle host |
| `maxSpeakers` | number | ✅ | Maximum speakers (1-20, default: 8) |
| `privacy` | enum | ✅ | 'public', 'private', or 'secret' |
| `isReplay` | boolean | ✅ | Whether circle is a replay |
| `createdAt` | Timestamp | ✅ | Creation timestamp |
| `startAt` | Timestamp | ✅ | Scheduled start time |
| `status` | enum | ✅ | 'scheduled', 'live', or 'ended' |
| `endedAt` | Timestamp \| null | ❌ | End timestamp |
| `endReason` | enum \| null | ❌ | Reason for ending |
| `hostDisconnectedAt` | Timestamp \| null | ❌ | Host disconnect time |
| `participantCount` | number \| null | ❌ | Current participant count |
| `totalSpeakTime` | number \| null | ❌ | Analytics: total speaking time |
| `handRaiseCount` | number \| null | ❌ | Analytics: total hand raises |
| `roleChangeCount` | number \| null | ❌ | Analytics: total role changes |

---

## 👥 Circle Member Entity Schema

### Firestore Collection: `circles/{circleId}/members`

```typescript
interface CircleMember {
  // Core Fields
  role: 'host' | 'speaker' | 'listener';         // Member role
  isMuted: boolean;                              // Mute status
  joinedAt: Timestamp;                           // Join timestamp
  status?: 'active' | 'left' | 'disconnected' | null;
  
  // Timing
  lastSpokeAt?: Timestamp | null;                // Last speaking time
  leftAt?: Timestamp | null;                     // Leave timestamp
  disconnectedAt?: Timestamp | null;             // Disconnect timestamp
  rejoinCount?: number | null;                   // Number of rejoins
  lastRejoinAt?: Timestamp | null;               // Last rejoin time
  
  // Analytics Fields
  totalSpeakTime?: number | null;                // Total speaking time
  handRaiseCount?: number | null;                // Hand raise count
  roleChangeCount?: number | null;               // Role change count
  lastRoleChangeAt?: Timestamp | null;           // Last role change time
  
  // Moderation Fields
  isMutedByHost?: boolean | null;                // Host mute status
  muteReason?: string | null;                    // Mute reason
  kickCount?: number | null;                     // Kick count
  lastKickAt?: Timestamp | null;                 // Last kick time
  kickReason?: string | null;                    // Kick reason
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `role` | enum | ✅ | 'host', 'speaker', or 'listener' |
| `isMuted` | boolean | ✅ | Current mute status |
| `joinedAt` | Timestamp | ✅ | Join timestamp |
| `status` | enum \| null | ❌ | 'active', 'left', or 'disconnected' |
| `lastSpokeAt` | Timestamp \| null | ❌ | Last speaking time |
| `leftAt` | Timestamp \| null | ❌ | Leave timestamp |
| `disconnectedAt` | Timestamp \| null | ❌ | Disconnect timestamp |
| `rejoinCount` | number \| null | ❌ | Number of rejoins |
| `lastRejoinAt` | Timestamp \| null | ❌ | Last rejoin time |
| `totalSpeakTime` | number \| null | ❌ | Total speaking time |
| `handRaiseCount` | number \| null | ❌ | Hand raise count |
| `roleChangeCount` | number \| null | ❌ | Role change count |
| `lastRoleChangeAt` | Timestamp \| null | ❌ | Last role change time |
| `isMutedByHost` | boolean \| null | ❌ | Host mute status |
| `muteReason` | string \| null | ❌ | Mute reason |
| `kickCount` | number \| null | ❌ | Kick count |
| `lastKickAt` | Timestamp \| null | ❌ | Last kick time |
| `kickReason` | string \| null | ❌ | Kick reason |

---

## ✋ Hand Raise Entity Schema

### Firestore Collection: `circles/{circleId}/handRaises`

```typescript
interface HandRaise {
  raisedAt: Timestamp;                           // Hand raise timestamp
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `raisedAt` | Timestamp | ✅ | When hand was raised |

---

## 📡 API DTOs Schema

### Create Circle DTO

```typescript
interface CreateCircleDto {
  title: string;                                 // Required
  description?: string;                          // Optional
  category: string;                              // Required
  privacy: 'public' | 'private' | 'secret';      // Required
  coverUrl?: string;                             // Optional URL
  startAt?: string;                              // Optional ISO date string
  maxSpeakers?: number;                          // Optional (1-20, default: 8)
  isReplay?: boolean;                            // Optional (default: false)
}
```

### Update Circle DTO

```typescript
interface UpdateCircleDto {
  title?: string;                                // Optional
  description?: string;                          // Optional
  category?: string;                             // Optional
  privacy?: 'public' | 'private' | 'secret';     // Optional
  coverUrl?: string;                             // Optional URL
  startAt?: string;                              // Optional ISO date string
  isReplay?: boolean;                            // Optional
}
```

### Join Circle DTO

```typescript
interface JoinCircleDto {
  role?: 'listener';                             // Optional (default: 'listener')
}
```

### Update Status DTO

```typescript
interface UpdateStatusDto {
  status: 'scheduled' | 'live' | 'ended';        // Required
}
```

---

## 🔥 Firebase Collections Structure

```
firestore/
├── circles/
│   ├── {circleId}/
│   │   ├── members/
│   │   │   ├── {userId}/
│   │   │   └── ...
│   │   └── handRaises/
│   │       ├── {userId}/
│   │       └── ...
│   └── ...
└── users/
    ├── {userId}/
    └── ...
```

### Collection Rules

1. **circles** - Main circle documents
2. **circles/{circleId}/members** - Circle participants (subcollection)
3. **circles/{circleId}/handRaises** - Hand raise queue (subcollection)
4. **users** - User profiles (referenced by hostUid)

---

## 🔒 Firebase Security Rules

### Complete Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    function isHost(circleId) {
      return request.auth.uid == resource.data.hostUid;
    }
    
    function isMember(circleId) {
      return exists(/databases/$(database)/documents/circles/$(circleId)/members/$(request.auth.uid));
    }
    
    function isLiveCircle(circleId) {
      return get(/databases/$(database)/documents/circles/$(circleId)).data.status == 'live';
    }
    
    function isScheduledCircle(circleId) {
      return get(/databases/$(database)/documents/circles/$(circleId)).data.status == 'scheduled';
    }
    
    function isValidPrivacy(privacy) {
      return privacy in ['public', 'private', 'secret'];
    }
    
    function isValidStatus(status) {
      return status in ['scheduled', 'live', 'ended'];
    }
    
    function isValidRole(role) {
      return role in ['host', 'speaker', 'listener'];
    }
    
    // Main circles collection
    match /circles/{circleId} {
      // Allow read for public circles or if user is member
      allow read: if isAuthenticated() && 
        (resource.data.privacy == 'public' || 
         isMember(circleId) || 
         isHost(circleId));
      
      // Allow create if authenticated and valid data
      allow create: if isAuthenticated() && 
        isOwner(resource.data.hostUid) &&
        isValidPrivacy(resource.data.privacy) &&
        isValidStatus(resource.data.status) &&
        resource.data.maxSpeakers >= 1 &&
        resource.data.maxSpeakers <= 20;
      
      // Allow update if host and circle is scheduled
      allow update: if isAuthenticated() && 
        isHost(circleId) && 
        isScheduledCircle(circleId) &&
        isValidPrivacy(resource.data.privacy) &&
        isValidStatus(resource.data.status);
      
      // Allow delete if host and circle is scheduled
      allow delete: if isAuthenticated() && 
        isHost(circleId) && 
        isScheduledCircle(circleId);
      
      // Members subcollection
      match /members/{userId} {
        // Allow read if user is member or host
        allow read: if isAuthenticated() && 
          (request.auth.uid == userId || 
           isHost(circleId));
        
        // Allow create when joining circle
        allow create: if isAuthenticated() && 
          request.auth.uid == userId &&
          isValidRole(resource.data.role) &&
          isLiveCircle(circleId);
        
        // Allow update for own member doc or if host
        allow update: if isAuthenticated() && 
          (request.auth.uid == userId || 
           isHost(circleId)) &&
          isValidRole(resource.data.role);
        
        // Allow delete when leaving (own doc) or if host kicking
        allow delete: if isAuthenticated() && 
          (request.auth.uid == userId || 
           isHost(circleId));
      }
      
      // Hand raises subcollection
      match /handRaises/{userId} {
        // Allow read if user is member or host
        allow read: if isAuthenticated() && 
          (request.auth.uid == userId || 
           isMember(circleId) || 
           isHost(circleId));
        
        // Allow create/delete own hand raise in live circles
        allow create, delete: if isAuthenticated() && 
          request.auth.uid == userId &&
          isMember(circleId) &&
          isLiveCircle(circleId);
      }
    }
    
    // Users collection (for profiles)
    match /users/{userId} {
      // Allow read own profile or if public
      allow read: if isAuthenticated() && 
        (request.auth.uid == userId || 
         resource.data.privacy == 'public');
      
      // Allow create/update own profile
      allow create, update: if isAuthenticated() && 
        isOwner(userId);
    }
  }
}
```

### Rule Explanations

#### **Circle Access Rules**
- **Read**: Public circles or if user is member/host
- **Create**: Authenticated users creating their own circles
- **Update**: Only host can update scheduled circles
- **Delete**: Only host can delete scheduled circles

#### **Member Access Rules**
- **Read**: Members can read their own data, hosts can read all
- **Create**: Users can join live circles
- **Update**: Users can update their own data, hosts can update any
- **Delete**: Users can leave, hosts can kick members

#### **Hand Raise Rules**
- **Read**: Members and hosts can see hand raises
- **Create/Delete**: Users can manage their own hand raises in live circles

#### **User Profile Rules**
- **Read**: Own profile or public profiles
- **Create/Update**: Users can manage their own profiles

---

## 🌐 API Endpoints Reference

### Core Circle Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/circles` | Create new circle | ✅ |
| `PATCH` | `/circles/:id` | Update circle | ✅ (Host only) |
| `DELETE` | `/circles/:id` | End circle | ✅ (Host only) |
| `DELETE` | `/circles/:id/delete` | Delete circle | ✅ (Host only) |

### Circle Status Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `PATCH` | `/circles/:id/status` | Update circle status | ✅ (Host only) |
| `GET` | `/circles/:id/statuses` | Get available statuses | ✅ (Host only) |

### Participation

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/circles/:id/join` | Join circle | ✅ |
| `POST` | `/circles/:id/leave` | Leave circle | ✅ |

### Queries

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/circles` | Get circles directory | ✅ |
| `GET` | `/circles/:id` | Get circle details | ✅ |

### LiveKit Integration

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/webhook/circles` | LiveKit webhook | ✅ |

---

## 📝 Notes

### Real-time Features (Firebase Direct Updates)
The following features are handled via Firebase direct updates for better performance:

1. **Hand Raises**: Users can raise/lower hands directly in Firebase
2. **Promotions**: Hosts can promote listeners to speakers
3. **Moderation**: Hosts can mute, unmute, demote, or kick members

### Status Transitions
- `scheduled` → `live` → `ended`
- `scheduled` → `ended` (direct)
- No reverse transitions allowed

### Host Disconnection Handling
- Host disconnection timer: 5 minutes
- Automatic circle ending if host doesn't return
- All participants notified via Firebase listeners

### Analytics Tracking
- Speaking time tracking
- Hand raise counting
- Role change tracking
- Kick/mute moderation tracking

---

*Last Updated: January 2025*
*Version: 1.0*
