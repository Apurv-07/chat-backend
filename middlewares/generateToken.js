const jwt = require("jsonwebtoken");

const generateTokens = (id) => {
  const accessToken = jwt.sign({ id }, process.env.JWT, { expiresIn: "15m" });
  const refreshToken = jwt.sign({ id }, process.env.REFRESH_JWT, { expiresIn: "7d" });

  return { accessToken, refreshToken };
};

module.exports = generateTokens;
