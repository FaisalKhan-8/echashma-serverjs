const { z } = require('zod');

const CreateProductSchema = z.object({
  code: z.string().min(1, 'Code must be at least 1 character'),
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  branchIds: z
    .array(z.string().transform((val) => parseInt(val, 10)))
    .optional(),
});

const UpdateProductSchema = z.object({
  code: z.string().min(1, 'Code must be at least 1 character').optional(),
  name: z.string().min(2, 'Name must be at least 2 characters long').optional(),
  branchIds: z
    .array(z.string().transform((val) => parseInt(val, 10)))
    .optional(),
});

module.exports = { CreateProductSchema, UpdateProductSchema };
