const jwt = require("jsonwebtoken");
const authProtector = async (req, res, next) => {
    const token = req.headers.authorization.split(" ")[1];
    console.log("Got the token", token)
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const decodedToken = jwt.verify(token, process.env.JWT);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error(error);
        return res.status(401).json({ message: "Unauthorized" });
    }
};

module.exports = {
    authProtector
}