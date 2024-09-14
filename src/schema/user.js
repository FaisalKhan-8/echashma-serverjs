const { z } = require("zod");

const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  avatar: z.string().optional(), // Assuming avatar is an optional field
  role: z.enum(["ADMIN", "SUBADMIN"]).optional(), // Assuming role is optional and defaults to SUBADMIN
});

const LoginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

module.exports = { CreateUserSchema, LoginUserSchema };
