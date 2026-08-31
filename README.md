# Web Messenger

A real-time web messenger application built with React, Express, Socket.IO, and MySQL.

## Features

- User authentication with httpOnly cookies
- Real-time messaging with Socket.IO
- Chat management (create, list, join chats)
- Session-based authentication
- Secure password hashing with bcrypt
- CORS support for production

## Tech Stack

**Backend:**
- Node.js + Express
- TypeScript
- Socket.IO for real-time communication
- MySQL2 for database
- bcrypt for password hashing
- httpOnly cookies for session management

**Frontend:**
- React 18 with TypeScript
- Vite as build tool
- Axios for HTTP requests
- Socket.IO client for real-time updates

**Database:**
- MySQL with predefined schema (users, chats, messages, sessions, chat_members)

## Local Development

### Prerequisites
- Node.js 20+
- npm/yarn
- MySQL running locally or remote connection

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Update DATABASE_URL in `.env`:
   ```
   DATABASE_URL=mysql://user:password@localhost:3306/messenger
   ```

4. Build and start:
   ```bash
   npm run build
   npm start
   ```

Or run in development mode:
   ```bash
   npm run dev
   ```

Frontend will be available at: http://localhost:5173
Backend API at: http://localhost:3000

## Production Deployment on Render

### Database Setup
- Ensure MySQL tables are created using `database/init.sql`
- DATABASE_URL connection string points to your MySQL host

### Environment Variables (Render)
Set these in Render dashboard under "Environment":
- `DATABASE_URL`: Your MySQL connection string
- `NODE_ENV`: production
- `FRONTEND_URL`: Your Render app URL (e.g., https://web-messenger-xxx.onrender.com)
- `COOKIE_SECURE`: true
- `COOKIE_SAMESITE`: lax

### Deploy Steps
1. Connect GitHub repository to Render
2. Create new Web Service
3. Set Root Directory: (leave empty)
4. Build Command: `npm run build`
5. Start Command: `npm start`
6. Add environment variables from `.env.example`
7. Deploy

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)
- `POST /api/auth/logout` - Logout user

### Chats
- `GET /api/chats` - List user's chats (requires auth)
- `POST /api/chats` - Create new chat (requires auth)

### Messages
- `GET /api/chats/:id/messages` - Get messages from chat (requires auth)
- `POST /api/chats/:id/messages` - Send message to chat (requires auth)

### Health
- `GET /health` - Health check endpoint

## WebSocket Events

- `join-chat` - Join a chat room for real-time updates
- `send-message` - Send a message to all users in the chat
- `new-message` - Receive new messages in real-time

## Security Notes

- Passwords are hashed with bcrypt
- Sessions use httpOnly cookies (not accessible from JavaScript)
- CORS is configured for production URLs
- SQL queries use parameterized statements to prevent SQL injection
- Environment variables are used for sensitive data

## File Structure

```
.
├── server/
│   ├── src/
│   │   └── index.ts       # Main server file
│   ├── dist/              # Compiled output
│   ├── package.json
│   └── tsconfig.json
├── client/
│   ├── src/
│   │   ├── App.tsx        # Main React component
│   │   ├── App.css        # Styles
│   │   ├── main.tsx       # Entry point
│   │   └── index.css      # Global styles
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── database/
│   └── init.sql           # Database schema
├── package.json           # Root package.json
├── tsconfig.json
└── .env.example
```

## License

MIT