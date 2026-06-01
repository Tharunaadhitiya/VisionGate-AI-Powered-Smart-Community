const { db, buildWhere, buildOrder, aliasRow, aliasRows } = require('./dbHelpers');
const User = require('./User');
const House = require('./House');

const TABLE = 'visitors';
const COLS = 'id AS _id, name, phone, email, photo, vehicleNumber, vehicleType, purpose, description, idProof, status, residentId, securityId, houseCode, approvedBy, checkedInBy, qrCode, otp, otpExpires, expectedArrival, checkInTime, checkOutTime, approvalTime, entryTime, exitTime, isPreRegistered, isBlacklisted, blacklistReason, visitCount, isSuspicious, suspiciousReason, aiConfidence, faceEmbedding, notes, flatNumber, tower, createdAt, updatedAt';

async function populate(v) {
  if (!v) return v;
  const [resident, security, approvedByUser, checkedInByUser, house] = await Promise.all([
    v.residentId ? User.findById(v.residentId) : null,
    v.securityId ? User.findById(v.securityId) : null,
    v.approvedBy ? User.findById(v.approvedBy) : null,
    v.checkedInBy ? User.findById(v.checkedInBy) : null,
    v.houseCode ? House.search(v.houseCode).then(h => h[0]) : null,
  ]);
  v.resident = resident;
  v.security = security;
  if (approvedByUser) v.approvedBy = approvedByUser;
  if (checkedInByUser) v.checkedInBy = checkedInByUser;
  if (house) v.house = house;
  return v;
}

const Visitor = {
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
    const { resident, security, ...rest } = data;
    const allData = { ...rest, residentId: resident || rest.residentId, securityId: security || rest.securityId };
    if (allData.faceEmbedding && typeof allData.faceEmbedding === 'object') allData.faceEmbedding = JSON.stringify(allData.faceEmbedding);
    const cols = []; const vals = []; const phs = [];
    for (const [k, v] of Object.entries(allData)) { if (v !== undefined) { cols.push(`\`${k}\``); vals.push(v); phs.push('?'); } }
    const result = await db.query(`INSERT INTO ${TABLE} (${cols.join(',')}) VALUES (${phs.join(',')})`, vals);
    return this.findById(result.insertId);
  },
  async findByIdAndUpdate(id, updates, options = {}) {
    if (updates.faceEmbedding && typeof updates.faceEmbedding === 'object') updates.faceEmbedding = JSON.stringify(updates.faceEmbedding);
    const setClauses = []; const params = [];
    for (const [k, v] of Object.entries(updates)) { if (v !== undefined) { setClauses.push(`\`${k}\` = ?`); params.push(v); } }
    if (setClauses.length) { params.push(id); await db.query(`UPDATE ${TABLE} SET ${setClauses.join(',')} WHERE id = ?`, params); }
    const row = await this.findById(id);
    return options.populate ? populate(row) : row;
  },
  async aggregate(stages) {
    const matchStage = stages.find(s => s.$match);
    const groupStage = stages.find(s => s.$group);
    const sortStage = stages.find(s => s.$sort);
    const limitStage = stages.find(s => s.$limit);
    let replacements = [];
    let whereClause = '';
    if (matchStage) { const r = buildWhere(matchStage.$match); whereClause = ` WHERE ${r.sql}`; replacements = r.params; }
    if (groupStage) {
      const groupBy = groupStage.$group._id;
      let q = 'SELECT ';
      if (groupBy === '$status') q += 'status AS _id';
      else if (groupBy === '$phone') q += 'phone AS _id, MAX(name) AS name';
      else if (groupBy.$hour) q += 'HOUR(checkInTime) AS _id';
      else if (groupBy.$dateToString) q += 'DATE(createdAt) AS _id';
      else q += (typeof groupBy === 'string' ? groupBy.replace('$', '') : '1') + ' AS _id';
      for (const [k, v] of Object.entries(groupStage.$group)) {
        if (k === '_id') continue;
        if (v.$sum === 1) q += `, COUNT(*) AS \`${k}\``;
        else if (v.$sum) q += `, COALESCE(SUM(${v.$sum.replace('$', '')}), 0) AS \`${k}\``;
        else if (v.$avg) q += `, AVG(${v.$avg.replace('$', '')}) AS \`${k}\``;
        else if (v.$first) q += `, MAX(${v.$first.replace('$', '')}) AS \`${k}\``;
        else if (v.$cond) {
          const c = v.$cond;
          if (c.if.$gte) {
            replacements.push(c.if.$gte[1]);
            q += `, COALESCE(SUM(CASE WHEN ${c.if.$gte[0].replace('$', '')} >= ? THEN ${typeof c.then === 'number' ? c.then : 1} ELSE ${typeof c.else === 'number' ? c.else : 0} END), 0) AS \`${k}\``;
          } else if (c.if.$ne) {
            q += `, COALESCE(SUM(CASE WHEN ${c.if.$ne[0].replace('$', '')} IS NOT NULL THEN ${typeof c.then === 'number' ? c.then : 1} ELSE ${typeof c.else === 'number' ? c.else : 0} END), 0) AS \`${k}\``;
          }
        }
      }
      q += ` FROM ${TABLE}${whereClause}`;
      if (groupBy === '$status') q += ' GROUP BY status';
      else if (groupBy === '$phone') q += ' GROUP BY phone';
      else if (groupBy.$hour) q += ' GROUP BY HOUR(checkInTime)';
      else if (groupBy.$dateToString) q += ' GROUP BY DATE(createdAt)';
      else if (typeof groupBy === 'string') q += ` GROUP BY ${groupBy.replace('$', '')}`;
      if (sortStage) q += ' ' + buildOrder(sortStage.$sort);
      if (limitStage) q += ` LIMIT ${limitStage.$limit}`;
      return db.query(q, replacements);
    }
    return aliasRows(await db.query(`SELECT ${COLS} FROM ${TABLE}${whereClause}`, replacements));
  },
};

module.exports = Visitor;
