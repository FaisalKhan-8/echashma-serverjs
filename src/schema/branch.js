const { z } = require('zod');

const CreateBranchSchema = z.object({
  branchName: z.string().min(1, 'Branch name is required'),
  address: z.string().min(1, 'Address is required'),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
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
  phone: z.string().optional(),
  email: z.string().optional(),
  userId: z.array(z.string()).optional(),
});

module.exports = { CreateBranchSchema, UpdateBranchSchema };
