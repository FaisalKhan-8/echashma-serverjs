const { z } = require("zod");

const CreateCompaniesSchema = z.object({
  campanyName: z.string().min(1, "Please enter a company name."),
  email: z.string().email(),
  address: z.string().min(1, "Please enter a address."),
  contactPerson: z.string().min(1, "Please enter a contact."),
  phone: z.number("Please enter a phone number."),
  gst: z.string().min(1, "Please enter a gst."),
  pancard: z.string().min(1, "please upload your pancard."),
  aadhaarcard: z.string().min(1, "please upload your Aadhaarcard."),
});

module.exports = { CreateCompaniesSchema };
