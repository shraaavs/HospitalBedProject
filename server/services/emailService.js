import nodemailer from 'nodemailer';

// Creates a transporter using configured environment variables or creates an Ethereal test inbox fallback
let transporter = null;

const createTransporter = async () => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port: Number(port) || 587,
      secure: Number(port) === 465,
      auth: { user, pass }
    });
    console.log('[EmailService] Configured custom SMTP transporter for:', user);
  } else {
    // Development fallback using Ethereal or direct console logging
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('[EmailService] Created test Ethereal email transporter for development.');
    } catch (e) {
      console.warn('[EmailService] Using direct console logger fallback:', e.message);
      transporter = {
        sendMail: async (options) => {
          console.log(`\n================ REAL-TIME OTP EMAIL ================`);
          console.log(`To: ${options.to}`);
          console.log(`Subject: ${options.subject}`);
          console.log(`Content: \n${options.text || options.html}`);
          console.log(`=====================================================\n`);
          return { messageId: 'simulated-' + Date.now() };
        }
      };
    }
  }

  return transporter;
};

/**
 * Sends a real-time OTP verification code to a user's email
 */
export const sendOtpEmail = async (email, otpCode, userName = 'User') => {
  const mailTransporter = await createTransporter();

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>MediFlow Security Verification</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 20px; }
      .container { max-width: 520px; margin: 0 auto; background: #1e293b; border-radius: 16px; border: 1px solid #334155; padding: 32px; color: #f8fafc; }
      .header { text-align: center; padding-bottom: 24px; border-bottom: 1px solid #334155; }
      .badge { display: inline-block; background: #3b82f6; color: white; padding: 6px 14px; border-radius: 9999px; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; }
      .title { font-size: 22px; font-weight: 800; color: #ffffff; margin-top: 16px; margin-bottom: 6px; }
      .otp-box { background: #0f172a; border: 2px dashed #6366f1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
      .otp-code { font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #38bdf8; font-family: monospace; }
      .warning { font-size: 13px; color: #94a3b8; line-height: 1.6; }
      .footer { text-align: center; font-size: 12px; color: #64748b; margin-top: 24px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <span class="badge">MediFlow 2-Factor Authentication</span>
        <h1 class="title">Login Verification Code</h1>
        <p style="color: #94a3b8; margin: 0; font-size: 14px;">Real-time authentication request for ${userName}</p>
      </div>
      <p style="color: #cbd5e1; font-size: 15px; margin-top: 20px;">
        Hello <strong>${userName}</strong>,
      </p>
      <p style="color: #cbd5e1; font-size: 14px;">
        A real-time sign-in attempt was detected for your MediFlow Hospital Management Portal account. Use the one-time verification code below to complete your login:
      </p>
      
      <div class="otp-box">
        <div style="font-size: 11px; font-weight: bold; color: #818cf8; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;">Your One-Time Password (OTP)</div>
        <div class="otp-code">${otpCode}</div>
        <div style="font-size: 12px; color: #94a3b8; margin-top: 8px;">Valid for 10 minutes</div>
      </div>

      <div class="warning">
        🔒 <strong>Security Alert:</strong> If you did not initiate this login request, please contact the Hospital Security & IT Desk immediately. Never share this code with anyone.
      </div>

      <div class="footer">
        &copy; ${new Date().getFullYear()} MediFlow Hospital Management System. All rights reserved.
      </div>
    </div>
  </body>
  </html>
  `;

  try {
    const info = await mailTransporter.sendMail({
      from: `"MediFlow Security" <${process.env.SMTP_FROM || 'security@mediflow.internal'}>`,
      to: email,
      subject: `🔐 ${otpCode} is your MediFlow Login Verification Code`,
      text: `Hello ${userName},\n\nYour MediFlow login verification code is: ${otpCode}\n\nThis OTP is valid for 10 minutes. Do not share it with anyone.`,
      html: htmlContent
    });

    let previewUrl = null;
    if (nodemailer.getTestMessageUrl) {
      previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`[EmailService] Preview real-time test email: ${previewUrl}`);
      }
    }

    return {
      success: true,
      messageId: info?.messageId || 'sent',
      previewUrl
    };
  } catch (err) {
    console.error('[EmailService] Failed to send email:', err.message);
    return {
      success: false,
      error: err.message
    };
  }
};
