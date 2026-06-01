const { db, buildWhere, buildOrder, aliasRow, aliasRows } = require('./dbHelpers');
const User = require('./User');

const TABLE = 'incidents';
const COLS = 'id AS _id, title, description, location, mediaUrl, mediaType, category, priority, aiCategory, aiPriority, aiSummary, status, reportedBy, assignedTo, resolution, resolvedAt, createdAt, updatedAt';

async function populate(inc) {
  if (!inc) return inc;
  if (inc.reportedBy) inc.reporter = await User.findById(inc.reportedBy);
  if (inc.assignedTo) inc.assignee = await User.findById(inc.assignedTo);
  return inc;
}

const Incident = {
  async findById(id) { const rows = await db.query(`SELECT ${COLS} FROM ${TABLE} WHERE id = ?`, [id]); return aliasRow(rows[0]); },
  async find(conditions = {}, options = {}) {
    const { sql, params } = buildWhere(conditions);
    let q = `SELECT ${COLS} FROM ${TABLE} WHERE ${sql}`;
    if (options.sort) q += ' ' + buildOrder(options.sort);
    if (options.skip) q += ` OFFSET ${parseInt(options.skip)}`;
    if (options.limit) q += ` LIMIT ${parseInt(options.limit)}`;
    const rows = aliasRows(await db.query(q, params));
    return options.populate ? Promise.all(rows.map(populate)) : rows;
  },
  async countDocuments(conditions = {}) { const { sql, params } = buildWhere(conditions); const rows = await db.query(`SELECT COUNT(*) AS count FROM ${TABLE} WHERE ${sql}`, params); return rows[0].count; },
  async create(data) {
    const d = { ...data }; delete d._id; delete d.id;
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

module.exports = Incident;
