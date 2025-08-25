# MixerCloud Circles – Back‑End Feature Specification (iOS MVP)

**Goal:** add real‑time audio rooms (“Circles”) to the existing MixerCloud iOS app.  
**Scale target:** up to **8 simultaneous speakers** and **100 concurrent listeners** per Circle.

---

## 1. Data Model (Firestore / Postgres)

| Collection / Table | Key fields |
|--------------------|-----------|
| **circles** | `id`, `title`, `category`, `privacy` (`public·private·secret`), `hostUid`, `coverUrl`, `startAt`, `durationMin`, `status` (`scheduled·live·ended`), `maxSpeakers` *default 8*, `micPolicy` (`pushToTalk·open·handRaise`) |
| **circles/{id}/members/{uid}** | `role` (`host·speaker·listener`), `isMuted`, `joinedAt`, `lastSpokeAt` |
| **circles/{id}/handRaises/{uid}** | `raisedAt` |
| **circleSessions** (analytics) | `circleId`, `startedAt`, `endedAt`, `peakListeners`, `peakSpeakers`, `totalMinutes` |

---

## 2. REST / RPC End‑points

| # | Route | Verb | Purpose |
|---|-------|------|---------|
| 1 | `/circles` | **POST** | Create Circle. Returns `circleId` + SFU host token. |
| 2 | `/circles/{id}` | **PATCH** | Update (title, schedule, privacy) until room starts. |
| 3 | `/circles/{id}` | **DELETE** | End Circle (soft delete, status→ended). |
| 4 | `/circles/{id}/join` | **POST** | Join as listener (default) – returns WebRTC token. |
| 5 | `/circles/{id}/leave` | **POST** | Remove presence doc & release token. |
| 6 | `/circles/{id}/hand-raise` | **POST/DELETE** | Add / remove user from raise‑hand queue. |
| 7 | `/circles/{id}/promote` | **POST** | Host promotes listener→speaker (respect `maxSpeakers`). |
| 8 | `/circles/{id}/actions` | **POST** | Moderation (`mute`, `kick`, `demote`). |
| 9 | `/circles` | **GET** | Directory query: `status`, `limit`, `startAfter`. |
| 10 | `/upload/cover` | **POST** | Pre‑signed GCS URL for cover image. |

---

## 3. Real‑Time Presence & Signalling

* **Firestore listener** on `members/*` path for instant UI updates.  
* Hosted **SFU (LiveKit Cloud / 100ms / Agora)** issues DTLS‑SRTP audio streams; back‑end mints JWT tokens with `role` claim.

---

## 4. Scheduled & Push Tasks

| Task | Trigger | Action |
|------|---------|--------|
| 10‑min reminder | Cloud Scheduler | FCM push to RSVP’d users. |
| Circle ending | `ended` webhook | Store analytics row, e‑mail host summary. |

---

## 5. Security & Rate Limits

* Firestore rules: only `hostUid` or `coHosts[]` may update / delete Circle.  
* Limit: **5 Circle creations / 24 h / host**.  
* API key + JWT auth on all REST routes.

---

## 6. Analytics (BigQuery)

Capture `join`, `leave`, `handRaise`, `promote` events via SFU webhooks → Pub/Sub → BigQuery for retention dashboards.

---

## 7. Tech Stack Assumptions

| Layer | Choice |
|-------|--------|
| Audio transport | Hosted SFU (LiveKit Cloud / 100ms / Agora) |
| Signalling | Firebase RTDB / Firestore |
| API / Auth | Node + TypeScript (Express) + Firebase Auth |
| Storage | Google Cloud Storage (covers, future recordings) |
| CI/CD | GitHub Actions + Cloud Build |

---

## 8. Deliverables for Backend Engineer

1. **API server** with routes #1‑10 + Swagger docs.  
2. **Firestore security rules** & sample data.  
3. **Cloud Functions / Tasks** for notifications & summary e‑mail.  
4. **Token service** to mint WebRTC JWTs (role‑based).  
5. **README** with env vars, local emulation, and deployment steps.  
6. **Prometheus / Grafana** or vendor dashboard alerts for packet‑loss > 5 %.

---

*Prepared for MixerCloud · Oct 2025*  
