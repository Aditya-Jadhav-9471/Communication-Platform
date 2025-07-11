const express = require("express");
const router = express.Router();
const {
  register,
  login,
  refreshToken,
} = require("../controllers/auth.controller");
const Joi = require("joi");

const registerSchema = Joi.object({
  name: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(12).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    next();
  };
}

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/token", refreshToken);

module.exports = router;
