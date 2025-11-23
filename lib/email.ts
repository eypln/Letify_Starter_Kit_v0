import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  // Email provider configuration
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
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
