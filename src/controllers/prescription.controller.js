const { AppError } = require('../errors/AppError');
const db = require('../utils/db.config');
const { z } = require('zod');

// Define Zod schema for prescription validation based on your Prisma schema
const prescriptionSchema = z.object({
  rightSPH: z.number(),
  rightCYL: z.number(),
  rightAXIS: z.number(),
  rightADD: z.number(),
  leftSPH: z.number(),
  leftCYL: z.number(),
  leftAXIS: z.number(),
  leftADD: z.number(),
  lensType: z.string(),
});

async function createPrescription(req, res, next) {
  try {
    // Validate the request body using the Zod schema
    const parsedData = prescriptionSchema.safeParse(req.body);

    if (!parsedData.success) {
      // If validation fails, return a 400 response with errors
      return res.status(400).json({
        message: 'Validation Error',
        details: parsedData.error.errors,
      });
    }

    const {
      rightSPH,
      rightCYL,
      rightAXIS,
      rightADD,
      leftSPH,
      leftCYL,
      leftAXIS,
      leftADD,
      lensType,
    } = req.body;

    // Check if the lensType already exists in the database (unique constraint check)
    const existingPrescription = await db.prescription.findUnique({
      where: { lensType },
    });

    if (existingPrescription) {
      // If a prescription with the same lensType exists, return a conflict error
      return new AppError(
        'A prescription with this lens type already exists',
        409
      );
    }

    // Proceed with creating the prescription in the database
    const newPrescription = await db.prescription.create({
      data: {
        rightSPH,
        rightCYL,
        rightAXIS,
        rightADD,
        leftSPH,
        leftCYL,
        leftAXIS,
        leftADD,
        lensType,
      },
    });

    // Send a response with the newly created prescription
    res.status(201).json(newPrescription);
  } catch (error) {
    next(new AppError(error.message, 500));
  }
}

module.exports = { createPrescription };
