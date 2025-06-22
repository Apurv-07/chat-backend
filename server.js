const express = require("express");
const app = express();
const env = require("dotenv").config();
const dummyData = require("./dummyData");
const mongoose = require("mongoose");
const UserRouter = require("./routes/UserRouter");
const chatRouter = require("./routes/ChatRouter");
const messageRouter = require("./routes/MessageRouter");
const cors = require("cors");

app.use(express.json());

app.get("/", (req, res) => {
  res.send("hello world");
});

app.use("/api/chat", chatRouter);

app.use("/api/user", UserRouter);

app.use("/api/message", messageRouter);

const server = app.listen(process.env.PORT || 5000, async () => {
  try {
    const db = await mongoose.connect(process.env.URL);
    console.log("✅ Server running, DB connected at", db.connection.host);
  } catch (err) {
    console.error("❌ DB connection error:", err);
  }
});

const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: ["http://localhost:3000", "https://chat-app-frontend-beta-eight.vercel.app"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("🟢 SOCKET CONNECTED:", socket.id);

  socket.on("setup", (userData) => {
    console.log("→ setup received:", userData._id);
    socket.join(userData._id);
    socket.emit("connected");
  });

  socket.on("join chat", (room) => {
    console.log("→ join chat received for room:", room);
    socket.join(room);
    console.log(`   🔒 socket ${socket.id} joined room ${room}`);
  });

  socket.on("new message", (newMessageRecieved) => {
    console.log("→ new message event:", newMessageRecieved._id);
    const chat = newMessageRecieved.chat;

    if (!chat?.users) return console.log("❌ chat.users not defined");

    const receiverIds = chat.users.map((u) => u._id);
    console.log("   Participants IDs:", receiverIds);

    chat.users.forEach((user) => {
      // if (user._id === newMessageRecieved.sender._id) return;
      console.log(`   🔁 Emitting to user ID: ${user._id}`);
      socket.in(user._id).emit("message recieved", newMessageRecieved);
    });
  });

  socket.on("typing", ({ roomId, user }) => {
    socket.in(roomId).emit("typing", user); // emit user info
  });

  socket.on("stop typing", ({ roomId, user }) => {
    socket.in(roomId).emit("stop typing", user._id); // emit only user ID for cleanup
  });

  socket.on("disconnect", () => {
    console.log("🔴 SOCKET DISCONNECTED:", socket.id);
  });
});
