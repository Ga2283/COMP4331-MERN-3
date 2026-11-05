const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password, not the normal password
  },
  connectionTimeout: 10000, // fail fast instead of hanging ~2 min
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

async function sendVerificationEmail(to, token) {
  const link = `${process.env.BASE_URL}/api/users/verify/${token}`;
  await transporter.sendMail({
    from: `"Collector" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Verify your email',
    html: `<p>Click to verify your account:</p><p><a href="${link}">${link}</a></p><p>Link expires in 24 hours.</p>`,
  });
}

module.exports = { sendVerificationEmail };
