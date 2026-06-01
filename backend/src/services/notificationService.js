const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    this.emailTransporter = config.smtp.user ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    }) : null;
  }

  async sendEmail({ to, subject, html }) {
    if (!this.emailTransporter) {
      logger.warn('Email not configured. Skipping email notification.');
      return;
    }
    try {
      await this.emailTransporter.sendMail({ from: config.smtp.user, to, subject, html });
      logger.info(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      logger.error('Email send error:', error);
    }
  }

  async sendVisitorNotification(visitor, resident) {
    if (resident?.preferences?.notifications?.email) {
      await this.sendEmail({
        to: resident.email,
        subject: `Visitor Alert: ${visitor.name} is at the gate`,
        html: `<h2>Visitor Alert</h2><p><strong>${visitor.name}</strong> is at the main gate.</p>
               <p>Purpose: ${visitor.purpose}</p><p>Vehicle: ${visitor.vehicleNumber || 'N/A'}</p>
               <p>Time: ${new Date().toLocaleString()}</p>`,
      });
    }
  }

  async sendAlertNotification(alert) {
    if (alert.broadcastTo.includes('all') || alert.broadcastTo.includes('admin')) {
      logger.info(`Broadcasting alert: ${alert.title} - ${alert.message}`);
    }
  }

  async sendComplaintUpdate(complaint, resident) {
    if (resident?.preferences?.notifications?.email) {
      await this.sendEmail({
        to: resident.email,
        subject: `Complaint Update: ${complaint.title}`,
        html: `<h2>Complaint Status Updated</h2><p>Your complaint "<strong>${complaint.title}</strong>" is now <strong>${complaint.status}</strong>.</p>`,
      });
    }
  }

  async sendSOSAlert(user, alert) {
    logger.info(`SOS Alert from ${user.name} (${user.flatNumber}, ${user.tower})`);
  }
}

module.exports = new NotificationService();
