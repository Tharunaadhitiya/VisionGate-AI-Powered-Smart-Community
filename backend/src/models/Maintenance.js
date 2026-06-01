const { db, buildWhere, buildOrder, aliasRow, aliasRows } = require('./dbHelpers');
const User = require('./User');

const TABLE = 'maintenance_records';
const COLS = 'id AS _id, residentId, amount, dueDate, period, month, year, status, paymentMethod, transactionId, paidAt, receiptUrl, lateFee, totalAmount, notes, createdAt, updatedAt';

const Maintenance = {
  async findById(id) { const rows = await db.query(`SELECT ${COLS} FROM ${TABLE} WHERE id = ?`, [id]); return aliasRow(rows[0]); },
  async find(conditions = {}, options = {}) {
    const c = { ...conditions }; if (c.resident) { c.residentId = c.resident; delete c.resident; }
    const { sql, params } = buildWhere(c);
    let q = `SELECT ${COLS} FROM ${TABLE} WHERE ${sql}`;
    if (options.sort) q += ' ' + buildOrder(options.sort);
    if (options.skip) q += ` OFFSET ${parseInt(options.skip)}`;
    if (options.limit) q += ` LIMIT ${parseInt(options.limit)}`;
    const rows = aliasRows(await db.query(q, params));
    if (options.populate) {
      return Promise.all(rows.map(async (r) => { if (r.residentId) r.resident = await User.findById(r.residentId); return r; }));
    }
    return rows;
  },
  async countDocuments(conditions = {}) { const c = { ...conditions }; if (c.resident) { c.residentId = c.resident; delete c.resident; }
    const { sql, params } = buildWhere(c); const rows = await db.query(`SELECT COUNT(*) AS count FROM ${TABLE} WHERE ${sql}`, params); return rows[0].count; },
  async create(data) {
    const { resident, ...rest } = data;
    const allData = { ...rest, residentId: resident || rest.residentId };
    allData.totalAmount = (parseFloat(allData.amount) || 0) + (parseFloat(allData.lateFee) || 0);
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
      if (c.resident) { c.residentId = c.resident; delete c.resident; }
      const r = buildWhere(c); whereClause = ` WHERE ${r.sql}`; replacements = r.params;
    }
    if (groupStage) {
      let q = 'SELECT ';
      for (const [k, v] of Object.entries(groupStage.$group)) {
        if (k === '_id') q += 'null AS _id';
        else if (v.$sum) q += `, COALESCE(SUM(${typeof v.$sum === 'string' ? v.$sum.replace('$', '') : '*'}), 0) AS \`${k}\``;
      }
      q = q.replace(',', '');
      q += ` FROM ${TABLE}${whereClause}`;
      return db.query(q, replacements);
    }
    return aliasRows(await db.query(`SELECT ${COLS} FROM ${TABLE}${whereClause}`, replacements));
  },
};

module.exports = Maintenance;
