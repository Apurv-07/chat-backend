const app = require("express");
const router = app.Router();
const message = require("../models/messageModel");
const chat = require("../models/chatModel");
const { authProtector } = require("../middlewares/authProtector");

router.get("/", authProtector, async (req, res) => {
  try {
    const userId = req.user.id;
    const userChats = await Chat.find({ users: userId }).select("_id");
    const chatIds = userChats.map((chat) => chat._id);

    const messages = await message
      .find({ chat: { $in: chatIds } })
      .populate("sender", "-password")
      .populate("chat");

    res.status(200).json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching messages" });
  }
});

router.get("/:chatId", authProtector, async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;
  const totalCount = await message.countDocuments({ chat: req.params.chatId });

  try {
    const msgs = await message
      .find({ chat: req.params.chatId })
      .sort({ createdAt: -1 }) // newest first
      .skip(skip)
      .limit(parseInt(limit))
      .populate("sender", "-password")
      .populate("chat");
    res.json({ totalCount, msgs});
  } catch (err) {
    res.status(500).json({ message: "Could not fetch messages" });
  }
});

router.post("/", authProtector, async (req, res) => {
  const { content, chatId } = req.body;
  console.log("Got the message", req.body);
  console.log("Got the user", req.user);

  if (!content || !chatId) {
    return res.status(400).send("Content and Chat ID are required");
  }

  try {
    const newMessage = await message.create({
      sender: req.user.id,
      content,
      chat: chatId,
    });

    // ✅ Now find and populate the full message properly
    const fullMessage = await message
      .findById(newMessage._id)
      .populate("sender", "name email")
      .populate({
        path: "chat",
        populate: {
          path: "users",
          select: "name email _id",
        },
      });

    await chat.findByIdAndUpdate(chatId, { latestMessage: fullMessage });

    res.status(201).json(fullMessage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not send message" });
  }
});

module.exports = router;
