const RentConfig = require('../models/RentConfig');
const RentInvoice = require('../models/RentInvoice');
const Payment = require('../models/Payment');
const Alert = require('../models/Alert');
const UserNotification = require('../models/UserNotification');
const logger = require('../utils/logger');
const { notifyUser } = require('./notificationHelper');

async function generateMonthlyInvoices() {
  try {
    const configs = await RentConfig.find({ is_active: true }, { populate: true });
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const periodMonth = `${year}-${month}`;

    for (const config of configs) {
      const existing = await RentInvoice.findOne({ configId: config._id, periodMonth });
      if (existing) continue;

      const dueDate = new Date(year, now.getMonth(), config.due_day);
      if (dueDate < now) dueDate.setMonth(dueDate.getMonth() + 1);

      const invoice = await RentInvoice.create({
        configId: config._id,
        residentId: config.user_id,
        amount: config.monthly_rent,
        lateFee: config.late_fee,
        dueDate: dueDate.toISOString().split('T')[0],
        periodMonth,
        status: 'pending',
      });

      try {
        const alert = await Alert.create({
          userId: config.user_id,
          type: 'general',
          title: 'Monthly Rent Generated',
          message: `Amount: ₹${config.monthly_rent}, Due Date: ${dueDate.toLocaleDateString()}. Please pay before due date.`,
          severity: 'info',
        });
        await UserNotification.create({
          userId: config.user_id,
          alertId: alert._id,
          read: false,
          deleted: false,
        });
        await notifyUser(_io, config.user_id, { type: 'rent_generated', title: 'Monthly Rent Generated', body: `Amount: ₹${config.monthly_rent}, Due Date: ${dueDate.toLocaleDateString()}.`, data: { severity: 'info', invoiceId: invoice._id?.toString() } });
      } catch (e) { logger.warn('Rent notification error:', e.message); }

      logger.info(`Rent invoice generated: ${periodMonth} for config ${config._id}, amount ${config.monthly_rent}`);
    }
  } catch (error) {
    logger.error('Generate monthly invoices error:', error);
  }
}

async function sendReminders() {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const invoices = await RentInvoice.find({ status: 'pending' }, { populate: true });
    const payments = await Payment.find({ status: 'pending', type: 'house_rent' });

    const allItems = [
      ...invoices.map((inv) => ({
        _id: inv._id,
        residentId: inv.residentId,
        amount: inv.amount,
        dueDate: inv.dueDate,
        type: 'invoice',
        sentReminderDay2: inv.sentReminderDay2,
        sentReminderDay3: inv.sentReminderDay3,
        sentReminderDay4: inv.sentReminderDay4,
        sentReminderDaily: inv.sentReminderDaily,
        sentOverdue: inv.sentOverdue,
      })),
      ...payments.map((p) => ({
        _id: p._id,
        residentId: p.recipientId,
        amount: p.amount,
        dueDate: p.dueDate,
        type: 'payment',
        sentReminderDay2: p.sentReminderDay2,
        sentReminderDay3: p.sentReminderDay3,
        sentReminderDay4: p.sentReminderDay4,
        sentReminderDaily: p.sentReminderDaily,
        sentOverdue: p.sentOverdue,
      })),
    ];

    for (const item of allItems) {
      const dueDate = new Date(item.dueDate);
      const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

      if (diffDays <= 0 && !item.sentOverdue) {
        const updateData = { status: 'overdue', sentOverdue: true };
        if (item.type === 'invoice') {
          await RentInvoice.findByIdAndUpdate(item._id, updateData);
        } else {
          await Payment.findByIdAndUpdate(item._id, updateData);
        }

        try {
          const alert = await Alert.create({
            userId: item.residentId,
            type: 'general',
            title: 'House Rent Overdue',
            message: `Your rent payment of ₹${item.amount} is overdue.\nDue Date: ${dueDate.toLocaleDateString()}\nPlease make payment immediately to avoid further late fees.`,
            severity: 'warning',
          });
          await UserNotification.create({
            userId: item.residentId,
            alertId: alert._id,
            read: false,
            deleted: false,
          });
          await notifyUser(_io, item.residentId, { type: 'rent_overdue', title: 'House Rent Overdue', body: `Your rent payment of ₹${item.amount} is overdue. Please pay immediately.`, data: { severity: 'warning' } });
        } catch (e) { logger.warn('Overdue notification error:', e.message); }
        continue;
      }

      if (diffDays <= 0) continue;

      let shouldRemind = false;
      let reminderLabel = '';
      let updateField = '';

      if (diffDays === 4 && !item.sentReminderDay4) {
        shouldRemind = true;
        reminderLabel = 'Day 4 Reminder';
        updateField = 'sentReminderDay4';
      } else if (diffDays === 3 && !item.sentReminderDay3) {
        shouldRemind = true;
        reminderLabel = 'Day 3 Reminder';
        updateField = 'sentReminderDay3';
      } else if (diffDays === 2 && !item.sentReminderDay2) {
        shouldRemind = true;
        reminderLabel = 'Day 2 Reminder';
        updateField = 'sentReminderDay2';
      } else if (diffDays >= 1 && diffDays <= 4 && !item.sentReminderDaily) {
        shouldRemind = true;
        reminderLabel = 'Daily Reminder';
        updateField = 'sentReminderDaily';
      }

      if (shouldRemind) {
        const updateData = { [updateField]: true };
        if (item.type === 'invoice') {
          await RentInvoice.findByIdAndUpdate(item._id, updateData);
        } else {
          await Payment.findByIdAndUpdate(item._id, updateData);
        }

        try {
          const alert = await Alert.create({
            userId: item.residentId,
            type: 'general',
            title: `Rent Payment Reminder`,
            message: `Your house rent payment is pending.\nAmount: ₹${item.amount}\nDue Date: ${dueDate.toLocaleDateString()}\nPlease pay before the due date.`,
            severity: 'info',
          });
          const userNotif = await UserNotification.create({
            userId: item.residentId,
            alertId: alert._id,
            read: false,
            deleted: false,
          });
          await notifyUser(_io, item.residentId, { type: 'rent_reminder', title: 'Rent Payment Reminder', body: `Your rent payment of ₹${item.amount} is due on ${dueDate.toLocaleDateString()}.`, data: { severity: 'info' } });
        } catch (e) { logger.warn('Reminder notification error:', e.message); }
      }
    }
  } catch (error) {
    logger.error('Send reminders error:', error);
  }
}

async function checkPaidInvoices() {
  try {
    const pendingInvoices = await RentInvoice.find({ status: 'pending', paymentId: { $exists: true } });
    for (const inv of pendingInvoices) {
      const payment = await Payment.findById(inv.paymentId);
      if (payment && payment.status === 'paid') {
        await RentInvoice.findByIdAndUpdate(inv._id, { status: 'paid', paidAt: payment.paidAt || new Date() });
        logger.info(`Rent invoice ${inv._id} marked paid via linked payment ${payment._id}`);
      }
    }
  } catch (error) {
    logger.error('Check paid invoices error:', error);
  }
}

let intervalId = null;
let _io = null;

function startRentCron(io, intervalMs = 3600000) {
  _io = io;
  logger.info('Starting rent cron service...');
  generateMonthlyInvoices();
  sendReminders();
  checkPaidInvoices();

  intervalId = setInterval(async () => {
    try {
      generateMonthlyInvoices();
      sendReminders();
      checkPaidInvoices();
    } catch (e) {
      logger.error('Rent cron cycle error:', e.message);
    }
  }, intervalMs);

  return intervalId;
}

function stopRentCron() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('Rent cron stopped');
  }
}

module.exports = { startRentCron, stopRentCron, generateMonthlyInvoices, sendReminders, checkPaidInvoices };
