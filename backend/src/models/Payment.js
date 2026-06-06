const { db, buildWhere, buildOrder, aliasRow, aliasRows } = require('./dbHelpers');
const User = require('./User');

const TABLE = 'payments';
const COLS = 'id AS _id, senderId, recipientId, amount, type, title, description, status, dueDate, paidAt, paymentMethod, transactionId, createdBy, createdAt, updatedAt, sentReminderDay2, sentReminderDay3, sentReminderDay4, sentReminderDaily, sentOverdue';

async function populate(p) {
  if (!p) return p;
  const [recipient, sender, creator] = await Promise.all([
    p.recipientId ? User.findById(p.recipientId) : null,
    p.senderId ? User.findById(p.senderId) : null,
    p.createdBy ? User.findById(p.createdBy) : null,
  ]);
  p.recipient = recipient;
  if (sender) p.sender = sender;
  if (creator) p.createdBy = creator;
  return p;
}

const Payment = {
  async findById(id) { const rows = await db.query(`SELECT ${COLS} FROM ${TABLE} WHERE id = ?`, [id]); return aliasRow(rows[0]); },
  async find(conditions = {}, options = {}) {
    const c = { ...conditions };
    if (c.recipient) { c.recipientId = c.recipient; delete c.recipient; }
    if (c.sender) { c.senderId = c.sender; delete c.sender; }
    const { sql, params } = buildWhere(c);
    let q = `SELECT ${COLS} FROM ${TABLE} WHERE ${sql}`;
    if (options.sort) q += ' ' + buildOrder(options.sort);
    if (options.skip) q += ` OFFSET ${parseInt(options.skip)}`;
    if (options.limit) q += ` LIMIT ${parseInt(options.limit)}`;
    const rows = aliasRows(await db.query(q, params));
    return options.populate ? Promise.all(rows.map(populate)) : rows;
  },
  async countDocuments(conditions = {}) {
    const c = { ...conditions }; if (c.recipient) { c.recipientId = c.recipient; delete c.recipient; }
    const { sql, params } = buildWhere(c); const rows = await db.query(`SELECT COUNT(*) AS count FROM ${TABLE} WHERE ${sql}`, params); return rows[0].count;
  },
  async create(data) {
    const { recipient, sender, ...rest } = data;
    const allData = { ...rest, recipientId: recipient || rest.recipientId, senderId: sender || rest.senderId };
    const cols = []; const vals = []; const phs = [];
    for (const [k, v] of Object.entries(allData)) { if (v !== undefined) { cols.push(`\`${k}\``); vals.push(v); phs.push('?'); } }
    const result = await db.query(`INSERT INTO ${TABLE} (${cols.join(',')}) VALUES (${phs.join(',')})`, vals);
    return this.findById(result.insertId);
  },
  async findByIdAndUpdate(id, updates, options = {}) {
    const setClauses = []; const params = [];
    for (const [k, v] of Object.entries(updates)) { if (v !== undefined) { setClauses.push(`\`${k}\` = ?`); params.push(v); } }
    if (setClauses.length) { params.push(id); await db.query(`UPDATE ${TABLE} SET ${setClauses.join(',')} WHERE id = ?`, params); }
    return options.new !== false ? this.findById(id) : null;
  },
  async aggregate(stages) {
    const groupStage = stages.find(s => s.$group);
    const matchStage = stages.find(s => s.$match);
    let replacements = []; let whereClause = '';
    if (matchStage) {
      const c = { ...matchStage.$match };
      if (c.recipient) { c.recipientId = c.recipient; delete c.recipient; }
      const r = buildWhere(c); whereClause = ` WHERE ${r.sql}`; replacements = r.params;
    }
    if (groupStage) {
      let q = 'SELECT null AS _id';
      for (const [k, v] of Object.entries(groupStage.$group)) {
        if (k === '_id') continue;
        if (v.$sum) q += `, COALESCE(SUM(${typeof v.$sum === 'string' ? v.$sum.replace('$', '') : 1}), 0) AS \`${k}\``;
      }
      q += ` FROM ${TABLE}${whereClause}`;
      const rows = await db.query(q, replacements);
      return rows.length ? rows : [{ _id: null, total: 0, count: 0 }];
    }
    return aliasRows(await db.query(`SELECT ${COLS} FROM ${TABLE}${whereClause}`, replacements));
  },
};

module.exports = Payment;
