const { z } = require("zod");

const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  avatar: z.string().optional(),
  role: z.enum(["ADMIN", "SUBADMIN"]).optional(),
});

const LoginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

module.exports = { CreateUserSchema, LoginUserSchema };
