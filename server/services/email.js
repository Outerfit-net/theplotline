/**
 * Email service using nodemailer
 */

const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || SMTP_USER;
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

// Create transporter
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!SMTP_USER || !SMTP_PASS) {
    console.warn('SMTP credentials not configured - emails will be logged only');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });

  return transporter;
}

/**
 * Send confirmation email to new subscriber
 * @param {string} email
 * @param {string} confirmToken
 */
async function sendConfirmationEmail(email, confirmToken) {
  const confirmUrl = `${BASE_URL}/api/confirm/${confirmToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Georgia, serif; background: #faf8f5; padding: 40px; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
        h1 { color: #2d4a3e; font-size: 24px; }
        p { color: #4a4a4a; line-height: 1.6; }
        .button { display: inline-block; background: #4a7c59; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .footer { margin-top: 40px; font-size: 12px; color: #888; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Welcome to Plot Lines</h1>
        <p>Thanks for subscribing to our daily garden conversations!</p>
        <p>Please confirm your email address to start receiving your personalized garden dialogs:</p>
        <a href="${confirmUrl}" class="button">Confirm Subscription</a>
        <p>Or copy this link: ${confirmUrl}</p>
        <div class="footer">
          <p>If you didn't sign up for Plot Lines, you can ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Welcome to Plot Lines!

Thanks for subscribing to our daily garden conversations.

Please confirm your email by visiting:
${confirmUrl}

If you didn't sign up for Plot Lines, you can ignore this email.
  `;

  return sendEmail({
    to: email,
    subject: 'Confirm your Plot Lines subscription',
    html,
    text
  });
}

/**
 * Send daily garden conversation email
 * @param {string} email
 * @param {object} dailyRun
 * @param {string} unsubscribeToken
 */
async function sendDailyEmail(email, dailyRun, unsubscribeToken) {
  const unsubscribeUrl = `${BASE_URL}/api/unsubscribe?token=${unsubscribeToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Georgia, serif; background: #faf8f5; padding: 40px; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
        h1 { color: #2d4a3e; font-size: 24px; margin-bottom: 8px; }
        .meta { color: #6b8068; font-size: 14px; margin-bottom: 24px; }
        .topic { color: #4a7c59; font-style: italic; margin-bottom: 16px; }
        .prose { color: #333; line-height: 1.8; }
        .prose p { margin-bottom: 16px; }
        .quote { border-left: 3px solid #4a7c59; padding-left: 16px; color: #666; font-style: italic; margin: 24px 0; }
        .weather { background: #f5f3f0; padding: 12px; border-radius: 4px; font-size: 14px; color: #666; margin-bottom: 24px; }
        .footer { margin-top: 40px; font-size: 12px; color: #888; text-align: center; }
        .footer a { color: #4a7c59; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Garden Conversation</h1>
        <div class="meta">${dailyRun.run_date} | ${dailyRun.author_name || 'Hemingway'} style</div>
        <div class="weather">${dailyRun.weather_summary || ''}</div>
        <div class="topic">Today: ${dailyRun.topic || 'A moment in the garden'}</div>
        <div class="prose">
          ${dailyRun.prose_html || '<p>The garden waits.</p>'}
        </div>
        <div class="quote">${dailyRun.quote || ''}</div>
        <div class="footer">
          <p>Characters: ${dailyRun.characters || 'The usual suspects'}</p>
          <p><a href="${unsubscribeUrl}">Unsubscribe</a> from Plot Lines</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Garden Conversation - ${dailyRun.run_date}
Style: ${dailyRun.author_name || 'Hemingway'}

${dailyRun.weather_summary || ''}

Today: ${dailyRun.topic || 'A moment in the garden'}

${dailyRun.prose_text || 'The garden waits.'}

"${dailyRun.quote || ''}"

Characters: ${dailyRun.characters || 'The usual suspects'}

Unsubscribe: ${unsubscribeUrl}
  `;

  return sendEmail({
    to: email,
    subject: `Garden Conversation - ${dailyRun.run_date}`,
    html,
    text
  });
}

/**
 * Send raw email
 * @param {object} options
 */
async function sendEmail({ to, subject, html, text }) {
  const trans = getTransporter();

  const mailOptions = {
    from: EMAIL_FROM,
    to,
    subject,
    html,
    text
  };

  if (!trans) {
    console.log('[EMAIL MOCK] Would send:', { to, subject });
    console.log('[EMAIL MOCK] Text:', text);
    return { messageId: 'mock-' + Date.now() };
  }

  const info = await trans.sendMail(mailOptions);
  console.log(`[EMAIL] Sent to ${to}: ${info.messageId}`);
  return info;
}

module.exports = {
  sendConfirmationEmail,
  sendDailyEmail,
  sendEmail
};
