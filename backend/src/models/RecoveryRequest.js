const { db, buildWhere, buildOrder, aliasRow, aliasRows } = require('./dbHelpers');

const TABLE = 'recovery_requests';
const COLS = 'request_id AS _id, user_name AS userName, email, phone_number AS phoneNumber, reason, status, admin_note AS adminNote, handled_by AS handledBy, handled_at AS handledAt, created_at AS createdAt, updated_at AS updatedAt';

const FIELD_MAP = { userName: 'user_name', phoneNumber: 'phone_number', adminNote: 'admin_note', handledBy: 'handled_by', handledAt: 'handled_at', createdAt: 'created_at', updatedAt: 'updated_at', _id: 'request_id' };

const RecoveryRequest = {
  async findById(id) {
    const rows = await db.query(`SELECT ${COLS} FROM ${TABLE} WHERE request_id = ?`, [id]);
    return aliasRow(rows[0]);
  },
  async find(conditions = {}, options = {}) {
    const dbConditions = {};
    for (const [k, v] of Object.entries(conditions)) dbConditions[FIELD_MAP[k] || k] = v;
    const { sql, params } = buildWhere(dbConditions);
    let q = `SELECT ${COLS} FROM ${TABLE} WHERE ${sql}`;
    if (options.sort) {
      const dbSort = {};
      for (const [k, v] of Object.entries(options.sort)) dbSort[FIELD_MAP[k] || k] = v;
      q += ' ' + buildOrder(dbSort);
    }
    if (options.skip) q += ` OFFSET ${parseInt(options.skip)}`;
    if (options.limit) q += ` LIMIT ${parseInt(options.limit)}`;
    return aliasRows(await db.query(q, params));
  },
  async countDocuments(conditions = {}) {
    const dbConditions = {};
    for (const [k, v] of Object.entries(conditions)) dbConditions[FIELD_MAP[k] || k] = v;
    const { sql, params } = buildWhere(dbConditions);
    const rows = await db.query(`SELECT COUNT(*) AS count FROM ${TABLE} WHERE ${sql}`, params);
    return rows[0].count;
  },
  async create(data) {
    const d = { ...data };
    delete d._id; delete d.id; delete d.request_id;
    const cols = []; const vals = []; const phs = [];
    for (let [k, v] of Object.entries(d)) {
      if (v !== undefined) {
        k = FIELD_MAP[k] || k;
        cols.push(`\`${k}\``); vals.push(v); phs.push('?');
      }
    }
    const result = await db.query(`INSERT INTO ${TABLE} (${cols.join(',')}) VALUES (${phs.join(',')})`, vals);
    return this.findById(result.insertId);
  },
  async findByIdAndUpdate(id, updates, options = {}) {
    const setClauses = []; const params = [];
    for (let [k, v] of Object.entries(updates)) {
      if (v !== undefined) { k = FIELD_MAP[k] || k; setClauses.push(`\`${k}\` = ?`); params.push(v); }
    }
    if (setClauses.length) { params.push(id); await db.query(`UPDATE ${TABLE} SET ${setClauses.join(',')} WHERE request_id = ?`, params); }
    return options.new !== false ? this.findById(id) : null;
  },
};

module.exports = RecoveryRequest;
