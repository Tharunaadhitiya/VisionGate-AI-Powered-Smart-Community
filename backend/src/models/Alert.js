const { db, buildWhere, buildOrder, aliasRow, aliasRows } = require('./dbHelpers');
const User = require('./User');

const TABLE = 'alerts';
const COLS = 'id AS _id, type, severity, title, message, location, cameraId, imageUrl, videoUrl, metadata, aiProcessed, aiConfidence, status, acknowledgedBy, resolvedBy, acknowledgedAt, resolvedAt, isEmergency, createdBy, broadcastTo, targetUsers, createdAt, updatedAt';

async function populate(a) {
  if (!a) return a;
  const [ackBy, resBy, creBy] = await Promise.all([
    a.acknowledgedBy ? User.findById(a.acknowledgedBy) : null,
    a.resolvedBy ? User.findById(a.resolvedBy) : null,
    a.createdBy ? User.findById(a.createdBy) : null,
  ]);
  a.acknowledgedBy = ackBy;
  a.resolvedBy = resBy;
  a.createdBy = creBy;
  return a;
}

const Alert = {
  async findById(id) { const rows = await db.query(`SELECT ${COLS} FROM ${TABLE} WHERE id = ?`, [id]); return aliasRow(rows[0]); },
  async findOne(conditions) { const { sql, params } = buildWhere(conditions); const rows = await db.query(`SELECT ${COLS} FROM ${TABLE} WHERE ${sql} LIMIT 1`, params); return aliasRow(rows[0]); },
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
    const d = { ...data };
    if (d.metadata && typeof d.metadata === 'object') d.metadata = JSON.stringify(d.metadata);
    if (d.broadcastTo && Array.isArray(d.broadcastTo)) d.broadcastTo = JSON.stringify(d.broadcastTo);
    if (d.targetUsers && Array.isArray(d.targetUsers)) d.targetUsers = JSON.stringify(d.targetUsers);
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
  async aggregate(stages) {
    const groupStage = stages.find(s => s.$group);
    const matchStage = stages.find(s => s.$match);
    let replacements = []; let whereClause = '';
    if (matchStage) { const r = buildWhere(matchStage.$match); whereClause = ` WHERE ${r.sql}`; replacements = r.params; }
    if (groupStage) {
      const groupBy = groupStage.$group._id;
      const field = groupBy.replace('$', '');
      let q = `SELECT ${field} AS _id`;
      for (const [k, v] of Object.entries(groupStage.$group)) {
        if (k === '_id') continue;
        if (v.$sum === 1) q += `, COUNT(*) AS \`${k}\``;
        else if (v.$sum) q += `, COALESCE(SUM(${v.$sum.replace('$', '')}), 0) AS \`${k}\``;
        else if (v.$cond) {
          const c = v.$cond;
          if (c.if.$eq) {
            replacements.push(c.if.$eq[1]);
            q += `, COALESCE(SUM(CASE WHEN ${c.if.$eq[0].replace('$', '')} = ? THEN ${typeof c.then === 'number' ? c.then : 1} ELSE ${typeof c.else === 'number' ? c.else : 0} END), 0) AS \`${k}\``;
          }
        }
      }
      q += ` FROM ${TABLE}${whereClause} GROUP BY ${field}`;
      return db.query(q, replacements);
    }
    return aliasRows(await db.query(`SELECT ${COLS} FROM ${TABLE}${whereClause}`, replacements));
  },
};

module.exports = Alert;
