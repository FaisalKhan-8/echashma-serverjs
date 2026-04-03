const { z } = require("zod");

const MembershipSchema = z.enum([
  "TRIAL",
  "TRIAL_EXPIRED",
  "EXPIRED",
  "ACTIVE",
]);

const optionalMembershipDate = z.coerce.date().optional();

const RegisterCompanySchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  email: z.string().email("Invalid email format"),
  phone: z.string().min(1, "Phone number is required"),
  contactPerson: z.string().min(1, "Contact person is required"),
  password: z.string().min(1, "Password is required"),
  address: z.string().optional(),
  gst: z.string().optional(),
}).strict();

const CreateCompanySchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  address: z.string().min(1, "Address is required"),
  contactPerson: z.string().min(1, "Contact person is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email format"),
  gst: z.string().optional(),
  membership: MembershipSchema.optional().default("TRIAL"),
  membershipStartDate: optionalMembershipDate,
  membershipEndDate: optionalMembershipDate,
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
  membership: MembershipSchema.optional(),
  membershipStartDate: optionalMembershipDate,
  membershipEndDate: optionalMembershipDate,
  userId: z.array(z.string().transform((val) => parseInt(val, 10))).optional(), // Array of user IDs
});

module.exports = {
  CreateCompanySchema,
  UpdateCompanySchema,
  RegisterCompanySchema,
  MembershipSchema,
};
