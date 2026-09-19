const jwt = require("jsonwebtoken");
const User = require("../Components/User/models/User");

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ message: "Authentication required" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id).select("-passwordHash");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        req.user = user;

        next();


    } catch (error) {
        res.status(401).json({ message: "Invalid token" });
    }
};

module.exports = authMiddleware;