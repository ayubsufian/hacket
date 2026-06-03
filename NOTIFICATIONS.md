# HackET Notification System

Complete analysis and documentation of the notification service.

## Notification Types

| Type | Trigger | Icon | Color | Description |
|------|---------|------|-------|-------------|
| `DEADLINE_REMINDER` | 24h before submission deadline | Clock | Orange | Registration/event deadline approaching |
| `DEADLINE_WARNING` | 24h before submission deadline | AlertTriangle | Red | Urgent deadline warning |
| `TEAM_INVITE` | Team invitation sent | Users | Blue | Invited to join a team |
| `SCORE_PUBLISHED` | Organizer releases scores | Trophy | Yellow | Final scores & feedback available |
| `CERTIFICATE_ISSUED` | Certificate generated | Award | Purple | New certificate/badge earned |
| `ANNOUNCEMENT` | Manual broadcast by staff | Megaphone | Green | General hackathon announcement |
| `SYSTEM_ALERT` | System events | Shield | Slate | Platform system notifications |

## Event Triggers

### 1. Deadline Notifications (`DEADLINE_REMINDER`, `DEADLINE_WARNING`)
**Source:** `scheduler.worker.js` (line 211)

```javascript
eventBus.emit('deadline:upcoming', {
  hackathonId,
  hackathonTitle,
  deadline,
  deadlineType: 'SUBMISSION_24HR'
});
```

**Listener:** `notification.service.js` (line 337-375)
- Creates in-app notification for all team members
- Sends email if user preferences allow
- Runs every minute via scheduler worker

### 2. Team Invitation (`TEAM_INVITE`)
**Source:** `teams.service.js` (line 352)

```javascript
eventBus.emit('team:invited', { teamId, senderId, receiverId });
```

**Listener:** `notification.service.js` (line 378-395)
- Creates notification for invited user
- Contains team name and sender info in metadata

### 3. Scores Published (`SCORE_PUBLISHED`)
**Source:** `scoring.service.js` (line 471-475)

```javascript
eventBus.emit('scores:published', { 
  hackathonId, 
  title: hackathon.title,
  releasedBy: releasedByUserId 
});
```

**Listener:** `notification.service.js` (line 398-421)
- Creates a broadcast record
- Triggers mass notification pipeline
- Sends to all hackathon participants

### 4. Certificate Issued (`CERTIFICATE_ISSUED`)
**Source:** `notification.service.js` (line 171-177) - Internal trigger via `issueCertificate()`

```javascript
await this.create({
  userId,
  type: 'CERTIFICATE_ISSUED',
  title: 'New Certificate Issued! 🎉',
  message: `You have received a "${title}" certificate.`,
  metadata: { certificateId: certificate.id, hackathonId },
});
```

**Called from:** `certificates.controller.js` when certificates are generated

### 5. Announcement (`ANNOUNCEMENT`)
**Source:** Manual via API endpoint `POST /api/v1/notifications/broadcast/:eventId`

**Controller:** `notifications.controller.js` (line 62-79)
- Staff with COMMUNICATIONS role creates broadcast
- Background pipeline sends to all participants

### 6. System Alert (`SYSTEM_ALERT`)
**Source:** Reserved for system-level events (not currently auto-triggered)

## Database Models

### Notification Model
```prisma
model Notification {
  id          String           @id @default(uuid())
  userId      String           // Recipient
  type        NotificationType // Enum of types
  title       String           // Short headline
  message     String           // Full message body
  metadata    Json?            // Additional context
  isRead      Boolean          @default(false)
  readAt      DateTime?
  broadcastId String?          // Link to broadcast (if mass notification)
  createdAt   DateTime         @default(now())
}
```

### UserNotificationPreference
```prisma
model UserNotificationPreference {
  id        String   @id @default(uuid())
  userId    String   @unique
  email     Boolean  @default(true)  // Email notifications enabled
  push      Boolean  @default(true)  // Push notifications enabled
  sms       Boolean  @default(true)  // SMS notifications enabled
  inApp     Boolean  @default(true)  // In-app notifications enabled
  types     String[] @default([])    // Filter by notification types
  updatedAt DateTime @updatedAt
}
```

### NotificationBroadcast
For mass announcements to hackathon participants:
- Tracks status: QUEUED → RUNNING → SENT | FAILED | CANCELLED
- Supports scheduled broadcasts
- Chunked email delivery (50 users at a time)

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications` | ✓ | Get user notifications |
| GET | `/notifications/preferences` | ✓ | Get notification preferences |
| PATCH | `/notifications/preferences` | ✓ | Update preferences |
| PATCH | `/notifications/:id/read` | ✓ | Mark single notification as read |
| PATCH | `/notifications/read-all` | ✓ | Mark all as read |
| POST | `/notifications/broadcast/:eventId` | Staff | Create announcement |
| GET | `/notifications/broadcasts/:eventId` | Staff | List broadcasts |

## Frontend Components

### NotificationIcon Component
`@/frontend/src/components/notifications/NotificationIcon.tsx`

Renders type-specific icons with color coding:
- Bell (default)
- Clock (deadline reminders)
- AlertTriangle (deadline warnings)
- Users (team invites)
- Trophy (score releases)
- Award (certificates)
- Megaphone (announcements)
- Shield (system alerts)

### NotificationsPage
`@/frontend/src/pages/NotificationsPage.tsx`

Features:
- Lists all notifications with icons
- Shows type badges
- Mark as read (single/all)
- Unread indicator dot
- Loading skeletons
- Error state with retry

### AppShell Integration
Unread notification badge on bell icon:
- Polls every 30 seconds
- Shows red badge with count
- Updates when navigating

## Email Delivery

### SMTP Configuration
Uses Brevo (Sendinblue) for transactional email:
```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_smtp_key
```

### Retry Logic
- 3 retry attempts with exponential backoff
- 2^retry_count * 1000ms delay
- Logs failures to console

### Preference Filtering
- Checks `UserNotificationPreference.email` before sending
- Defaults to `true` if no preferences exist
- Respects user opt-out

## Testing

### Run Notification Tests
```bash
# Backend structure test
node test-notifications.js

# With authentication (full API test)
TEST_EMAIL=user@example.com TEST_PASSWORD=pass node test-notifications.js
```

### Manual Test Checklist
- [ ] Create hackathon (triggers deadline monitoring)
- [ ] Invite team member (triggers TEAM_INVITE)
- [ ] Release scores (triggers SCORE_PUBLISHED)
- [ ] Issue certificate (triggers CERTIFICATE_ISSUED)
- [ ] Send announcement (triggers ANNOUNCEMENT)
- [ ] Verify email preferences are respected
- [ ] Verify unread badge updates
- [ ] Verify mark-as-read functionality

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Event Sources  │────▶│  EventBus    │────▶│ Notification svc │
└─────────────────┘     └──────────────┘     └──────────────────┘
        │                                              │
        │                                              ▼
        │                                       ┌──────────────┐
        │                                       │  Database    │
        │                                       │  (Prisma)    │
        │                                       └──────────────┘
        │                                              │
        │                                              ▼
        │                                       ┌──────────────┐
        │                                       │  Redis Cache │
        │                                       └──────────────┘
        │                                              │
        │                                              ▼
        │                                       ┌──────────────┐
        └──────────────────────────────────────▶│  SMTP Email  │
                                                └──────────────┘
```

## Files

### Backend
- `@/apps/backend/src/services/notifications/notification.service.js` - Core service
- `@/apps/backend/src/controllers/notifications.controller.js` - API endpoints
- `@/apps/backend/src/routes/notifications.routes.js` - Route definitions
- `@/apps/backend/src/workers/scheduler.worker.js` - Deadline monitoring
- `@/packages/database/prisma/schema.prisma` - Database models

### Frontend
- `@/frontend/src/api/notifications.ts` - API client
- `@/frontend/src/pages/NotificationsPage.tsx` - Notification list UI
- `@/frontend/src/components/notifications/NotificationIcon.tsx` - Type icons
- `@/frontend/src/components/layout/AppShell.tsx` - Unread badge

## Known Limitations

1. **No real-time updates** - Uses polling (30s) instead of WebSockets
2. **No push notifications** - Mobile push not implemented
3. **No SMS delivery** - SMS channel stubbed but not active
4. **Email requires SMTP config** - Falls back to mock mode without env vars
