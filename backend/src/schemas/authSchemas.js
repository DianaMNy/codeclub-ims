// src/schemas/authSchemas.js
const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
}).strip();

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
}).strip();

// auth.js's POST /reset-password reads { token, newPassword } from req.body —
// matched here rather than { token, password } so the schema actually gates
// what the handler consumes.
const resetPasswordSchema = z.object({
  token: z.string().min(10).max(500),
  newPassword: z.string().min(8).max(128),
}).strip();

module.exports = { loginSchema, forgotPasswordSchema, resetPasswordSchema };
