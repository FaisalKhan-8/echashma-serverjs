const { z } = require("zod");

const CreateBranchSchema = z.object({
  branchName: z.string().min(1, "Branch name is required"),
  address: z.string().min(1, "Address is required"),
  contactPerson: z.string().optional(),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email format").optional(),
  companyId: z
    .number()
    .int("Company ID must be an integer")
    .positive("Company ID must be positive"),
});

module.exports = { CreateBranchSchema };
