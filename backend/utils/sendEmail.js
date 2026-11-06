const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 2525,
  secure: false, // true for 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 15000,
});

// Optional connection test on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('Brevo SMTP Connection Error:', error);
  } else {
    console.log('Brevo SMTP server is ready to take our messages');
  }
});

async function sendVerificationEmail(to, token) {
  const link = `${process.env.BASE_URL}/api/users/verify/${token}`;
  
  await transporter.sendMail({
    from: `"MyCollection" <mister2283@gmail.com>`,
    to,
    subject: 'Verify your email',
    html: `<p>Click to verify your account:</p><p><a href="${link}">${link}</a></p><p>Link expires in 24 hours.</p>`,
  });
}

module.exports = { sendVerificationEmail };
