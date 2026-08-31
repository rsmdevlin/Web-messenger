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
app.use(express.urlencoded({ limit: "50mb", extended: true }));
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
  background_photo?: string;
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
const typingUsers = new Map<string, Set<number>>();

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

// ======================== AUTH ENDPOINTS ========================

app.post("/api/auth/register", async (req: Request, res: Response) => {
  try {
    const { email, password, username } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }
    const conn = await pool.getConnection();
    try {
      const [rows]: any = await conn.execute(
        "SELECT id FROM users WHERE email = ?",
        [email]
      );
      if (rows.length > 0) {
        return res.status(409).json({ error: "Email already registered" });
      }

      let finalUsername = username;
      if (!finalUsername) {
        finalUsername = `user_${randomBytes(4).toString("hex")}`;
      } else {
        const [existing]: any = await conn.execute(
          "SELECT id FROM users WHERE username = ?",
          [finalUsername]
        );
        if (existing.length > 0) {
          return res.status(409).json({ error: "Username taken" });
        }
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const [result]: any = await conn.execute(
        "INSERT INTO users (username, email, password_hash, theme, message_style, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
        [finalUsername, email, passwordHash, "dark", "rounded"]
      );
      const sessionId = randomBytes(32).toString("hex");
      sessions.set(sessionId, { userId: result.insertId, username: finalUsername });
      const isProduction = process.env.NODE_ENV === "production";
      res.cookie("sessionId", sessionId, {
        httpOnly: true,
        secure: isProduction || process.env.COOKIE_SECURE === "true",
        sameSite: (process.env.COOKIE_SAMESITE as any) || "lax",
        maxAge: 24 * 60 * 60 * 1000,
      });
      res.status(201).json({
        id: result.insertId,
        username: finalUsername,
        email,
        theme: "dark",
        message_style: "rounded"
      });
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
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }
    const conn = await pool.getConnection();
    try {
      const [rows]: any = await conn.execute(
        "SELECT id, username, email, password_hash, display_name, avatar, theme, message_style FROM users WHERE email = ?",
        [email]
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
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        avatar: user.avatar,
        theme: user.theme || "dark",
        message_style: user.message_style || "rounded"
      });
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

// ======================== USER ENDPOINTS ========================

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
      const [user]: any = await conn.execute(
        "SELECT id, username, email, display_name, avatar, theme, message_style FROM users WHERE id = ?",
        [session.userId]
      );
      res.json(user[0]);
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
      const [updatedUser]: any = await conn.execute(
        "SELECT id, username, email, display_name, avatar, theme, message_style FROM users WHERE id = ?",
        [session.userId]
      );
      res.json(updatedUser[0]);
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("Update email error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/user/display-name", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { displayName } = req.body;
    const session = (req as any).session;
    const conn = await pool.getConnection();
    try {
      await conn.execute(
        "UPDATE users SET display_name = ? WHERE id = ?",
        [displayName || null, session.userId]
      );
      const [user]: any = await conn.execute(
        "SELECT id, username, email, display_name, avatar, theme, message_style FROM users WHERE id = ?",
        [session.userId]
      );
      res.json(user[0]);
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("Update display name error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/user/avatar", authMiddleware, async (req: Request, res: Response) => {
  try {
    const session = (req as any).session;
    const { avatar } = req.body;

    if (!avatar) {
      return res.status(400).json({ error: "No avatar provided" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.execute(
        "UPDATE users SET avatar = ? WHERE id = ?",
        [avatar, session.userId]
      );
      res.json({ avatar });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("Avatar upload error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/user/profile", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { displayName, theme, messageStyle, backgroundPhoto } = req.body;
    const session = (req as any).session;
    const conn = await pool.getConnection();
    try {
      await conn.execute(
        "UPDATE users SET display_name = ?, theme = ?, message_style = ?, background_photo = ? WHERE id = ?",
        [displayName || null, theme || "dark", messageStyle || "rounded", backgroundPhoto || null, session.userId]
      );
      const [user]: any = await conn.execute(
        "SELECT id, username, email, display_name, avatar, theme, message_style, background_photo FROM users WHERE id = ?",
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

app.get("/api/user/search/:query", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { query } = req.params;
    if (!query || query.length < 1) {
      return res.json([]);
    }
    const conn = await pool.getConnection();
    try {
      const [users]: any = await conn.execute(
        "SELECT id, username, email, display_name, avatar FROM users WHERE username LIKE ? OR display_name LIKE ? LIMIT 10",
        [`%${query}%`, `%${query}%`]
      );
      res.json(users || []);
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("Search users error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ======================== CHATS ENDPOINTS ========================

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
    const { name, targetUserId } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Chat name required" });
    }
    const session = (req as any).session;
    const conn = await pool.getConnection();
    try {
      const [result]: any = await conn.execute(
        "INSERT INTO chats (name, type, created_by, target_user_id, created_at) VALUES (?, ?, ?, ?, NOW())",
        [name.trim(), "direct", session.userId, targetUserId || null]
      );
      res.status(201).json({
        id: result.insertId,
        name: name.trim(),
        type: "direct",
        created_by: session.userId,
        target_user_id: targetUserId || null,
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

// ======================== MESSAGES ENDPOINTS ========================

app.get("/api/messages/:chatId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const conn = await pool.getConnection();
    try {
      const [messages]: any = await conn.execute(
        "SELECT m.*, u.username, u.avatar FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.chat_id = ? ORDER BY m.created_at ASC LIMIT 100",
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
        username: session.username,
        avatar: null,
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

// ======================== MESSAGE REACTIONS ========================

app.post("/api/messages/:messageId/reaction", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { reaction } = req.body;
    const session = (req as any).session;

    if (!reaction) {
      return res.status(400).json({ error: "Reaction required" });
    }

    const conn = await pool.getConnection();
    try {
      const [existing]: any = await conn.execute(
        "SELECT id FROM message_reactions WHERE message_id = ? AND user_id = ? AND reaction = ?",
        [messageId, session.userId, reaction]
      );

      if (existing.length > 0) {
        await conn.execute(
          "DELETE FROM message_reactions WHERE message_id = ? AND user_id = ? AND reaction = ?",
          [messageId, session.userId, reaction]
        );
      } else {
        await conn.execute(
          "INSERT INTO message_reactions (message_id, user_id, reaction, created_at) VALUES (?, ?, ?, NOW())",
          [messageId, session.userId, reaction]
        );
      }

      const [reactions]: any = await conn.execute(
        "SELECT reaction, COUNT(*) as count FROM message_reactions WHERE message_id = ? GROUP BY reaction",
        [messageId]
      );

      io.emit("message_reaction", { messageId, reactions });
      res.json({ reactions });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("Reaction error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ======================== SOCKET.IO EVENTS ========================

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
    const room = `chat_${data.chat_id}`;
    if (data.isTyping) {
      if (!typingUsers.has(room)) {
        typingUsers.set(room, new Set());
      }
      typingUsers.get(room)!.add(socket.id as any);
    } else {
      typingUsers.get(room)?.delete(socket.id as any);
    }

    const typingList = Array.from(typingUsers.get(room) || new Set()).length;
    io.to(room).emit("typing", {
      username: data.username,
      isTyping: data.isTyping,
      count: typingList,
    });
  });

  socket.on("disconnect", () => {
    typingUsers.forEach((users) => {
      users.delete(socket.id as any);
    });
  });
});

// ======================== SPA FALLBACK ========================

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../../client/dist/index.html"));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
