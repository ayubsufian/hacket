// =============================================================================
// HackET — Email Service
// Decoupled SMTP email delivery using Nodemailer.
// Handles Verification, Password Reset, and generic alerts.
// =============================================================================

const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // 2026 Enterprise Standard: Brevo (Sendinblue) Transactional SMTP
    // Unified across the platform for Password Reset, Verification, and Staff Invitations
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    this.fromAddress = process.env.SMTP_FROM || '"HackET Platform" <no-reply@hacket.et>';
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  }

  /**
   * Send Email Verification Link
   */
  async sendVerificationEmail(to, token, firstName = '', role = 'PARTICIPANT') {
    const verifyUrl = `${this.frontendUrl}/verify-email?token=${token}`;
    const isOrganizer = role === 'ORGANIZER';
    const welcomeMessage = isOrganizer
      ? 'Welcome to HackET! Please confirm your email address so we can continue reviewing your organizer account and organization details.'
      : 'Welcome to HackET! Please confirm your email address to activate your account and start participating in hackathons.';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #0f172a; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">Hack<span style="color: #10b981;">ET</span></h1>
        </div>
        <div style="padding: 32px; background-color: #ffffff; color: #334155;">
          <h2 style="margin-top: 0; color: #0f172a;">Verify your email address</h2>
          <p>Hi ${firstName || 'Developer'},</p>
          <p>${welcomeMessage}</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${verifyUrl}" style="background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Verify Email</a>
          </div>
          <p style="font-size: 14px; color: #64748b;">This link will expire in 24 hours.</p>
          <p style="font-size: 14px; color: #64748b; margin-top: 24px; padding-top: 24px; border-top: 1px solid #eee;">
            If you didn't create an account, you can safely ignore this email.
          </p>
        </div>
      </div>
    `;

    try {
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        const info = await this.transporter.sendMail({
          from: this.fromAddress,
          to,
          subject: 'Welcome to HackET - Please verify your email',
          html,
        });
        console.log(`[EmailService] Verification email sent to ${to}. MessageId: ${info.messageId}`);
      } else {
        console.log(`[EmailService - MOCK MODE] Verification email generated for ${to}. URL: ${verifyUrl}`);
      }
    } catch (error) {
      console.error(`[EmailService] Failed to send verification email to ${to}:`, error.message);
      // We don't throw here to avoid failing the main request. The user can request a resend.
    }
  }

  /**
   * Send Password Reset Link
   */
  async sendPasswordResetEmail(to, token, firstName = '') {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #0f172a; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">Hack<span style="color: #10b981;">ET</span></h1>
        </div>
        <div style="padding: 32px; background-color: #ffffff; color: #334155;">
          <h2 style="margin-top: 0; color: #0f172a;">Password Reset Request</h2>
          <p>Hi ${firstName || 'Developer'},</p>
          <p>We received a request to reset the password for your HackET account. Click the button below to choose a new password.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Reset Password</a>
          </div>
          <p style="font-size: 14px; color: #64748b;">This link will expire in 1 hour.</p>
          <p style="font-size: 14px; color: #64748b; margin-top: 24px; padding-top: 24px; border-top: 1px solid #eee;">
            If you didn't request a password reset, your account is safe and you can ignore this email.
          </p>
        </div>
      </div>
    `;

    try {
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        const info = await this.transporter.sendMail({
          from: this.fromAddress,
          to,
          subject: 'HackET - Password Reset',
          html,
        });
        console.log(`[EmailService] Password reset email sent to ${to}. MessageId: ${info.messageId}`);
      } else {
        console.log(`[EmailService - MOCK MODE] Password reset email generated for ${to}. URL: ${resetUrl}`);
      }
    } catch (error) {
      console.error(`[EmailService] Failed to send password reset email to ${to}:`, error.message);
    }
  }
  /**
   * Send Staff Invitation Link
   */
  async sendStaffInvitationEmail(to, token, hackathonTitle, staffRole) {
    const roleTitle = staffRole.charAt(0).toUpperCase() + staffRole.slice(1).toLowerCase();
    const acceptUrl = `${this.frontendUrl}/staff/accept-invitation?token=${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #0f172a; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">Hack<span style="color: #10b981;">ET</span></h1>
        </div>
        <div style="padding: 32px; background-color: #ffffff; color: #334155;">
          <h2 style="margin-top: 0; color: #0f172a;">You've been invited!</h2>
          <p>Hi there,</p>
          <p>You have been officially invited to participate as a <strong>${roleTitle}</strong> for the upcoming hackathon: <strong>${hackathonTitle}</strong>.</p>
          <p>Click the button below to accept your invitation and access your personalized dashboard.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${acceptUrl}" style="background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Accept Invitation</a>
          </div>
          <p style="font-size: 14px; color: #64748b;">This invitation link will expire in 7 days.</p>
          <p style="font-size: 14px; color: #64748b; margin-top: 24px; padding-top: 24px; border-top: 1px solid #eee;">
            If you do not wish to participate, you can safely ignore this email.
          </p>
        </div>
      </div>
    `;

    try {
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        const info = await this.transporter.sendMail({
          from: this.fromAddress,
          to,
          subject: `HackET - Invitation to be a ${roleTitle}`,
          html,
        });
        console.log(`[EmailService] Staff invitation email sent to ${to}. MessageId: ${info.messageId}`);
      } else {
        console.log(`[EmailService - MOCK MODE] Staff invitation email generated for ${to}. URL: ${acceptUrl}`);
      }
    } catch (error) {
      console.error(`[EmailService] Failed to send staff invitation email to ${to}:`, error.message);
    }
  }

  /**
   * Send Staff Role Change Notification
   */
  async sendStaffRoleChangedEmail(to, firstName, hackathonTitle, oldRole, newRole) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #0f172a; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">Hack<span style="color: #10b981;">ET</span></h1>
        </div>
        <div style="padding: 32px; background-color: #ffffff; color: #334155;">
          <h2 style="margin-top: 0; color: #0f172a;">Your Role Has Been Updated</h2>
          <p>Hi ${firstName || 'Team Member'},</p>
          <p>Your staff role for <strong>${hackathonTitle}</strong> has been changed:</p>
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="margin: 4px 0;"><strong>Previous Role:</strong> ${oldRole}</p>
            <p style="margin: 4px 0;"><strong>New Role:</strong> ${newRole}</p>
          </div>
          <p>Your dashboard has been automatically updated to reflect your new responsibilities.</p>
          <p style="font-size: 14px; color: #64748b; margin-top: 24px; padding-top: 24px; border-top: 1px solid #eee;">
            If you believe this change was made in error, please contact the event organizer immediately.
          </p>
        </div>
      </div>
    `;

    try {
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        const info = await this.transporter.sendMail({
          from: this.fromAddress,
          to,
          subject: `HackET - Your role for ${hackathonTitle} has been updated`,
          html,
        });
        console.log(`[EmailService] Staff role change email sent to ${to}. MessageId: ${info.messageId}`);
      } else {
        console.log(`[EmailService - MOCK MODE] Staff role change email generated for ${to}.`);
      }
    } catch (error) {
      console.error(`[EmailService] Failed to send staff role change email to ${to}:`, error.message);
    }
  }

  /**
   * Send Staff Access Revoked Notification
   */
  async sendStaffAccessRevokedEmail(to, firstName, hackathonTitle, role) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #0f172a; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">Hack<span style="color: #10b981;">ET</span></h1>
        </div>
        <div style="padding: 32px; background-color: #ffffff; color: #334155;">
          <h2 style="margin-top: 0; color: #0f172a;">Staff Access Revoked</h2>
          <p>Hi ${firstName || 'Team Member'},</p>
          <p>Your <strong>${role}</strong> access for <strong>${hackathonTitle}</strong> has been revoked by the event organizer.</p>
          <p>You will no longer have access to the staff dashboard for this event.</p>
          <p style="font-size: 14px; color: #64748b; margin-top: 24px; padding-top: 24px; border-top: 1px solid #eee;">
            If you believe this was a mistake, please reach out to the event organizer directly.
          </p>
        </div>
      </div>
    `;

    try {
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        const info = await this.transporter.sendMail({
          from: this.fromAddress,
          to,
          subject: `HackET - Your ${role} access has been revoked`,
          html,
        });
        console.log(`[EmailService] Staff access revoked email sent to ${to}. MessageId: ${info.messageId}`);
      } else {
        console.log(`[EmailService - MOCK MODE] Staff access revoked email generated for ${to}.`);
      }
    } catch (error) {
      console.error(`[EmailService] Failed to send staff access revoked email to ${to}:`, error.message);
    }
  }

  /**
   * Send Account Suspension Notification
   */
  async sendAccountSuspendedEmail(to, reason) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #0f172a; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">Hack<span style="color: #10b981;">ET</span></h1>
        </div>
        <div style="padding: 32px; background-color: #ffffff; color: #334155;">
          <h2 style="margin-top: 0; color: #dc2626;">Account Suspended</h2>
          <p>Your HackET account has been suspended by a platform administrator.</p>
          ${reason ? `<div style="background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px; padding: 12px 16px; margin: 24px 0;"><strong>Reason:</strong> ${reason}</div>` : ''}
          <p>If you believe this was a mistake, please contact our support team immediately.</p>
          <p style="font-size: 14px; color: #64748b; margin-top: 24px; padding-top: 24px; border-top: 1px solid #eee;">
            HackET Support — support@hacket.et
          </p>
        </div>
      </div>
    `;

    try {
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        const info = await this.transporter.sendMail({
          from: this.fromAddress,
          to,
          subject: 'HackET - Your account has been suspended',
          html,
        });
        console.log(`[EmailService] Account suspension email sent to ${to}. MessageId: ${info.messageId}`);
      } else {
        console.log(`[EmailService - MOCK MODE] Account suspension email generated for ${to}.`);
      }
    } catch (error) {
      console.error(`[EmailService] Failed to send account suspension email to ${to}:`, error.message);
    }
  }

  /**
   * Send Admin Provisioned Welcome Email
   */
  async sendAdminProvisionedEmail(to, firstName, provisionedBy) {
    const loginUrl = `${this.frontendUrl}/login`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #0f172a; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">Hack<span style="color: #10b981;">ET</span></h1>
        </div>
        <div style="padding: 32px; background-color: #ffffff; color: #334155;">
          <h2 style="margin-top: 0; color: #0f172a;">Welcome, Administrator</h2>
          <p>Hi ${firstName},</p>
          <p>You have been provisioned as a <strong>Platform Administrator</strong> on HackET by <strong>${provisionedBy}</strong>.</p>
          <p>As an administrator, you have access to:</p>
          <ul>
            <li>Audit log monitoring and export</li>
            <li>User account suspension and reactivation</li>
            <li>Organizer verification approvals</li>
            <li>Event archiving</li>
            <li>Global override on all event operations</li>
          </ul>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${loginUrl}" style="background-color: #10b981; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Log In to Admin Dashboard</a>
          </div>
          <p style="font-size: 14px; color: #64748b; margin-top: 24px; padding-top: 24px; border-top: 1px solid #eee;">
            For security, please change your password immediately after your first login.
          </p>
        </div>
      </div>
    `;

    try {
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        const info = await this.transporter.sendMail({
          from: this.fromAddress,
          to,
          subject: 'HackET - You have been provisioned as an Administrator',
          html,
        });
        console.log(`[EmailService] Admin provisioned email sent to ${to}. MessageId: ${info.messageId}`);
      } else {
        console.log(`[EmailService - MOCK MODE] Admin provisioned email generated for ${to}.`);
      }
    } catch (error) {
      console.error(`[EmailService] Failed to send admin provisioned email to ${to}:`, error.message);
    }
  }
}

const emailService = new EmailService();

// Register background event listeners
const eventBus = require('../../utils/eventBus');

eventBus.on('email:verification_requested', async ({ email, token, firstName, role }) => {
  await emailService.sendVerificationEmail(email, token, firstName, role);
});

eventBus.on('email:password_reset_requested', async ({ email, token, firstName }) => {
  await emailService.sendPasswordResetEmail(email, token, firstName);
});

eventBus.on('email:staff_invitation', async ({ email, token, hackathonTitle, staffRole }) => {
  await emailService.sendStaffInvitationEmail(email, token, hackathonTitle, staffRole);
});

eventBus.on('email:staff_role_changed', async ({ email, firstName, hackathonTitle, oldRole, newRole }) => {
  await emailService.sendStaffRoleChangedEmail(email, firstName, hackathonTitle, oldRole, newRole);
});

eventBus.on('email:staff_access_revoked', async ({ email, firstName, hackathonTitle, role }) => {
  await emailService.sendStaffAccessRevokedEmail(email, firstName, hackathonTitle, role);
});

eventBus.on('email:account_suspended', async ({ email, reason }) => {
  await emailService.sendAccountSuspendedEmail(email, reason);
});

eventBus.on('email:admin_provisioned', async ({ email, firstName, provisionedBy }) => {
  await emailService.sendAdminProvisionedEmail(email, firstName, provisionedBy);
});

module.exports = emailService;
