# Web Messenger

Modern real-time web messenger built with Express, React, and MySQL.

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, Socket.IO
- **Frontend**: React, Vite, TypeScript
- **Database**: MySQL
- **Deployment**: Render

## Project Structure

```
Web-messenger/
├── server/           # Express backend
│   ├── src/
│   │   └── index.ts
│   ├── dist/
│   ├── package.json
│   └── tsconfig.json
├── client/           # React frontend
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   └── pages/
│   ├── dist/
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- MySQL database

### Installation

1. Clone repository:
```bash
git clone https://github.com/rsmdevlin/Web-messenger.git
cd Web-messenger
```

2. Install dependencies:
```bash
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

3. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```
DATABASE_URL=mysql://user:pass@host:3306/dbname
PORT=3000
NODE_ENV=development
```

### Local Development

```bash
npm run dev
```

This starts both backend (port 3000) and frontend (port 5173).

### Production Build

```bash
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Chats
- `GET /api/chats` - Get user chats
- `POST /api/chats` - Create new chat
- `GET /api/chats/:id` - Get chat details
- `GET /api/chats/:id/messages` - Get chat messages
- `POST /api/chats/:id/messages` - Send message

### Health
- `GET /health` - Server health check

## Environment Variables

Required for deployment:

```
DATABASE_URL        # MySQL connection string
PORT                # Server port (default: 3000)
NODE_ENV            # development or production
FRONTEND_URL        # Frontend URL for CORS (production only)
```

## Render Deployment

### Build Command
```
npm run build
```

### Start Command
```
npm start
```

### Environment Variables in Render

Add these in Render dashboard:
- `DATABASE_URL` - Your MySQL database URL
- `NODE_ENV` - Set to `production`
- `PORT` - Render will set this automatically
- `FRONTEND_URL` - Your Render frontend URL

## Features

- Real-time messaging with Socket.IO
- User authentication with session cookies
- Private chats
- Message history
- Typing indicators
- Online status
- Responsive design

## Security

- Password hashing with bcrypt
- HTTP-only secure cookies
- CORS protection
- Input validation
- Session-based authentication

## License

MIT
