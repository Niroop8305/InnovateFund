# InnovateFund API Documentation

Base URL: `/api`

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

### Register

- **POST** `/auth/register`
- **Body:**
  ```json
  {
    "name": "string",
    "email": "string",
    "password": "string (min 6 chars)",
    "userType": "innovator|investor",
    "company": "string (optional)",
    "bio": "string (optional)"
  }
  ```

### Login

- **POST** `/auth/login`
- **Body:**
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```

### Get Current User

- **GET** `/auth/me`
- **Auth:** Required

## Users

### Get User Profile

- **GET** `/users/profile/:userId?`
- **Auth:** Required
- **Params:** userId (optional, defaults to current user)

### Update Profile

- **PUT** `/users/profile`
- **Auth:** Required
- **Body:**
  ```json
  {
    "name": "string",
    "bio": "string",
    "location": "string",
    "company": "string",
    "website": "string (URL)",
    "linkedinProfile": "string (URL)",
    "expertise": ["string"],
    "sectorsOfInterest": ["string"],
    "notificationsEnabled": "boolean"
  }
  ```

### Upload Profile Picture

- **POST** `/users/profile-picture`
- **Auth:** Required
- **Content-Type:** multipart/form-data
- **Body:** profilePicture (file, max 5MB)

### Change Password

- **POST** `/users/change-password`
- **Auth:** Required
- **Body:**
  ```json
  {
    "currentPassword": "string",
    "newPassword": "string (min 6 chars)"
  }
  ```

### Update Notifications

- **PUT** `/users/notifications`
- **Auth:** Required
- **Body:**
  ```json
  {
    "enabled": "boolean"
  }
  ```

### Delete Account

- **DELETE** `/users/delete`
- **Auth:** Required

### Search Users

- **GET** `/users/search?q=<query>&userType=<type>`
- **Auth:** Required

## Ideas

### Get All Ideas

- **GET** `/ideas?page=1&limit=10&category=<cat>&stage=<stage>&sort=<field>`
- **Auth:** Required

### Get Single Idea

- **GET** `/ideas/:id`
- **Auth:** Required

### Create Idea

- **POST** `/ideas`
- **Auth:** Required (Innovator only)
- **Body:**
  ```json
  {
    "title": "string (5-200 chars)",
    "description": "string (20-2000 chars)",
    "category": "technology|healthcare|finance|education|environment|social|consumer|enterprise",
    "stage": "idea|prototype|mvp|beta|launched",
    "fundingGoal": "number (min 1000)",
    "tags": ["string"] (optional, max 10)
  }
  ```

### Update Idea

- **PUT** `/ideas/:id`
- **Auth:** Required (Creator only)
- **Body:** Same as Create Idea

### Upload Files

- **POST** `/ideas/:id/upload`
- **Auth:** Required (Creator only)
- **Content-Type:** multipart/form-data
- **Body:** files (multiple files, max 10MB each)

### Like Idea

- **POST** `/ideas/:id/like`
- **Auth:** Required

### Add Comment

- **POST** `/ideas/:id/comments`
- **Auth:** Required
- **Body:**
  ```json
  {
    "content": "string (1-1000 chars)"
  }
  ```

### Request Collaboration

- **POST** `/ideas/:id/collaborate`
- **Auth:** Required

## Investors

### Get Leaderboard

- **GET** `/investors/leaderboard?page=1&limit=10&sort=<field>`
- **Auth:** Required

### Get Sector Room

- **GET** `/investors/rooms/:sector?page=1&limit=10`
- **Auth:** Required

### Make Investment

- **POST** `/investors/invest/:ideaId`
- **Auth:** Required (Investor only)
- **Body:**
  ```json
  {
    "amount": "number (100-10000000)",
    "message": "string (optional, max 500)"
  }
  ```

### Get My Investments

- **GET** `/investors/my-investments`
- **Auth:** Required (Investor only)

## Chat

### Get All Chats

- **GET** `/chat`
- **Auth:** Required

### Create Chat

- **POST** `/chat/create`
- **Auth:** Required
- **Body:**
  ```json
  {
    "participantId": "string (user ID)"
  }
  ```

### Get Messages

- **GET** `/chat/:chatId/messages?page=1&limit=50`
- **Auth:** Required

### Send Message

- **POST** `/chat/:chatId/messages`
- **Auth:** Required
- **Body:**
  ```json
  {
    "content": "string (1-2000 chars)",
    "messageType": "text|file|image"
  }
  ```

### Mark as Read

- **POST** `/chat/:chatId/read`
- **Auth:** Required

## Notifications

### Get Notifications

- **GET** `/notifications?page=1&limit=20&type=<type>`
- **Auth:** Required

### Mark as Read

- **PATCH** `/notifications/:id/read`
- **Auth:** Required

### Mark All as Read

- **PATCH** `/notifications/read-all`
- **Auth:** Required

### Delete Notification

- **DELETE** `/notifications/:id`
- **Auth:** Required

### Update FCM Token

- **POST** `/notifications/fcm-token`
- **Auth:** Required
- **Body:**
  ```json
  {
    "token": "string (FCM token)"
  }
  ```

## AI Assistant

### Chat with AI

- **POST** `/ai/chat`
- **Auth:** Required
- **Body:**
  ```json
  {
    "messages": [
      {
        "role": "user|assistant|system",
        "content": "string"
      }
    ],
    "context": "general|innovation|investment"
  }
  ```

### Get Impact Score

- **POST** `/ai/impact-score`
- **Auth:** Required
- **Body:**
  ```json
  {
    "idea": "string (idea description)"
  }
  ```

## WebSocket Events (Socket.IO)

### Connection

```javascript
socket.on("connect", () => {
  socket.emit("join", { userId });
});
```

### Chat Events

- `user:online` - User came online
- `user:offline` - User went offline
- `message:new` - New message received
- `message:typing` - User is typing
- `message:read` - Message was read

### Notification Events

- `notification:new` - New notification received

## Rate Limits

- Default: 100 requests per 15 minutes per IP
- Can be configured via environment variables

## Error Responses

All errors follow this format:

```json
{
  "message": "Error description",
  "errors": [] // Optional validation errors
}
```

Common status codes:

- 400: Bad Request (validation error)
- 401: Unauthorized (authentication required)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 429: Too Many Requests (rate limit exceeded)
- 500: Internal Server Error
