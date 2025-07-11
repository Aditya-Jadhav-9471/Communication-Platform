const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  JWT_EXPIRY,
  JWT_REFRESH_EXPIRY,
  SALT_ROUNDS,
} = require("../config/constants");

async function register(req, res, next) {
  try {
    const { name, email, password} = req.body;


    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User is already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "member",
    });


    res.status(201).json({
      message: "User registered successfully",
      user: { id: newUser._id, name: newUser.name, email: newUser.email},
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const accessToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );
    const refreshToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRY }
    );

    res.json({
      accessToken,
      refreshToken,
      user: { id: user._id,name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    next(error);
  }
}

async function refreshToken(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token required" });
  }

  jwt.verify(
    refreshToken,
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    (err, user) => {
      if (err) return res.status(403).json({ error: "Invalid refresh token" });

      const newAccessToken = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );

      res.json({ accessToken: newAccessToken });
    }
  );
}

module.exports = { register, login, refreshToken };
