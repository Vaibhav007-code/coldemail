const express = require('express');
const nodemailer = require('nodemailer');
const pdfParse = require('pdf-parse');
const multer = require('multer');
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static('public'));
app.use(express.json());

// Load Gmail credentials from environment variables
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;

if (!GMAIL_USER || !GMAIL_PASS) {
  console.error('Error: GMAIL_USER and GMAIL_PASS must be set in .env');
  process.exit(1);
}

// Simple email validation function
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Uploaded file is not a PDF' });
    }

    console.log(`Processing file: ${req.file.originalname}, size: ${req.file.size}`);
    
    const data = await pdfParse(req.file.buffer);
    const emails = [
      ...new Set(
        data.text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []
      )
    ];
    
    res.json({ emails });
  } catch (error) {
    console.error('File processing error:', error);
    res.status(500).json({ error: `Failed to process file: ${error.message}` });
  }
});

app.post('/send', async (req, res) => {
  try {
    let { subject, body, email } = req.body;
    subject = subject?.trim();
    body = body?.trim();
    email = email?.trim();

    if (!subject || !body) {
      return res.status(400).json({ error: 'Subject and body are required' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: GMAIL_USER, pass: GMAIL_PASS }
    });

    const mailOptions = {
      from: `Cold Email Sender <${GMAIL_USER}>`,
      to: email,
      subject,
      text: body,
      html: `<div>${body.replace(/\n/g, '<br>')}</div>`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${email}: ${info.messageId}`);
    res.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Email send error:', error);
    let errorMessage = 'Failed to send email';
    if (error.code === 'EAUTH') {
      errorMessage = 'Authentication failed. Check your Gmail credentials or use an App Password if 2FA is enabled.';
    } else if (error.code === 'EENVELOPE') {
      errorMessage = 'Invalid recipient email address.';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Connection error. Check your network.';
    } else {
      errorMessage = error.message;
    }
    res.status(500).json({ success: false, error: errorMessage });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
