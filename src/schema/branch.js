const { z } = require('zod');

function isOptionalEmail(value) {
  if (value == null) return true;
  const email = String(value).trim();
  if (!email) return true;
  if (email.length > 254 || email.includes('..')) return false;
  return /^[^\s@]+@(?:[^\s@.]+\.)+[^\s@.]{2,}$/.test(email);
}

const CreateBranchSchema = z.object({
  branchName: z.string().min(1, 'Branch name is required'),
  address: z.string().min(1, 'Address is required'),
  contactPerson: z.string().optional(),
  phone: z
    .string()
    .optional()
    .refine(
      (value) => !value || /^\d{10}$/.test(value),
      'Enter a 10-digit phone number'
    ),
  email: z
    .string()
    .optional()
    .refine(isOptionalEmail, 'Enter a valid email address'),
  companyId: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)), // Ensure parsing only if val is present
  userIds: z.array(z.string().transform((val) => parseInt(val, 10))).optional(), // Changed userId to userIds
});

const UpdateBranchSchema = z.object({
  branchName: z.string().optional(),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z
    .string()
    .optional()
    .refine(
      (value) => !value || /^\d{10}$/.test(value),
      'Enter a 10-digit phone number'
    ),
  email: z
    .string()
    .optional()
    .refine(isOptionalEmail, 'Enter a valid email address'),
  userId: z.array(z.string()).optional(),
});

module.exports = { CreateBranchSchema, UpdateBranchSchema };
