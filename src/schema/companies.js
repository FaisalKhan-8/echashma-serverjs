const { z } = require("zod");

const CreateCompanySchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  address: z.string().min(1, "Address is required"),
  contactPerson: z.string().min(1, "Contact person is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email format"),
  gst: z.string().optional(),
  userId: z.array(z.string().transform((val) => parseInt(val, 10))).optional(), // Array of user IDs
});

const UpdateCompanySchema = z.object({
  companyId: z
    .string()
    .optional()
    .transform((val) => parseInt(val, 10)),
  companyName: z.string().optional(),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  gst: z.string().optional(),
  userId: z.array(z.string().transform((val) => parseInt(val, 10))).optional(), // Array of user IDs
});

module.exports = { CreateCompanySchema, UpdateCompanySchema };
