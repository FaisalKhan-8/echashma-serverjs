const { z } = require("zod");

const CreateCompanySchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  address: z.string().min(1, "Address is required"),
  contactPerson: z.string().min(1, "Contact person is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email format"),
  gst: z.string().optional(),
  userId: z
    .string()
    .optional()
    .transform((val) => parseInt(val, 10)), // Coerce string to number if provided
});

module.exports = { CreateCompanySchema };
