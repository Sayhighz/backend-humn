import nodemailer from 'nodemailer';

/**
 * Email Service
 * Handles sending emails for download requests and notifications
 */
export class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  /**
   * Send notification for new download request
   * @param {Object} requestData - Download request data
   * @returns {Promise<boolean>} Success status
   */
  async sendDownloadRequestNotification(requestData) {
    try {
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@humn.app',
        to: process.env.ADMIN_EMAIL || 'admin@humn.app',
        subject: 'New Download Request - HUMN Anthem',
        html: this.generateRequestNotificationHtml(requestData)
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Failed to send download request notification:', error);
      return false;
    }
  }

  /**
   * Send approval notification to requester
   * @param {Object} requestData - Download request data
   * @returns {Promise<boolean>} Success status
   */
  async sendApprovalNotification(requestData) {
    try {
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@humn.app',
        to: requestData.email,
        subject: 'Your Download Request Has Been Approved - HUMN',
        html: this.generateApprovalNotificationHtml(requestData)
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Failed to send approval notification:', error);
      return false;
    }
  }

  /**
   * Send rejection notification to requester
   * @param {Object} requestData - Download request data
   * @param {string} reason - Rejection reason
   * @returns {Promise<boolean>} Success status
   */
  async sendRejectionNotification(requestData, reason) {
    try {
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@humn.app',
        to: requestData.email,
        subject: 'Download Request Update - HUMN',
        html: this.generateRejectionNotificationHtml(requestData, reason)
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Failed to send rejection notification:', error);
      return false;
    }
  }

  /**
   * Generate HTML for download request notification
   * @param {Object} data - Request data
   * @returns {string} HTML content
   */
  generateRequestNotificationHtml(data) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Download Request</h2>
        <p>A new download request has been submitted:</p>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Anthem ID:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.anthem_id}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Email:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.email}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Purpose:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.purpose}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Project Description:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.project_description || 'Not provided'}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Request ID:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.request_id}</td></tr>
        </table>
        <p>Please review and approve/reject this request in the admin panel.</p>
        <p><a href="${process.env.ADMIN_PANEL_URL || 'https://admin.humn.app'}/downloads/${data.request_id}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Request</a></p>
      </div>
    `;
  }

  /**
   * Generate HTML for approval notification
   * @param {Object} data - Request data
   * @returns {string} HTML content
   */
  generateApprovalNotificationHtml(data) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Download Request Approved!</h2>
        <p>Great news! Your download request for HUMN anthem ${data.anthem_id} has been approved.</p>
        <p>You can now download the anthem using the following link (valid for 24 hours):</p>
        <p><a href="${data.download_url}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Download Anthem</a></p>
        <p><strong>License Requirements:</strong></p>
        <ul>
          <li>This work is licensed under Creative Commons Attribution-ShareAlike 4.0 International</li>
          <li>You must attribute HUMN and provide a link to the original work</li>
          <li>If you remix or transform this work, you must share it under the same license</li>
        </ul>
        <p>Thank you for supporting HUMN!</p>
      </div>
    `;
  }

  /**
   * Generate HTML for rejection notification
   * @param {Object} data - Request data
   * @param {string} reason - Rejection reason
   * @returns {string} HTML content
   */
  generateRejectionNotificationHtml(data, reason) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Download Request Update</h2>
        <p>Unfortunately, your download request for HUMN anthem ${data.anthem_id} could not be approved at this time.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>If you have any questions or would like to submit a new request with additional information, please contact us.</p>
        <p>Thank you for your interest in HUMN!</p>
      </div>
    `;
  }
}

// Export singleton instance
export const emailService = new EmailService();