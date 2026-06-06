const { db, buildWhere, buildOrder, aliasRow, aliasRows } = require('./dbHelpers');

const TABLE = 'polls';
const COLS = 'id AS _id, title, description, category, startDate, endDate, options, allowMultipleVotes, allowVoteChange, allowVoteRemoval, isActive, createdBy, createdAt, updatedAt';

const Poll = {
  async findById(id) { const rows = await db.query(`SELECT ${COLS} FROM ${TABLE} WHERE id = ?`, [id]); const p = aliasRow(rows[0]); if (p && typeof p.options === 'string') p.options = JSON.parse(p.options); return p; },
  async find(conditions = {}, options = {}) {
    const { sql, params } = buildWhere(conditions);
    let q = `SELECT ${COLS} FROM ${TABLE} WHERE ${sql}`;
    if (options.sort) q += ' ' + buildOrder(options.sort);
    if (options.skip) q += ` OFFSET ${parseInt(options.skip)}`;
    if (options.limit) q += ` LIMIT ${parseInt(options.limit)}`;
    const rows = aliasRows(await db.query(q, params));
    for (const r of rows) { if (typeof r.options === 'string') r.options = JSON.parse(r.options); }
    return rows;
  },
  async countDocuments(conditions = {}) { const { sql, params } = buildWhere(conditions); const rows = await db.query(`SELECT COUNT(*) AS count FROM ${TABLE} WHERE ${sql}`, params); return rows[0].count; },
  async create(data) {
    const d = { ...data }; delete d._id;
    if (d.options && Array.isArray(d.options)) d.options = JSON.stringify(d.options);
    const cols = []; const vals = []; const phs = [];
    for (const [k, v] of Object.entries(d)) { if (v !== undefined) { cols.push(`\`${k}\``); vals.push(v); phs.push('?'); } }
    const result = await db.query(`INSERT INTO ${TABLE} (${cols.join(',')}) VALUES (${phs.join(',')})`, vals);
    return this.findById(result.insertId);
  },
  async findByIdAndUpdate(id, updates, options = {}) {
    const setClauses = []; const params = [];
    for (const [k, v] of Object.entries(updates)) { if (v !== undefined) { setClauses.push(`\`${k}\` = ?`); params.push(v); } }
    if (setClauses.length) { params.push(id); await db.query(`UPDATE ${TABLE} SET ${setClauses.join(',')} WHERE id = ?`, params); }
    return options.new !== false ? this.findById(id) : null;
  },
};

module.exports = Poll;
