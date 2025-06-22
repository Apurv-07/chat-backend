const express = require("express");
const router = express.Router();
const dummyData = require("../dummyData");
const chat = require("../models/chatModel");
const { authProtector } = require("../middlewares/authProtector");
router.get("/", authProtector, async (req, res) => {
  // get all chats
  userId = req.user.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const currentChats = await chat
      .find({ users: { $in: [userId] } })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage")
      .sort({ updatedAt: -1 });
    res.status(200).json(currentChats);
  } catch (err) {
    res.status(500).json({ message: "No chats available" });
  }
});

router.post("/create", authProtector, async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const existingChat = await chat
      .findOne({
        isGroupChat: false,
        users: { $all: [req.user.id, userId] }, // both users
      })
      .populate("users", "-password");

    if (existingChat) {
      return res.status(200).json(existingChat);
    }
    const newChat = await chat.create({
      users: [req.user.id, userId],
      isGroupChat: false,
    });

    const fullChat = await chat
      .findById(newChat._id)
      .populate("users", "-password");
    res.status(201).json(fullChat);
  } catch (error) {
    console.error("Chat creation error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/createGroup", authProtector, async (req, res) => {
  const { groupName, users } = req.body;
  console.log(req.body);
  if (!groupName || !users) {
    return res.status(400).send("Please fill all the fields");
  }
  try {
    const newChat = await chat.create({
      chatName: groupName,
      users: users,
      isGroupChat: true,
      groupAdmin: req.user.id,
    });
    const fullChat = await chat
      .findById(newChat._id)
      .populate("users", "-password")
      .populate("groupAdmin", "-password");
    res.status(201).json(fullChat);
  } catch (error) {
    console.error("Chat creation error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/rename", authProtector, async (req, res) => {
  // rename a chat
  const { chatId, chatName } = req.body;
  if (!chatId || !chatName) {
    return res.status(400).send("Please fill all the fields");
  }
  try {
    const updatedChat = await chat.findByIdAndUpdate(
      chatId,
      {
        chatName,
      },
      {
        new: true,
      }
    );
    res.status(200).json(updatedChat);
  } catch (error) {
    console.error("Chat rename error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/adduser", authProtector, async (req, res) => {
  // add user to a group
  const { chatId, userId } = req.body;
  if (!chatId || !userId) {
    return res.status(400).send("Please fill all the fields");
  }
  try {
    const updatedChat = await chat.findByIdAndUpdate(
      chatId,
      {
        $push: { users: userId },
      },
      {
        new: true,
      }
    );
    res.status(200).json(updatedChat);
  } catch (error) {
    console.error("Chat add user error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/removeuser", authProtector, async (req, res) => {
  // remove user from a chat
  const { chatId, userId } = req.body;
  if (!chatId || !userId) {
    return res.status(400).send("Please fill all the fields");
  }
  try {
    let updatedChat = await chat.findByIdAndUpdate(
      chatId,
      {
        $pull: { users: userId },
      },
      {
        new: true,
      }
    );

    // Re-fetch to ensure fresh state
    updatedChat = await chat.findById(chatId);

    if (
      updatedChat.groupAdmin &&
      updatedChat.groupAdmin.toString() === userId
    ) {
      const remainingUsers = updatedChat.users;

      if (remainingUsers.length > 0) {
        updatedChat.groupAdmin = remainingUsers[0];
      } else {
        updatedChat.groupAdmin = null;
      }
      await updatedChat.save();
    }

    res.status(200).json(updatedChat);
  } catch (error) {
    console.error("Chat remove user error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/groupdelete/:id", authProtector, async (req, res) => {
  const chatId = req.params.id;
  const userId = req.user.id;

  if (!chatId) {
    return res.status(400).send("Chat ID is required");
  }

  try {
    const deletedChat = await chat.findByIdAndDelete(chatId);
    res.status(200).json(deletedChat);
  } catch (error) {
    console.error("Chat delete error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
