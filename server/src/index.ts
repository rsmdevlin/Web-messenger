import express, { Express, Request, Response } from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import cookieParser from "cookie-parser";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";

const app: Express = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  },
});

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));

interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  created_at: Date;
}

interface Session {
  userId: number;
  username: string;
}

const pool = mysql.createPool({
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
  uri: process.env.DATABASE_URL,
});

const sessions = new Map<string, Session>();

const authMiddleware = (req: Request, res: Response, next: Function) => {
  const sessionId = req.cookies.sessionId;
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  (req as any).session = sessions.get(sessionId);
  (req as any).sessionId = sessionId;
  next();
};

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/api/auth/register", async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const conn = await pool.getConnection();
    try {
      const [rows]: any = await conn.execute(
        "SELECT id FROM users WHERE username = ? OR email = ?",
        [username, email]
      );
      if (rows.length > 0) {
        return res.status(409).json({ error: "User already exists" });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const [result]: any = await conn.execute(
        "INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, NOW())",
        [username, email, passwordHash]
      );
      const sessionId = randomBytes(32).toString("hex");
      sessions.set(sessionId, { userId: result.insertId, username });
      const isProduction = process.env.NODE_ENV === "production";
      res.cookie("sessionId", sessionId, {
        httpOnly: true,
        secure: isProduction || process.env.COOKIE_SECURE === "true",
        sameSite: (process.env.COOKIE_SAMESITE as any) || "lax",
        maxAge: 24 * 60 * 60 * 1000,
      });
      res.status(201).json({ id: result.insertId, username, email });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }
    const conn = await pool.getConnection();
    try {
      const [rows]: any = await conn.execute(
        "SELECT id, username, email, password_hash FROM users WHERE username = ?",
        [username]
      );
      if (rows.length === 0) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const user = rows[0];
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const sessionId = randomBytes(32).toString("hex");
      sessions.set(sessionId, { userId: user.id, username: user.username });
      const isProduction = process.env.NODE_ENV === "production";
      res.cookie("sessionId", sessionId, {
        httpOnly: true,
        secure: isProduction || process.env.COOKIE_SECURE === "true",
        sameSite: (process.env.COOKIE_SAMESITE as any) || "lax",
        maxAge: 24 * 60 * 60 * 1000,
      });
      res.json({ id: user.id, username: user.username, email: user.email });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/auth/me", authMiddleware, (req: Request, res: Response) => {
  const session = (req as any).session;
  res.json({ id: session.userId, username: session.username });
});

app.post("/api/auth/logout", (req: Request, res: Response) => {
  const sessionId = req.cookies.sessionId;
  if (sessionId) {
    sessions.delete(sessionId);
  }
  res.clearCookie("sessionId");
  res.json({ message: "Logged out" });
});

app.get("/api/chats", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).session.userId;
    const conn = await pool.getConnection();
    try {
      const [rows]: any = await conn.execute(
        "SELECT c.id, c.name, c.type, c.created_by, c.created_at FROM chats c JOIN chat_members cm ON c.id = cm.chat_id WHERE cm.user_id = ? ORDER BY c.created_at DESC",
        [userId]
      );
      res.json(rows);
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("Get chats error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/chats", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).session.userId;
    const { name, type } = req.body;
    if (!name || !type) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const conn = await pool.getConnection();
    try {
      const [result]: any = await conn.execute(
        "INSERT INTO chats (name, type, created_by, created_at) VALUES (?, ?, ?, NOW())",
        [name, type, userId]
      );
      const chatId = result.insertId;
      await conn.execute(
        "INSERT INTO chat_members (chat_id, user_id, role) VALUES (?, ?, ?)",
        [chatId, userId, "admin"]
      );
      res.status(201).json({ id: chatId, name, type, created_by: userId });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("Create chat error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/chats/:id/messages", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).session.userId;
    const conn = await pool.getConnection();
    try {
      const [members]: any = await conn.execute(
        "SELECT id FROM chat_members WHERE chat_id = ? AND user_id = ?",
        [id, userId]
      );
      if (members.length === 0) {
        return res.status(403).json({ error: "Access denied" });
      }
      const [messages]: any = await conn.execute(
        "SELECT id, chat_id, sender_id, content, type, is_read, created_at FROM messages WHERE chat_id = ? ORDER BY created_at ASC",
        [id]
      );
      res.json(messages);
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/chats/:id/messages", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).session.userId;
    const { content, type } = req.body;
    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }
    const conn = await pool.getConnection();
    try {
      const [members]: any = await conn.execute(
        "SELECT id FROM chat_members WHERE chat_id = ? AND user_id = ?",
        [id, userId]
      );
      if (members.length === 0) {
        return res.status(403).json({ error: "Access denied" });
      }
      const [result]: any = await conn.execute(
        "INSERT INTO messages (chat_id, sender_id, content, type, is_read, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
        [id, userId, content, type || "text", 0]
      );
      res.status(201).json({
        id: result.insertId,
        chat_id: id,
        sender_id: userId,
        content,
        type: type || "text",
        is_read: 0,
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("Create message error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

io.on("connection", (socket) => {
  console.log("Socket.IO client connected:", socket.id);
  socket.on("join-chat", (chatId) => {
    socket.join(`chat:${chatId}`);
  });
  socket.on("send-message", (data) => {
    const { chatId, content, type } = data;
    io.to(`chat:${chatId}`).emit("new-message", {
      chatId,
      content,
      type: type || "text",
      timestamp: new Date(),
    });
  });
  socket.on("disconnect", () => {
    console.log("Socket.IO client disconnected:", socket.id);
  });
});

app.use(express.static("../client/dist"));
app.get("*", (req: Request, res: Response) => {
  res.sendFile("../client/dist/index.html", { root: process.cwd() });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket listening on ws://localhost:${PORT}`);
});