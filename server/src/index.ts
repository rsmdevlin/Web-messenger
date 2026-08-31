import express, { Express, Request, Response } from "express";
import http from "http";
import path from "path";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import cookieParser from "cookie-parser";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  },
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb" }));
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));

// Serve static files from dist
app.use(express.static(path.join(__dirname, "../../client/dist")));

interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  display_name?: string;
  avatar?: string;
  theme?: string;
  message_style?: string;
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

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Auth endpoints
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

app.get("/api/auth/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    const session = (req as any).session;
    const conn = await pool.getConnection();
    try {
      const [rows]: any = await conn.execute(
        "SELECT id, username, email, display_name, avatar, theme, message_style FROM users WHERE id = ?",
        [session.userId]
      );
      if (rows.length === 0) {
        return res.status(401).json({ error: "User not found" });
      }
      res.json(rows[0]);
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("Auth me error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/auth/logout", (req: Request, res: Response) => {
  const sessionId = req.cookies.sessionId;
  if (sessionId) {
    sessions.delete(sessionId);
  }
  res.clearCookie("sessionId");
  res.json({ status: "ok" });
});

// User endpoints
app.put("/api/user/username", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { username } = req.body;
    if (!username || !username.trim()) {
      return res.status(400).json({ error: "Username required" });
    }
    const session = (req as any).session;
    const conn = await pool.getConnection();
    try {
      const [existing]: any = await conn.execute(
        "SELECT id FROM users WHERE username = ? AND id != ?",
        [username, session.userId]
      );
      if (existing.length > 0) {
        return res.status(409).json({ error: "Username already taken" });
      }
      await conn.execute(
        "UPDATE users SET username = ? WHERE id = ?",
        [username, session.userId]
      );
      sessions.get((req as any).sessionId)!.username = username;
      res.json({ id: session.userId, username });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("Update username error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/user/email", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }
    const session = (req as any).session;
    const conn = await pool.getConnection();
    try {
      const [user]: any = await conn.execute(
        "SELECT password_hash FROM users WHERE id = ?",
        [session.userId]
      );
      const passwordMatch = await bcrypt.compare(password, user[0].password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid password" });
      }
      const [existing]: any = await conn.execute(
        "SELECT id FROM users WHERE email = ? AND id != ?",
        [email, session.userId]
      );
      if (existing.length > 0) {
        return res.status(409).json({ error: "Email already in use" });
      }
      await conn.execute(
        "UPDATE users SET email = ? WHERE id = ?",
        [email, session.userId]
      );
      res.json({ id: session.userId, email });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("Update email error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/user/profile", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { display_name, theme, message_style } = req.body;
    const session = (req as any).session;
    const conn = await pool.getConnection();
    try {
      await conn.execute(
        "UPDATE users SET display_name = ?, theme = ?, message_style = ? WHERE id = ?",
        [display_name || null, theme || "dark", message_style || "rounded", session.userId]
      );
      const [user]: any = await conn.execute(
        "SELECT * FROM users WHERE id = ?",
        [session.userId]
      );
      res.json(user[0]);
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Chats endpoints
app.get("/api/chats", authMiddleware, async (req: Request, res: Response) => {
  try {
    const session = (req as any).session;
    const conn = await pool.getConnection();
    try {
      const [chats]: any = await conn.execute(
        "SELECT * FROM chats WHERE created_by = ? ORDER BY created_at DESC",
        [session.userId]
      );
      res.json(chats || []);
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
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Chat name required" });
    }
    const session = (req as any).session;
    const conn = await pool.getConnection();
    try {
      const [result]: any = await conn.execute(
        "INSERT INTO chats (name, type, created_by, created_at) VALUES (?, ?, ?, NOW())",
        [name.trim(), "direct", session.userId]
      );
      res.status(201).json({
        id: result.insertId,
        name: name.trim(),
        type: "direct",
        created_by: session.userId,
        created_at: new Date().toISOString(),
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("Create chat error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Messages endpoints
app.get("/api/messages/:chatId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const conn = await pool.getConnection();
    try {
      const [messages]: any = await conn.execute(
        "SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC LIMIT 100",
        [chatId]
      );
      res.json(messages || []);
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/messages", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { chat_id, content } = req.body;
    if (!chat_id || !content) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const session = (req as any).session;
    const conn = await pool.getConnection();
    try {
      const [result]: any = await conn.execute(
        "INSERT INTO messages (chat_id, sender_id, content, type, is_read, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
        [chat_id, session.userId, content, "text", 0]
      );
      const message = {
        id: result.insertId,
        chat_id,
        sender_id: session.userId,
        content,
        type: "text",
        is_read: 0,
        created_at: new Date().toISOString(),
      };
      io.to(`chat_${chat_id}`).emit("new_message", message);
      res.status(201).json(message);
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("Create message error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Socket.IO events
io.on("connection", (socket) => {
  socket.on("join_chat", (data: { chat_id: number }) => {
    socket.join(`chat_${data.chat_id}`);
  });

  socket.on("send_message", (data: { chat_id: number; content: string; sender_id: number }) => {
    io.to(`chat_${data.chat_id}`).emit("new_message", {
      chat_id: data.chat_id,
      sender_id: data.sender_id,
      content: data.content,
      created_at: new Date().toISOString(),
    });
  });

  socket.on("typing", (data: { chat_id: number; username: string; isTyping: boolean }) => {
    io.to(`chat_${data.chat_id}`).emit("typing", {
      username: data.username,
      isTyping: data.isTyping,
    });
  });
});

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../../client/dist/index.html"));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
