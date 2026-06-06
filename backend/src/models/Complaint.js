const { db, buildWhere, buildOrder, aliasRow, aliasRows } = require('./dbHelpers');
const User = require('./User');

const TABLE = 'complaints';
const COLS = 'id AS _id, residentId, category, aiCategory, aiSuggestedDepartment, aiSummary, title, description, priority, aiPriority, status, assignedTo, images, location, flatNumber, resolution, resolvedAt, resolvedBy, feedback, feedbackComment, createdAt, updatedAt';

async function populate(c) {
  if (!c) return c;
  if (c.residentId) { c.resident = await User.findById(c.residentId); }
  return c;
}

const Complaint = {
  async findById(id) { const rows = await db.query(`SELECT ${COLS} FROM ${TABLE} WHERE id = ?`, [id]); return aliasRow(rows[0]); },
  async find(conditions = {}, options = {}) {
    const c = { ...conditions };
    if (c.resident) { c.residentId = c.resident; delete c.resident; }
    const { sql, params } = buildWhere(c);
    let q = `SELECT ${COLS} FROM ${TABLE} WHERE ${sql}`;
    if (options.sort) q += ' ' + buildOrder(options.sort);
    if (options.skip) q += ` OFFSET ${parseInt(options.skip)}`;
    if (options.limit) q += ` LIMIT ${parseInt(options.limit)}`;
    const rows = aliasRows(await db.query(q, params));
    return options.populate ? Promise.all(rows.map(populate)) : rows;
  },
  async countDocuments(conditions = {}) {
    const c = { ...conditions }; if (c.resident) { c.residentId = c.resident; delete c.resident; }
    const { sql, params } = buildWhere(c);
    const rows = await db.query(`SELECT COUNT(*) AS count FROM ${TABLE} WHERE ${sql}`, params); return rows[0].count;
  },
  async create(data) {
    if (data.images && Array.isArray(data.images)) data.images = JSON.stringify(data.images);
    const { resident, ...rest } = data;
    const allData = { ...rest, residentId: resident || rest.residentId };
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
    const projectStage = stages.find(s => s.$project);
    let replacements = []; let whereClause = '';
    if (matchStage) {
      const c = { ...matchStage.$match };
      if (c.resident) { c.residentId = c.resident; delete c.resident; }
      if (c.resolvedAt && c.resolvedAt.$exists !== undefined) {
        whereClause = ' WHERE resolvedAt IS' + (c.resolvedAt.$exists ? ' NOT' : '') + ' NULL';
        delete c.resolvedAt;
      }
      if (c.createdAt && c.createdAt.$exists !== undefined) {
        if (!whereClause) whereClause = ' WHERE 1=1';
        delete c.createdAt;
      }
      if (Object.keys(c).length > 0) { const r = buildWhere(c); whereClause = whereClause ? `${whereClause} AND ${r.sql}` : ` WHERE ${r.sql}`; replacements = r.params; }
    }
    if (groupStage) {
      const groupBy = groupStage.$group._id;
      const field = groupBy.replace('$', '');
      let q = `SELECT ${field} AS _id`;
      for (const [k, v] of Object.entries(groupStage.$group)) {
        if (k === '_id') continue;
        if (v.$sum === 1) q += `, COUNT(*) AS \`${k}\``;
        else if (v.$avg) q += `, AVG(${v.$avg.replace('$', '')}) AS \`${k}\``;
      }
      q += ` FROM ${TABLE}${whereClause} GROUP BY ${field}`;
      return db.query(q, replacements);
    }
    if (projectStage) {
      const diffField = Object.entries(projectStage.$project).find(([, v]) => typeof v === 'object' && v.$subtract)?.[0];
      if (diffField) {
        const parts = projectStage.$project[diffField].$subtract;
        const result = await db.query(`SELECT AVG(TIMESTAMPDIFF(SECOND, ${parts[0].replace('$', '')}, ${parts[1].replace('$', '')})) AS avgTime FROM ${TABLE}${whereClause}`, replacements);
        return [{ _id: null, avgTime: result[0]?.avgTime || 0 }];
      }
      return db.query(`SELECT AVG(TIMESTAMPDIFF(SECOND, createdAt, resolvedAt)) AS avgTime FROM ${TABLE}${whereClause}`, replacements);
    }
    return aliasRows(await db.query(`SELECT ${COLS} FROM ${TABLE}${whereClause}`, replacements));
  },
};

module.exports = Complaint;
