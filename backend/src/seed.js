const config = require('./config');
const initDatabase = require('./config/initDb');
const User = require('./models/User');
const Visitor = require('./models/Visitor');
const Complaint = require('./models/Complaint');
const Alert = require('./models/Alert');
const Maintenance = require('./models/Maintenance');
const Payment = require('./models/Payment');
const House = require('./models/House');
const { db } = require('./models/dbHelpers');
const logger = require('./utils/logger');

const users = [
  { name: 'Admin User', email: 'admin@visiongate.com', phone: '9876543210', password: 'password123', role: 'admin', flatNumber: 'A-101', tower: 'A' },
  { name: 'Security Guard', email: 'security@visiongate.com', phone: '9876543211', password: 'password123', role: 'security', tower: 'Main Gate' },
  { name: 'John Resident', email: 'john@visiongate.com', phone: '9876543212', password: 'password123', role: 'resident', flatNumber: '201', tower: 'A', houseCode: 'A-201' },
  { name: 'Jane Resident', email: 'jane@visiongate.com', phone: '9876543213', password: 'password123', role: 'resident', flatNumber: '101', tower: 'B', houseCode: 'B-101' },
  { name: 'Bob Resident', email: 'bob@visiongate.com', phone: '9876543214', password: 'password123', role: 'resident', flatNumber: '301', tower: 'A', houseCode: 'A-301' },
];

const seedData = async () => {
  try {
    await initDatabase();
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    const tables = ['users', 'visitors', 'complaints', 'alerts', 'maintenance_records', 'payments', 'messages', 'conversations', 'conversation_participants', 'user_notifications', 'notification_recipients', 'notifications', 'alert_target_users', 'audit_logs', 'analytics', 'amenity_bookings'];
    for (const table of tables) {
      await db.query(`DELETE FROM ${table}`);
    }
    await db.query('SET FOREIGN_KEY_CHECKS = 1');

    const createdUsers = [];
    for (const u of users) {
      const user = await User.create({ ...u });
      createdUsers.push(user);
    }
    logger.info(`Created ${createdUsers.length} users`);

    const houses = [
      { houseCode: 'A-201', tower: 'A', block: 'A', flatNumber: '201', floor: 2, residentId: createdUsers[2]?._id },
      { houseCode: 'A-102', tower: 'A', block: 'A', flatNumber: '102', floor: 1, residentId: null },
      { houseCode: 'A-301', tower: 'A', block: 'A', flatNumber: '301', floor: 3, residentId: createdUsers[4]?._id },
      { houseCode: 'B-101', tower: 'B', block: 'B', flatNumber: '101', floor: 1, residentId: createdUsers[3]?._id },
      { houseCode: 'B-201', tower: 'B', block: 'B', flatNumber: '201', floor: 2, residentId: null },
      { houseCode: 'B-204', tower: 'B', block: 'B', flatNumber: '204', floor: 2, residentId: null },
      { houseCode: 'B-302', tower: 'B', block: 'B', flatNumber: '302', floor: 3, residentId: null },
      { houseCode: 'C-301', tower: 'C', block: 'C', flatNumber: '301', floor: 3, residentId: null },
      { houseCode: 'C-102', tower: 'C', block: 'C', flatNumber: '102', floor: 1, residentId: null },
      { houseCode: 'D-101', tower: 'D', block: 'D', flatNumber: '101', floor: 1, residentId: null },
      { houseCode: 'D-202', tower: 'D', block: 'D', flatNumber: '202', floor: 2, residentId: null },
    ];
    for (const h of houses) { await House.create(h); }
    await db.query("UPDATE houses SET residentId = ? WHERE houseCode = 'A1-101'", [createdUsers[2]?._id]);
    await db.query("UPDATE houses SET residentId = ? WHERE houseCode = 'A-301'", [createdUsers[4]?._id]);
    await db.query("UPDATE houses SET residentId = ? WHERE houseCode = 'B-101'", [createdUsers[3]?._id]);
    logger.info(`Created ${houses.length} houses`);

    const houseCodes = ['A-201', 'A-102', 'A-301', 'B-101', 'B-204', 'C-301', 'B-201', 'D-101'];
    const houseCodeMap: Record<string, number> = {};
    for (const h of houses) {
      const fullHouse = await House.search(h.houseCode);
      if (fullHouse[0]?.residentName) {
        const residentUser = createdUsers.find((u) => u.name === fullHouse[0].residentName);
        if (residentUser) houseCodeMap[h.houseCode] = residentUser._id;
      }
    }
    const visitors = [];
    for (let i = 0; i < 20; i++) {
      const hc = houseCodes[Math.floor(Math.random() * houseCodes.length)];
      const resid = houseCodeMap[hc] || createdUsers[Math.floor(Math.random() * 3) + 2]._id;
      visitors.push({
        name: `Visitor ${i + 1}`,
        phone: `98765${String(43220 + i).padStart(5, '0')}`,
        purpose: ['personal', 'delivery', 'service', 'emergency', 'other'][Math.floor(Math.random() * 5)],
        status: ['pending', 'approved', 'entered', 'exited', 'rejected'][Math.floor(Math.random() * 5)],
        residentId: resid,
        houseCode: hc,
        securityId: createdUsers[1]?._id,
        visitCount: Math.floor(Math.random() * 5),
        vehicleNumber: i % 3 === 0 ? `TN-01-AB-${1000 + i}` : undefined,
        entryTime: i % 3 === 0 ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000) : undefined,
        exitTime: i % 3 === 0 ? new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000) : undefined,
      });
    }
    for (const v of visitors) {
      await Visitor.create(v);
    }
    logger.info(`Created ${visitors.length} visitors`);

    const categories = ['plumbing', 'electrical', 'cleaning', 'noise', 'security', 'parking', 'pest_control', 'structural'];
    for (let i = 0; i < 10; i++) {
      await Complaint.create({
        resident: createdUsers[Math.floor(Math.random() * 3) + 2]._id,
        category: categories[Math.floor(Math.random() * categories.length)],
        title: `Issue #${i + 1}: ${['Leaking tap', 'Power outage', 'Loud music', 'Garbage not collected', 'Gate malfunction', 'Parking issue', 'Pest problem', 'Crack on wall'][Math.floor(Math.random() * 8)]}`,
        description: `Description for complaint #${i + 1}`,
        priority: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
        status: ['submitted', 'in_progress', 'resolved'][Math.floor(Math.random() * 3)],
        flatNumber: ['A-201', 'A-301', 'B-101'][Math.floor(Math.random() * 3)],
      });
    }
    logger.info('Created 10 complaints');

    const alertTypes = ['suspicious_activity', 'unauthorized_access', 'emergency_sos', 'intrusion', 'loitering'];
    for (let i = 0; i < 8; i++) {
      await Alert.create({
        type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
        severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
        title: `${alertTypes[Math.floor(Math.random() * alertTypes.length)].replace('_', ' ').toUpperCase()} Alert`,
        message: `Alert message #${i + 1}`,
        status: ['new', 'acknowledged', 'resolved'][Math.floor(Math.random() * 3)],
        isEmergency: Math.random() > 0.7,
        broadcastTo: ['all', 'security', 'admin'],
      });
    }
    logger.info('Created 8 alerts');

    for (let i = 0; i < 6; i++) {
      await Maintenance.create({
        resident: createdUsers[Math.floor(Math.random() * 3) + 2]._id,
        amount: 1500 + Math.floor(Math.random() * 1000),
        dueDate: new Date(2024, (i % 12), 10),
        month: (i % 12) + 1,
        year: 2024,
        period: 'monthly',
        status: i < 4 ? 'paid' : 'pending',
        paymentMethod: i < 4 ? ['credit_card', 'upi', 'net_banking'][Math.floor(Math.random() * 3)] : undefined,
      });
    }
    logger.info('Created maintenance records');

    for (let i = 0; i < 4; i++) {
      await Payment.create({
        recipient: createdUsers[Math.floor(Math.random() * 3) + 2]._id,
        sender: createdUsers[Math.floor(Math.random() * 3) + 2]._id,
        amount: 500 + Math.floor(Math.random() * 5000),
        type: ['rent', 'maintenance', 'penalty', 'fine'][Math.floor(Math.random() * 4)],
        dueDate: new Date(2024, 11, 31 + (i % 2)),
        description: `Sample payment #${i + 1}`,
        status: ['pending', 'paid', 'pending'][Math.floor(Math.random() * 3)],
        createdBy: createdUsers[0]._id,
      });
    }
    logger.info('Created payment records');

    logger.info('Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();
