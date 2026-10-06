import express from "express";
import { deleteMe, getMe, logout, requestOtp, requireAuth, verifyOtp } from "./auth.ts";
import { deleteChat, getMessages, listPersonas, sendMessage, unlockMessagePhoto } from "./chat.ts";
import { MEDIA_DIR, PORT } from "./config.ts";
import { createOrder, devTopup, getWallet, razorpayWebhook, verifyPayment } from "./payments.ts";
import { getPersonas } from "./personas.ts";

const app = express();
app.set("trust proxy", true);

// Native apps don't need CORS; this lets the Expo web build talk to the API during development.
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Webhook signature is computed over the raw body, so this route skips the JSON parser.
app.post("/webhooks/razorpay", express.raw({ type: "application/json" }), razorpayWebhook);
app.use(express.json({ limit: "32kb" }));
app.use("/media", express.static(MEDIA_DIR, { maxAge: "7d" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/auth/otp/request", requestOtp);
app.post("/auth/otp/verify", verifyOtp);
app.post("/auth/logout", logout);

app.use(requireAuth);
app.get("/me", getMe);
app.delete("/me", deleteMe);
app.get("/personas", listPersonas);
app.get("/chats/:personaId/messages", getMessages);
app.post("/chats/:personaId/messages", sendMessage);
app.post("/chats/:personaId/messages/:messageId/unlock", unlockMessagePhoto);
app.delete("/chats/:personaId", deleteChat);
app.get("/wallet", getWallet);
app.post("/wallet/orders", createOrder);
app.post("/wallet/orders/verify", verifyPayment);
app.post("/wallet/dev-topup", devTopup);

getPersonas(); // load once at boot so file errors show up immediately
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
