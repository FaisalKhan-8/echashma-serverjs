const { z } = require("zod");

const CreateProductSchema = z.object({
  code: z.string().min(1, "Code must be at least 1 character"),
  name: z.string().min(2, "Name must be at least 2 characters long"),
  frameType: z.string().transform((val) => parseInt(val, 10)),
  shapeType: z.string().transform((val) => parseInt(val, 10)),
  visionType: z.string().transform((val) => parseInt(val, 10)),
  coatingType: z.string().transform((val) => parseInt(val, 10)),
  branchIds: z
    .array(z.string().transform((val) => parseInt(val, 10)))
    .optional(),
  supplierIds: z.array(z.string().transform((val) => parseInt(val, 10))),
});

module.exports = { CreateProductSchema };
