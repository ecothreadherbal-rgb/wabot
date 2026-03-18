import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import pino from "pino";
import fs from "fs-extra";
import QRCode from "qrcode";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = "whatsauto-secret-key";
const db = new Database("database.sqlite");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password TEXT,
    businessName TEXT,
    createdAt INTEGER
  );
  CREATE TABLE IF NOT EXISTS rules (
    id TEXT PRIMARY KEY,
    userId TEXT,
    keyword TEXT,
    reply TEXT,
    type TEXT,
    FOREIGN KEY(userId) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    userId TEXT,
    customerPhone TEXT,
    date TEXT,
    time TEXT,
    status TEXT,
    FOREIGN KEY(userId) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    userId TEXT,
    fromPhone TEXT,
    text TEXT,
    timestamp INTEGER,
    isFromMe INTEGER,
    FOREIGN KEY(userId) REFERENCES users(id)
  );
`);

// WhatsApp Session Manager
const sessions = new Map<string, any>();

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  app.use(cors());
  app.use(express.json());

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", sessions: Array.from(sessions.keys()) });
  });

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    // Always bypass for single-user desktop mode
    req.user = { id: "admin", email: "admin@whatsauto.com", businessName: "WhatsAuto Admin" };
    next();
  };

  // Ensure default user exists
  db.prepare("INSERT OR IGNORE INTO users (id, email, password, businessName, createdAt) VALUES (?, ?, ?, ?, ?)").run(
    "admin", 
    "admin@whatsauto.com", 
    "admin", 
    "WhatsAuto Admin", 
    Date.now()
  );

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, businessName } = req.body;
    const id = Math.random().toString(36).substring(7);
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      db.prepare("INSERT INTO users (id, email, password, businessName, createdAt) VALUES (?, ?, ?, ?, ?)").run(id, email, hashedPassword, businessName, Date.now());
      const token = jwt.sign({ id, email, businessName }, JWT_SECRET);
      res.json({ token, user: { id, email, businessName } });
    } catch (err: any) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id, email: user.email, businessName: user.businessName }, JWT_SECRET);
    res.json({ token, user: { id: user.id, email: user.email, businessName: user.businessName } });
  });

  // Bot Rules API
  app.get("/api/rules", authenticate, (req: any, res) => {
    const rules = db.prepare("SELECT * FROM rules WHERE userId = ?").all(req.user.id);
    res.json(rules);
  });

  app.post("/api/rules", authenticate, (req: any, res) => {
    const { keyword, reply, type } = req.body;
    const id = Math.random().toString(36).substring(7);
    db.prepare("INSERT INTO rules (id, userId, keyword, reply, type) VALUES (?, ?, ?, ?, ?)").run(id, req.user.id, keyword, reply, type);
    res.json({ id, keyword, reply, type });
  });

  app.delete("/api/rules/:id", authenticate, (req: any, res) => {
    db.prepare("DELETE FROM rules WHERE id = ? AND userId = ?").run(req.params.id, req.user.id);
    res.json({ status: "deleted" });
  });

  // Bookings API
  app.get("/api/bookings", authenticate, (req: any, res) => {
    const bookings = db.prepare("SELECT * FROM bookings WHERE userId = ?").all(req.user.id);
    res.json(bookings);
  });

  // Broadcast API
  app.post("/api/broadcast", authenticate, async (req: any, res) => {
    const { message, contacts } = req.body;
    const sock = sessions.get(req.user.id);
    if (!sock) return res.status(404).json({ error: "WhatsApp not connected" });

    try {
      for (const contact of contacts) {
        await sock.sendMessage(contact, { text: message });
      }
      res.json({ status: "sent" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/reply", authenticate, async (req: any, res) => {
    const { to, text } = req.body;
    const sock = sessions.get(req.user.id);
    if (!sock) return res.status(404).json({ error: "WhatsApp not connected" });

    try {
      await sock.sendMessage(to, { text });
      // Save message to DB
      const id = Math.random().toString(36).substring(7);
      db.prepare("INSERT INTO messages (id, userId, fromPhone, text, timestamp, isFromMe) VALUES (?, ?, ?, ?, ?, ?)").run(id, req.user.id, to, text, Date.now(), 1);
      res.json({ status: "sent" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // WhatsApp Connection Endpoint
  io.on("connection", (socket) => {
    socket.on("init-session", async (userId: string) => {
      await createWhatsAppSession(userId, socket);
    });
  });

  async function createWhatsAppSession(userId: string, socket: any) {
    console.log(`[WhatsApp] Initializing session for user: ${userId}`);
    const sessionDir = path.join(process.cwd(), "sessions", userId);
    await fs.ensureDir(sessionDir);

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    console.log(`[WhatsApp] Using Baileys version: ${version.join(".")}`);

    const sock = makeWASocket({
      version,
      printQRInTerminal: false,
      auth: state,
      logger: pino({ level: "debug" }), // Set to debug for more info
    });

    sessions.set(userId, sock);

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log(`[WhatsApp] New QR code generated for ${userId}`);
        const qrDataURL = await QRCode.toDataURL(qr);
        socket.emit("qr", { userId, qr: qrDataURL });
      }

      if (connection === "close") {
        const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log(`[WhatsApp] Connection closed for ${userId}. Reconnecting: ${shouldReconnect}`);
        if (shouldReconnect) {
          createWhatsAppSession(userId, socket);
        } else {
          sessions.delete(userId);
          socket.emit("status", { userId, status: "disconnected" });
        }
      } else if (connection === "open") {
        console.log(`[WhatsApp] Connection opened for ${userId}`);
        socket.emit("status", { userId, status: "connected" });
      }
    });

    sock.ev.on("messages.upsert", async (m) => {
      if (m.type === "notify") {
        for (const msg of m.messages) {
          if (!msg.key.fromMe && msg.message) {
            const from = msg.key.remoteJid;
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
            
            // Save to DB
            const msgId = Math.random().toString(36).substring(7);
            db.prepare("INSERT INTO messages (id, userId, fromPhone, text, timestamp, isFromMe) VALUES (?, ?, ?, ?, ?, ?)").run(msgId, userId, from, text, Date.now(), 0);

            // Emit to frontend
            socket.emit("new-message", { userId, from, text, timestamp: Date.now() });

            // Bot Logic
            const rules: any[] = db.prepare("SELECT * FROM rules WHERE userId = ?").all(userId);
            const matchedRule = rules.find(r => r.keyword.toLowerCase() === text.toLowerCase());
            if (matchedRule) {
              await sock.sendMessage(from!, { text: matchedRule.reply });
            }
          }
        }
      }
    });
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
