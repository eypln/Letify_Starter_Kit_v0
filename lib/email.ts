import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  // Email provider configuration
  const smtpPort = parseInt(process.env.SMTP_PORT || '587')
  const isSecure = smtpPort === 465 // Use SSL for port 465
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: smtpPort,
    secure: isSecure, // true for 465 (SSL), false for 587 (TLS)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false, // Allow self-signed certificates
    },
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
    });

    console.log('Email sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}

interface ViewingNotificationData {
  ref_no: string;
  city: string;
  viewing_date: string;
  viewing_time: string;
  client_name: string;
  client_mobile_no: string;
  result: string;
  comments?: string;
  agentName: string;
  agentEmail: string;
}

export function generateViewingNotificationEmail(data: ViewingNotificationData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9f9f9;
        }
        .header {
          background-color: #9333ea;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: white;
          padding: 30px;
          border-radius: 0 0 8px 8px;
        }
        .info-row {
          display: flex;
          margin-bottom: 15px;
          padding-bottom: 15px;
          border-bottom: 1px solid #eee;
        }
        .info-label {
          font-weight: bold;
          width: 180px;
          color: #666;
        }
        .info-value {
          flex: 1;
          color: #333;
        }
        .footer {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 2px solid #9333ea;
          color: #666;
          font-size: 12px;
        }
        .result-badge {
          display: inline-block;
          padding: 5px 15px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 14px;
        }
        .result-deal {
          background-color: #dcfce7;
          color: #166534;
        }
        .result-no-deal {
          background-color: #fee2e2;
          color: #991b1b;
        }
        .result-negotiating {
          background-color: #dbeafe;
          color: #1e40af;
        }
        .result-scheduled {
          background-color: #fef3c7;
          color: #92400e;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">🏠 New Viewing Notification</h1>
        </div>
        <div class="content">
          <p style="font-size: 16px; margin-bottom: 25px;">
            Hello Team Leader,<br><br>
            A new viewing has been recorded by <strong>${data.agentName}</strong> (${data.agentEmail}). Please find the details below:
          </p>

          <div class="info-row">
            <div class="info-label">Ref No:</div>
            <div class="info-value"><strong>${data.ref_no}</strong></div>
          </div>

          <div class="info-row">
            <div class="info-label">City:</div>
            <div class="info-value">${data.city}</div>
          </div>

          <div class="info-row">
            <div class="info-label">Viewing Date:</div>
            <div class="info-value">${new Date(data.viewing_date).toLocaleDateString('en-GB')}</div>
          </div>

          <div class="info-row">
            <div class="info-label">Viewing Time:</div>
            <div class="info-value">${data.viewing_time}</div>
          </div>

          <div class="info-row">
            <div class="info-label">Client Name:</div>
            <div class="info-value">${data.client_name}</div>
          </div>

          <div class="info-row">
            <div class="info-label">Client Mobile:</div>
            <div class="info-value">${data.client_mobile_no}</div>
          </div>

          <div class="info-row">
            <div class="info-label">Result:</div>
            <div class="info-value">
              <span class="result-badge result-${data.result.toLowerCase().replace(' ', '-')}">
                ${data.result}
              </span>
            </div>
          </div>

          ${data.comments ? `
          <div class="info-row">
            <div class="info-label">Comments:</div>
            <div class="info-value">${data.comments}</div>
          </div>
          ` : ''}

          <div class="footer">
            <p>This is an automated notification from Letify System.</p>
            <p>Recorded on: ${new Date().toLocaleString('en-GB')}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Admin Approval Notification Email
interface AdminApprovalData {
  fullName: string;
  email: string;
  phone: string;
  registrationTime: string;
}

export function generateAdminApprovalEmail(data: AdminApprovalData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9f9f9;
        }
        .header {
          background-color: #DC2626;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: white;
          padding: 30px;
          border-radius: 0 0 8px 8px;
        }
        .info-row {
          display: flex;
          margin-bottom: 15px;
          padding-bottom: 15px;
          border-bottom: 1px solid #eee;
        }
        .info-label {
          font-weight: bold;
          width: 180px;
          color: #666;
        }
        .info-value {
          flex: 1;
          color: #333;
        }
        .footer {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 2px solid #DC2626;
          color: #666;
          font-size: 12px;
        }
        .action-link {
          display: inline-block;
          margin-top: 20px;
          padding: 12px 30px;
          background-color: #DC2626;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
        }
        .action-link:hover {
          background-color: #B91C1C;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>New User Approval Required</h2>
        </div>
        <div class="content">
          <p>A new user has registered and requires admin approval to access the platform.</p>

          <div class="info-row">
            <div class="info-label">Full Name:</div>
            <div class="info-value"><strong>${data.fullName}</strong></div>
          </div>

          <div class="info-row">
            <div class="info-label">Email:</div>
            <div class="info-value">${data.email}</div>
          </div>

          <div class="info-row">
            <div class="info-label">Phone:</div>
            <div class="info-value">${data.phone}</div>
          </div>

          <div class="info-row">
            <div class="info-label">Registration Time:</div>
            <div class="info-value">${new Date(data.registrationTime).toLocaleString('en-GB')}</div>
          </div>

          <a href="${process.env.NEXT_PUBLIC_WEBAPP_URL}/admin" class="action-link">
            Review & Approve User
          </a>

          <div class="footer">
            <p>This is an automated notification from Letify System.</p>
            <p>Please log in to the admin panel to review and approve this user.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// User Approval Success Email
interface UserApprovalSuccessData {
  fullName: string;
  email: string;
}

export function generateUserApprovalEmail(data: UserApprovalSuccessData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9f9f9;
        }
        .header {
          background-color: #16a34a;
          color: white;
          padding: 30px 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: white;
          padding: 40px 30px;
          border-radius: 0 0 8px 8px;
        }
        .success-icon {
          font-size: 48px;
          margin-bottom: 10px;
        }
        .action-button {
          display: inline-block;
          margin-top: 25px;
          padding: 15px 40px;
          background-color: #9333ea;
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: bold;
          font-size: 16px;
        }
        .action-button:hover {
          background-color: #7e22ce;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
          color: #666;
          font-size: 13px;
          text-align: center;
        }
        .welcome-text {
          font-size: 18px;
          color: #16a34a;
          font-weight: bold;
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="success-icon">✅</div>
          <h1 style="margin: 0; font-size: 28px;">Account Approved!</h1>
        </div>
        <div class="content">
          <p class="welcome-text">Welcome to Letify, ${data.fullName}!</p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            Great news! Your account has been <strong>approved</strong>. 
            You can now start using all features of Letify.
          </p>

          <p style="font-size: 16px; margin-bottom: 25px;">
            🎉 You now have access to:
          </p>

          <ul style="font-size: 15px; line-height: 2; color: #555;">
            <li>📋 Create and manage property listings</li>
            <li>👥 Track and manage your clients</li>
            <li>📊 View analytics and insights</li>
            <li>📅 Schedule and record viewings</li>
            <li>💰 Monitor your revenue</li>
          </ul>

          <div style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_WEBAPP_URL}/sign-in" class="action-button">
              🚀 Start Using Letify
            </a>
          </div>

          <div class="footer">
            <p><strong>Need help getting started?</strong></p>
            <p>Visit our dashboard to explore all features, or contact our support team if you have any questions.</p>
            <p style="margin-top: 20px; color: #999;">
              This is an automated email from Letify. Please do not reply to this email.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Email Verified Notification
interface EmailVerifiedData {
  fullName: string;
  email: string;
}

export function generateEmailVerifiedEmail(data: EmailVerifiedData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9f9f9;
        }
        .header {
          background-color: #3b82f6;
          color: white;
          padding: 30px 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: white;
          padding: 40px 30px;
          border-radius: 0 0 8px 8px;
        }
        .success-icon {
          font-size: 48px;
          margin-bottom: 10px;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
          color: #666;
          font-size: 13px;
          text-align: center;
        }
        .info-box {
          background-color: #eff6ff;
          border-left: 4px solid #3b82f6;
          padding: 20px;
          margin: 25px 0;
          border-radius: 4px;
        }
        .pending-text {
          font-size: 18px;
          color: #f59e0b;
          font-weight: bold;
          margin-bottom: 15px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="success-icon">✉️</div>
          <h1 style="margin: 0; font-size: 28px;">Email Verified!</h1>
        </div>
        <div class="content">
          <p style="font-size: 16px; margin-bottom: 20px;">
            Hello <strong>${data.fullName}</strong>,
          </p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            Great! Your email address has been successfully verified. ✅
          </p>

          <div class="info-box">
            <p class="pending-text">⏳ Waiting for Admin Approval</p>
            <p style="font-size: 15px; margin: 0; line-height: 1.8;">
              Your account is currently pending admin approval. Our team will review your registration and you will receive a confirmation email once your account has been approved.
            </p>
          </div>

          <p style="font-size: 15px; margin-top: 25px; color: #555;">
            <strong>What happens next?</strong>
          </p>

          <ul style="font-size: 14px; line-height: 2; color: #555;">
            <li>✅ Your email has been verified</li>
            <li>⏳ Admin is reviewing your account</li>
            <li>📧 You'll receive an email once approved</li>
            <li>🚀 Then you can start using Letify</li>
          </ul>

          <p style="font-size: 14px; margin-top: 30px; color: #666;">
            This usually takes a few hours. Thank you for your patience!
          </p>

          <div class="footer">
            <p><strong>Questions?</strong></p>
            <p>If you have any questions, please contact our support team.</p>
            <p style="margin-top: 20px; color: #999;">
              This is an automated email from Letify. Please do not reply to this email.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
