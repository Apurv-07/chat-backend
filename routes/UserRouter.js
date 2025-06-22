const express = require("express");
const router = express.Router();
const user = require("../models/userModel");
// const generateToken = require("../middlewares/generateToken");
const bcrypt = require("bcrypt");
const e = require("express");
const { authProtector } = require("../middlewares/authProtector");
const generateTokens = require("../middlewares/generateToken");

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).send("Please fill all the fields");
  }

  try {
    const existingUser = await user.findOne({ email });
    if (!existingUser) {
      return res.status(400).json({ message: "User does not exist" });
    }

    const passwordMatch = await bcrypt.compare(password, existingUser.password);
    if (!passwordMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const { accessToken, refreshToken } = generateTokens(existingUser._id);

    // Optionally store the refresh token in an HTTP-only cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Use secure in production
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json({
      ...existingUser.toObject(),
      accessToken,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
});

router.post("/register", async (req, res) => {
  console.log("Some error", req.body)
  const { name, email, password, pic } = req.body;

  if (!name || !email || !password || !pic) {
    return res.status(400).send("Please fill all the fields");
  }

  try {
    const existingUser = await user.findOne({ email });
    if (existingUser) {
      return res.status(400).send("User already exists");
    }

    const encryptedPassword = await bcrypt.hash(password, 10);
    const newUser = new user({
      name,
      email,
      password: encryptedPassword,
      pic,
    });

    const createdUser = await newUser.save();
    const { accessToken, refreshToken } = generateTokens(createdUser._id);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      ...createdUser.toObject(),
      accessToken,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
});

router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ message: "No refresh token provided" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_JWT);
    const accessToken = jwt.sign({ id: decoded.id }, process.env.JWT, {
      expiresIn: "15m",
    });
    return res.status(200).json({ accessToken });
  } catch (err) {
    console.error(err);
    return res
      .status(403)
      .json({ message: "Invalid or expired refresh token" });
  }
});

router.get("/searchUser", authProtector, async (req, res) => {
  const { search } = req.query;
  if (!search) {
    return res.status(400).send("Please enter something to search");
  }
  try {
    // const existingUser = await user.findOne({ email });
    const existingUser = await user
      .find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      })
      .select("-password");
    if (!existingUser) {
      return res.status(400).json({ message: "User does not exist" });
    }
    return res.status(200).json(existingUser);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
