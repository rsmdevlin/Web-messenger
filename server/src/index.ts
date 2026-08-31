import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { createPool } from "mysql2/promise";
import bcrypt from "bcrypt";
import { Server } from "socket.io";
import http from "http";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === "production" 
      ? process.env.FRONTEND_URL 
      : "http://localhost:5173",
    credentials: true
  }
});

app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? process.env.FRONTEND_URL
    : "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const pool = createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const sessions = new Map();

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const requireAuth = (req, res, next) => {
  const sessionId = req.cookies.sessionId;
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.userId = sessions.get(sessionId).userId;
  next();
};

app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }
    const conn = await pool.getConnection();
    const [existing] = await conn.execute(
      "SELECT id FROM users WHERE email = ? OR username = ?",
      [email, username]
    );
    if (Array.isArray(existing) && existing.length > 0) {
      conn.release();
      return res.status(409).json({ error: "User exists" });
    }
    const hashed = await bcrypt.hash(password, 10);
    await conn.execute(
      "INSERT INTO users (username, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
      [username, email, hashed]
    );
    conn.release();
    res.status(201).json({ message: "Registered" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }
    const conn = await pool.getConnection();
    const [rows] = await conn.execute(
      "SELECT id, password_hash FROM users WHERE email = ?",
      [email]
    );
    if (!Array.isArray(rows) || rows.length === 0) {
      conn.release();
      return res.status(401).json({ error: "Invalid" });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      conn.release();
      return res.status(401).json({ error: "Invalid" });
    }
    conn.release();
    const sessionId = Math.random().toString(36).substring(2, 15);
    sessions.set(sessionId, { userId: user.id });
    res.cookie("sessionId", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.json({ message: "Logged in" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  const sessionId = req.cookies.sessionId;
  if (sessionId) sessions.delete(sessionId);
  res.clearCookie("sessionId");
  res.json({ message: "Logged out" });
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.execute(
      "SELECT id, username, email FROM users WHERE id = ?",
      [req.userId]
    );
    conn.release();
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/chats", requireAuth, async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [chats] = await conn.execute(
      "SELECT c.id, c.name, c.type FROM chats c JOIN chat_members cm ON c.id = cm.chat_id WHERE cm.user_id = ? ORDER BY c.updated_at DESC",
      [req.userId]
    );
    conn.release();
    res.json(chats || []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/chats", requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    const conn = await pool.getConnection();
    const [result] = await conn.execute(
      "INSERT INTO chats (name, type, created_at, updated_at) VALUES (?, ?, NOW(), NOW())",
      [name || "Chat", "private"]
    );
    const chatId = result.insertId;
    await conn.execute(
      "INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES (?, ?, ?, NOW())",
      [chatId, req.userId, "admin"]
    );
    conn.release();
    res.status(201).json({ id: chatId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/chats/:id/messages", requireAuth, async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [messages] = await conn.execute(
      "SELECT m.id, m.content, m.sender_id, m.created_at, u.username FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.chat_id = ? ORDER BY m.created_at ASC",
      [req.params.id]
    );
    conn.release();
    res.json(messages || []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/chats/:id/messages", requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "Content required" });
    const conn = await pool.getConnection();
    const [result] = await conn.execute(
      "INSERT INTO messages (chat_id, sender_id, content, created_at, updated_at, read) VALUES (?, ?, ?, NOW(), NOW(), 1)",
      [req.params.id, req.userId, content]
    );
    await conn.execute("UPDATE chats SET updated_at = NOW() WHERE id = ?", [req.params.id]);
    conn.release();
    io.to(`chat-${req.params.id}`).emit("new-message", {
      id: result.insertId,
      content,
      sender_id: req.userId,
      created_at: new Date()
    });
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

io.on("connection", (socket) => {
  socket.on("join-chat", (chatId) => {
    socket.join(`chat-${chatId}`);
  });
  socket.on("leave-chat", (chatId) => {
    socket.leave(`chat-${chatId}`);
  });
  socket.on("typing", (data) => {
    socket.to(`chat-${data.chatId}`).emit("user-typing", { username: data.username });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server on port ${PORT}`);
});
