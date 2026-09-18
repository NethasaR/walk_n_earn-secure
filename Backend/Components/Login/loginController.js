const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../User/models/User");

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Invalid input"
      });
    }
    
    const normalizedEmail = email.trim().toLowerCase();

    //Check if user exists
    const user = await User.findOne({
      email: normalizedEmail
    });

if (!user) {
  return res.status(401).json({
    message: "Invalid email or password"
  });
}

const isMatch = await bcrypt.compare(
  password,
  user.passwordHash
);

if (!isMatch) {
  return res.status(401).json({
    message: "Invalid email or password"
  });
}
    //Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    //Send response with token
    res.json({
      message: "User logged in successfully",
      token,
    });
  } catch (error) {
    console.error("Login error:", error.message);
  
    return res.status(500).json({
      message: "Server error"
    });
  }
};
