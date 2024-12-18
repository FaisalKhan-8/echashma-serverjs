const { AppError } = require('../errors/AppError');
const db = require('../utils/db.config');
const { z } = require('zod');

// Define the Zod schema for Prescription validation
const prescriptionSchema = z.object({
  side: z.enum(['right', 'left'], {
    errorMap: () => ({ message: 'Side must be either "right" or "left"' }),
  }),
  field: z.enum(['SPH', 'CYL', 'AXIS', 'ADD'], {
    errorMap: () => ({
      message: 'Field must be one of "SPH", "CYL", "AXIS", or "ADD"',
    }),
  }),
  value: z
    .number()
    .min(-10, { message: 'Value cannot be less than -10' })
    .max(10, { message: 'Value cannot be greater than 10' })
    .transform((value) => Number(value.toFixed(2))),
});

// Function to create a new prescription
async function createPrescription(req, res, next) {
  const data = req.body;
  console.log('Received prescription data:', data);

  try {
    // Validate the data with Zod
    const validatedData = prescriptionSchema.parse(data);
    console.log('Prescription data is valid.');

    // Round the value before saving it to the database (if needed)
    const roundedValue = Number(validatedData.value.toFixed(2));

    // Check if a prescription with the same side, field, and value already exists
    const existingPrescription = await db.prescription.findUnique({
      where: {
        side_field_value: {
          side: validatedData.side,
          field: validatedData.field,
          value: roundedValue,
        },
      },
    });

    if (existingPrescription) {
      // If a prescription with the same side, field, and value exists, throw a unique constraint error
      throw new AppError('Prescription value already exists.', 400);
    }

    // If no existing prescription, create the new prescription record
    const prescription = await db.prescription.create({
      data: {
        side: validatedData.side,
        field: validatedData.field,
        value: roundedValue, // Save the rounded value
      },
    });

    console.log('Prescription created:', prescription);

    // Return the created prescription as a response
    res.status(201).json({
      message: 'Prescription added successfully',
      prescription,
    });
  } catch (error) {
    console.error('Error during prescription creation:', error);

    if (error instanceof z.ZodError) {
      // Handle validation errors from Zod
      console.error('Validation errors:', error.errors);
      throw next(new AppError(error.errors, 400));
    } else if (error instanceof AppError) {
      // Custom application errors (like unique constraint violation)
      console.error('AppError:', error.message);
      throw next(error);
    } else {
      // Handle unexpected errors (e.g., database errors)
      console.error('Unexpected error:', error);
      throw next(new AppError(error.message || 'Internal server error', 500));
    }
  }
}

async function getAllPrescriptions(req, res, next) {
  try {
    // Fetch all prescriptions from the database
    const prescriptions = await db.prescription.findMany();

    // Check if prescriptions exist
    if (!prescriptions || prescriptions.length === 0) {
      throw next(new AppError('No prescriptions found', 404));
    }

    // Send a response with all prescriptions
    res.status(200).json({
      status: 'success',
      data: prescriptions,
    });
  } catch (error) {
    throw next(new AppError(error.message, 500));
  }
}

module.exports = { createPrescription, getAllPrescriptions };
