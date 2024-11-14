const { z } = require("zod");

const CreateUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  name: z.string().min(1, "Name is required"),
  avatar: z.string().optional(), // Avatar can be a URL or a path; it's optional
  role: z.enum(["ADMIN", "SUBADMIN"]).optional(), // Defaults to SUBADMIN if not provided
  companyId: z
    .array(z.string().transform((val) => parseInt(val, 10)))
    .optional(), // Array of user IDs
});

const LoginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  name: z.string().min(1).optional(),
  avatar: z.string().url().optional(),
  role: z.enum(["ADMIN", "SUBADMIN"]).optional(),
  companyId: z.number().int().optional(),
});

module.exports = { CreateUserSchema, LoginUserSchema, UpdateUserSchema };
