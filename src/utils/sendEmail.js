const nodemailer = require('nodemailer');

/**
 * Sends an email using Nodemailer.
 * @param {Object} options - Options for sending the email.
 * @param {string} options.to - Recipient's email address.
 * @param {string} options.subject - Subject of the email.
 * @param {string} options.html - HTML content of the email.
 */
const sendEmail = async ({ to, subject, html }) => {
  // Create a transporter object using SMTP transport with hardcoded settings except for auth.
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', // Hardcoded SMTP host
    port: 465, // Hardcoded port (e.g., 587)
    secure: true, // Hardcoded secure flag (false for port 587)
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Set up email options with a hardcoded sender address.
  const mailOptions = {
    from: `"E-chashma Forget Password" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  };

  // Send the email.
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
