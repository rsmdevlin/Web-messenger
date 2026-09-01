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
import fs from "fs";

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

// Initialize database schema on startup
async function initializeDatabase() {
  try {
    const conn = await pool.getConnection();
    try {
      const migrationSQL = fs.readFileSync(
        path.join(__dirname, "../migrations/001_init_schema.sql"),
        "utf-8"
      );

      // Split by semicolon and execute each statement
      const statements = migrationSQL.split(";").filter(stmt => stmt.trim());
      for (const statement of statements) {
        if (statement.trim()) {
          await conn.execute(statement);
        }
      }

      console.log("✅ Database schema initialized successfully");
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("❌ Database initialization error:", error);
    // Don't crash, let the server continue
  }
}

const sessions = new Map<string, Session>();
const typingUsers = new Map<string, Set<number>>();
const onlineUsers = new Map<number, { socketId: string; connectedAt: Date }>();

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

    let conn;
    try {
      conn = await pool.getConnection();
    } catch (dbErr: any) {
      console.error("❌ Database connection failed:", dbErr.message);
      return res.status(500).json({ error: "Database connection error: " + dbErr.message });
    }

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
    res.status(500).json({ error: "Server error: " + (error as any).message });
  }
});

app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    let conn;
    try {
      conn = await pool.getConnection();
    } catch (dbErr: any) {
      console.error("❌ Database connection failed:", dbErr.message);
      return res.status(500).json({ error: "Database connection error: " + dbErr.message });
    }

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
    res.status(500).json({ error: "Server error: " + (error as any).message });
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

app.get("/api/user/online-status/:userId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const userIdNum = parseInt(userId);

    const conn = await pool.getConnection();
    try {
      const [userRows]: any = await conn.execute(
        "SELECT id, last_seen, show_online_status FROM users WHERE id = ?",
        [userIdNum]
      );

      if (userRows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const user = userRows[0];
      const isOnline = onlineUsers.has(userIdNum);

      // Respect privacy settings
      if (!user.show_online_status && !isOnline) {
        return res.json({
          userId: userIdNum,
          isOnline: false,
          lastSeen: "hidden",
          status: "was recently",
        });
      }

      res.json({
        userId: userIdNum,
        isOnline,
        lastSeen: user.last_seen,
        status: isOnline ? "online" : "offline",
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("Online status error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/user/privacy", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { show_online_status } = req.body;
    const session = (req as any).session;

    const conn = await pool.getConnection();
    try {
      await conn.execute(
        "UPDATE users SET show_online_status = ? WHERE id = ?",
        [show_online_status ? 1 : 0, session.userId]
      );
      res.json({ success: true, show_online_status });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("Privacy update error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/user/:userId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const userIdNum = parseInt(userId);

    const conn = await pool.getConnection();
    try {
      const [userRows]: any = await conn.execute(
        "SELECT id, username, display_name, avatar, email FROM users WHERE id = ?",
        [userIdNum]
      );

      if (userRows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(userRows[0]);
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

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
      // Search only by username, not display_name
      const [users]: any = await conn.execute(
        "SELECT id, username, email, display_name, avatar FROM users WHERE username LIKE ? LIMIT 10",
        [`%${query}%`]
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
        `SELECT c.id, c.name, c.type, c.created_by, c.created_at, c.target_user_id, COALESCE(u.display_name, u.username) as chat_display_name
         FROM chats c
         LEFT JOIN users u ON c.target_user_id = u.id
         WHERE c.created_by = ? OR c.target_user_id = ?
         GROUP BY c.id
         ORDER BY c.created_at DESC`,
        [session.userId, session.userId]
      );
      const result = (chats || []).map((chat: any) => ({
        ...chat,
        name: chat.chat_display_name || chat.name,
        chat_display_name: chat.chat_display_name,
      }));
      res.json(result);
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
    const { name, targetUserId, participants, isGroup } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Chat name required" });
    }
    const session = (req as any).session;
    const conn = await pool.getConnection();
    try {
      // For direct chats with a target user, check if chat already exists in either direction
      if (targetUserId && !isGroup) {
        const [existing]: any = await conn.execute(
          `SELECT id, name FROM chats WHERE type = 'direct' AND (
            (created_by = ? AND target_user_id = ?) OR
            (created_by = ? AND target_user_id = ?)
          )`,
          [session.userId, targetUserId, targetUserId, session.userId]
        );

        if (existing.length > 0) {
          // Chat already exists, return it
          return res.status(200).json(existing[0]);
        }
      }

      const chatType = isGroup ? "group" : "direct";
      const [result]: any = await conn.execute(
        "INSERT INTO chats (name, type, created_by, target_user_id, created_at) VALUES (?, ?, ?, ?, NOW())",
        [name.trim(), chatType, session.userId, targetUserId || null]
      );

      const chatId = result.insertId;

      // Add participants if group chat
      if (isGroup && participants && Array.isArray(participants)) {
        // Add creator as admin
        await conn.execute(
          "INSERT INTO participants (chat_id, user_id, role) VALUES (?, ?, ?)",
          [chatId, session.userId, "admin"]
        );

        // Add other participants as members
        for (const userId of participants) {
          if (userId !== session.userId) {
            await conn.execute(
              "INSERT INTO participants (chat_id, user_id, role) VALUES (?, ?, ?)",
              [chatId, userId, "member"]
            );
          }
        }
      }

      res.status(201).json({
        id: chatId,
        name: name.trim(),
        type: chatType,
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

app.get("/api/chats/:chatId/participants", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const conn = await pool.getConnection();
    try {
      const [participants]: any = await conn.execute(
        `SELECT p.*, u.username, u.display_name, u.avatar FROM participants p
         JOIN users u ON p.user_id = u.id
         WHERE p.chat_id = ?
         ORDER BY p.role DESC, p.joined_at ASC`,
        [chatId]
      );
      res.json(participants);
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("Get participants error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/chats/:chatId/participants", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const { userId } = req.body;
    const session = (req as any).session;

    const conn = await pool.getConnection();
    try {
      // Check if user is admin
      const [admin]: any = await conn.execute(
        "SELECT role FROM participants WHERE chat_id = ? AND user_id = ?",
        [chatId, session.userId]
      );

      if (!admin.length || admin[0].role !== "admin") {
        return res.status(403).json({ error: "Only admins can add members" });
      }

      // Check if user already in group
      const [exists]: any = await conn.execute(
        "SELECT id FROM participants WHERE chat_id = ? AND user_id = ?",
        [chatId, userId]
      );

      if (exists.length > 0) {
        return res.status(409).json({ error: "User already in group" });
      }

      await conn.execute(
        "INSERT INTO participants (chat_id, user_id, role) VALUES (?, ?, ?)",
        [chatId, userId, "member"]
      );

      res.json({ success: true });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("Add participant error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/chats/:chatId/participants/:userId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { chatId, userId } = req.params;
    const session = (req as any).session;

    const conn = await pool.getConnection();
    try {
      // Check if user is admin or removing themselves
      const [admin]: any = await conn.execute(
        "SELECT role FROM participants WHERE chat_id = ? AND user_id = ?",
        [chatId, session.userId]
      );

      if (!admin.length || (admin[0].role !== "admin" && parseInt(userId) !== session.userId)) {
        return res.status(403).json({ error: "Permission denied" });
      }

      await conn.execute(
        "DELETE FROM participants WHERE chat_id = ? AND user_id = ?",
        [chatId, userId]
      );

      res.json({ success: true });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("Remove participant error:", error);
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
    const { chat_id, content, type = "text", media_data } = req.body;
    if (!chat_id || !content) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const session = (req as any).session;
    const conn = await pool.getConnection();
    try {
      // Check if this is the first message in the chat
      const [existingMessages]: any = await conn.execute(
        "SELECT COUNT(*) as count FROM messages WHERE chat_id = ?",
        [chat_id]
      );
      const isFirstMessage = existingMessages[0].count === 0;

      const messageType = type === "media" ? "media" : "text";
      const [result]: any = await conn.execute(
        "INSERT INTO messages (chat_id, sender_id, content, type, is_read, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
        [chat_id, session.userId, content, messageType, 0]
      );

      // Get user display info
      const [userRows]: any = await conn.execute(
        "SELECT display_name, avatar FROM users WHERE id = ?",
        [session.userId]
      );
      const userInfo = userRows[0] || {};

      const message = {
        id: result.insertId,
        chat_id,
        sender_id: session.userId,
        content,
        type: messageType,
        is_read: 0,
        created_at: new Date().toISOString(),
        username: session.username,
        displayName: userInfo.display_name,
        avatar: userInfo.avatar || null,
        media_data: media_data || null,
      };
      console.log(`📢 Broadcasting message to room chat_${chat_id}:`, message);
      io.to(`chat_${chat_id}`).emit("new_message", message);

      // If first message, broadcast new chat to both participants
      if (isFirstMessage) {
        const [chatData]: any = await conn.execute(
          "SELECT id, name, type, created_by, created_at, target_user_id FROM chats WHERE id = ?",
          [chat_id]
        );

        if (chatData.length > 0) {
          const chat = chatData[0];

          // For direct chats, get the other participant's info
          if (chat.type === 'direct' && chat.target_user_id) {
            const otherUserId = session.userId === chat.created_by ? chat.target_user_id : chat.created_by;

            // Get other user's info for chat_display_name
            const [otherUserRows]: any = await conn.execute(
              "SELECT display_name FROM users WHERE id = ?",
              [otherUserId]
            );
            const otherUserDisplayName = otherUserRows[0]?.display_name || chat.name;

            const newChat = {
              ...chat,
              chat_display_name: otherUserDisplayName,
            };

            // Broadcast to both users
            io.to(`user_${chat.created_by}`).emit("new_chat", newChat);
            io.to(`user_${chat.target_user_id}`).emit("new_chat", newChat);
            console.log(`🆕 Broadcasting new chat ${chat_id} to users ${chat.created_by} and ${chat.target_user_id}`);
          }
        }
      }

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

io.on("connection", async (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Get user ID from session
  const sessionId = (socket.handshake.headers.cookie || "")
    .split("; ")
    .find(c => c.startsWith("sessionId="))
    ?.split("=")[1];

  let userId: number | null = null;
  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId);
    if (session) {
      userId = session.userId;
      socket.join(`user_${userId}`);
      console.log(`✅ Socket ${socket.id} joined user room user_${userId}`);

      // Mark user as online
      onlineUsers.set(userId, { socketId: socket.id, connectedAt: new Date() });
      console.log(`🟢 User ${userId} marked as ONLINE`);

      // Update last_seen in database
      try {
        const conn = await pool.getConnection();
        try {
          await conn.execute(
            "UPDATE users SET last_seen = NOW() WHERE id = ?",
            [userId]
          );
        } finally {
          conn.release();
        }
      } catch (error) {
        console.error("Error updating last_seen:", error);
      }

      // Broadcast online status change to all connected clients
      io.emit("user_online_status", {
        userId,
        isOnline: true,
        timestamp: new Date().toISOString(),
      });
    }
  }

  socket.on("join_chat", (data: { chat_id: number }) => {
    console.log(`👥 Socket ${socket.id} joining room chat_${data.chat_id}`);
    socket.join(`chat_${data.chat_id}`);
    console.log(`✅ Socket ${socket.id} joined chat_${data.chat_id}`);
  });

  socket.on("send_message", (data: { chat_id: number; content: string; sender_id: number }) => {
    console.log(`📨 send_message event received for chat ${data.chat_id}`);
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

  socket.on("mark_read", async (data: { chat_id: number; message_ids: number[] }) => {
    try {
      const conn = await pool.getConnection();
      try {
        for (const messageId of data.message_ids) {
          await conn.execute(
            "UPDATE messages SET is_read = 1 WHERE id = ?",
            [messageId]
          );
        }
        console.log(`✅ Marked ${data.message_ids.length} messages as read in chat ${data.chat_id}`);
        io.to(`chat_${data.chat_id}`).emit("message_read", { message_ids: data.message_ids });
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("❌ Error marking messages as read:", error);
    }
  });

  socket.on("group_member_added", async (data: { chat_id: number; member_id: number; role: string }) => {
    console.log(`➕ User ${data.member_id} added to group ${data.chat_id}`);
    io.to(`chat_${data.chat_id}`).emit("group_member_added", {
      chat_id: data.chat_id,
      member_id: data.member_id,
      role: data.role,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on("group_member_removed", async (data: { chat_id: number; member_id: number }) => {
    console.log(`➖ User ${data.member_id} removed from group ${data.chat_id}`);
    io.to(`chat_${data.chat_id}`).emit("group_member_removed", {
      chat_id: data.chat_id,
      member_id: data.member_id,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on("disconnect", async () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
    typingUsers.forEach((users) => {
      users.delete(socket.id as any);
    });

    // Mark user as offline
    if (userId && onlineUsers.has(userId)) {
      onlineUsers.delete(userId);
      console.log(`🔴 User ${userId} marked as OFFLINE`);

      // Update last_seen in database
      try {
        const conn = await pool.getConnection();
        try {
          await conn.execute(
            "UPDATE users SET last_seen = NOW() WHERE id = ?",
            [userId]
          );
        } finally {
          conn.release();
        }
      } catch (error) {
        console.error("Error updating last_seen on disconnect:", error);
      }

      // Broadcast offline status change
      io.emit("user_online_status", {
        userId,
        isOnline: false,
        timestamp: new Date().toISOString(),
      });
    }
  });
});

// ======================== SPA FALLBACK ========================

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../../client/dist/index.html"));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📚 Database URL: ${process.env.DATABASE_URL ? 'SET' : '❌ NOT SET'}`);
  console.log(`🌍 Frontend URL: ${process.env.FRONTEND_URL || 'default (http://localhost:5173)'}`);

  // Initialize database schema
  await initializeDatabase();
});
