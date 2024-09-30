const { z } = require("zod");

const CreateProductSchema = z.object({
  code: z.number().min(1, "Code must be greater than 0"),
  name: z.string().min(2, "Name must be at least 2 characters long"),
  frameType: z.string().min(1, "Frame type is required"),
  shapeType: z.string().min(1, "Shape type is required"),
  visionType: z.string().min(1, "Vision type is required"),
  coatingType: z.string().min(1, "Coating type is required"),
  branchIds: z
    .array(z.string().transform((val) => parseInt(val, 10)))
    .optional(),
});

module.exports = { CreateProductSchema };
