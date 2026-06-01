const bcrypt = require('bcryptjs');
const { db, buildWhere, buildOrder, aliasRow, aliasRows } = require('./dbHelpers');

const TABLE = 'users';
const COLS = 'id AS _id, name, email, phone, role, flatNumber, tower, houseCode, isVerified, isActive, profileImage, fcmToken, deletedAt, reactivationRequested, reactivationReason, preferences, lastLogin, deviceInfo, createdAt, updatedAt';

const User = {
  async findById(id) { const rows = await db.query(`SELECT ${COLS} FROM ${TABLE} WHERE id = ?`, [id]); return aliasRow(rows[0]); },
  async findOne(conditions, options = {}) {
    const { sql, params } = buildWhere(conditions);
    let selectCols = options.select || COLS;
    if (selectCols.includes('+password')) {
      selectCols = selectCols.replace(/\s*\+password/g, '').trim();
      if (!selectCols) selectCols = COLS;
      else if (selectCols === COLS) {}
      else selectCols = COLS + ', ' + selectCols;
      selectCols += ', password';
    }
    const rows = await db.query(`SELECT ${selectCols} FROM ${TABLE} WHERE ${sql} LIMIT 1`, params);
    const row = rows[0];
    if (!row) return null;
    const r = aliasRow(row);
    if (selectCols.includes('password')) r.password = row.password;
    return r;
  },
  async find(conditions = {}, options = {}) {
    const { sql, params } = buildWhere(conditions);
    let selectCols = options.select || COLS;
    if (selectCols.includes('+password')) {
      selectCols = selectCols.replace(/\s*\+password/g, '').trim();
      if (!selectCols) selectCols = COLS;
      else if (selectCols === COLS) {}
      else selectCols = COLS + ', ' + selectCols;
      selectCols += ', password';
    }
    let q = `SELECT ${selectCols} FROM ${TABLE} WHERE ${sql}`;
    if (options.sort) q += ' ' + buildOrder(options.sort);
    if (options.skip) q += ` OFFSET ${parseInt(options.skip)}`;
    if (options.limit) q += ` LIMIT ${parseInt(options.limit)}`;
    const rows = await db.query(q, params);
    return aliasRows(rows);
  },
  async countDocuments(conditions = {}) { const { sql, params } = buildWhere(conditions); const rows = await db.query(`SELECT COUNT(*) AS count FROM ${TABLE} WHERE ${sql}`, params); return rows[0].count; },
  async create(data) {
    const rest = { ...data }; delete rest._id; delete rest.id;
    if (rest.password) rest.password = await bcrypt.hash(rest.password, 12);
    if (rest.preferences && typeof rest.preferences === 'object') rest.preferences = JSON.stringify(rest.preferences);
    if (rest.deviceInfo && typeof rest.deviceInfo === 'object') rest.deviceInfo = JSON.stringify(rest.deviceInfo);
    const cols = []; const vals = []; const phs = [];
    for (const [k, v] of Object.entries(rest)) { if (v !== undefined) { cols.push(`\`${k}\``); vals.push(v); phs.push('?'); } }
    const result = await db.query(`INSERT INTO ${TABLE} (${cols.join(',')}) VALUES (${phs.join(',')})`, vals);
    return this.findById(result.insertId);
  },
  async findByIdAndUpdate(id, updates, options = {}) {
    const { $unset, ...setData } = updates;
    if ($unset) { for (const k of Object.keys($unset)) { await db.query(`UPDATE ${TABLE} SET \`${k}\` = NULL WHERE id = ?`, [id]); } }
    if (setData.preferences && typeof setData.preferences === 'object') setData.preferences = JSON.stringify(setData.preferences);
    const setClauses = []; const params = [];
    for (const [k, v] of Object.entries(setData)) { if (v !== undefined) { setClauses.push(`\`${k}\` = ?`); params.push(v); } }
    if (setClauses.length) { params.push(id); await db.query(`UPDATE ${TABLE} SET ${setClauses.join(',')} WHERE id = ?`, params); }
    return options.new !== false ? this.findById(id) : null;
  },
  async updateMany(conditions, data) { const { sql, params } = buildWhere(conditions); const sc = Object.entries(data).filter(([, v]) => v !== undefined).map(([k]) => `\`${k}\` = ?`); const sv = Object.entries(data).filter(([, v]) => v !== undefined).map(([, v]) => v); if (sc.length) await db.query(`UPDATE ${TABLE} SET ${sc.join(',')} WHERE ${sql}`, [...sv, ...params]); },
  async distinct(field) { const rows = await db.query(`SELECT DISTINCT \`${field}\` FROM ${TABLE} WHERE \`${field}\` IS NOT NULL`); return rows.map(r => r[field]); },
  async save(user) {
    if (user._id || user.id) {
      const id = user._id || user.id;
      const { _id, id: _id2, comparePassword, toJSON, ...data } = user;
      if (data.password) data.password = await bcrypt.hash(data.password, 12);
      if (data.preferences && typeof data.preferences === 'object') data.preferences = JSON.stringify(data.preferences);
      const sc = Object.entries(data).filter(([, v]) => v !== undefined).map(([k]) => `\`${k}\` = ?`);
      const sv = Object.entries(data).filter(([, v]) => v !== undefined).map(([, v]) => v);
      if (sc.length) { sv.push(id); await db.query(`UPDATE ${TABLE} SET ${sc.join(',')} WHERE id = ?`, sv); }
      return this.findById(id);
    }
    return this.create(user);
  },
  async aggregate(stages) {
    let replacements = []; let whereClause = '';
    const matchStage = stages.find(s => s.$match);
    if (matchStage) { const r = buildWhere(matchStage.$match); whereClause = ` WHERE ${r.sql}`; replacements = r.params; }
    const groupStage = stages.find(s => s.$group);
    if (groupStage) {
      const groupBy = groupStage.$group._id;
      const byRole = groupBy === '$role';
      let q = `SELECT ${byRole ? 'role' : groupBy.replace('$', '')} AS _id`;
      for (const [k, v] of Object.entries(groupStage.$group)) {
        if (k === '_id') continue;
        if (v.$sum === 1) q += `, COUNT(*) AS \`${k}\``;
        else if (v.$sum) q += `, COALESCE(SUM(${v.$sum.replace('$', '')}), 0) AS \`${k}\``;
        else if (v.$cond) {
          const c = v.$cond; const field = c.if.$gte ? c.if.$gte[0].replace('$', '') : '1'; const op = c.if.$gte ? '>=' : '!=';
          if (c.if.$gte) replacements.push(c.if.$gte[1]);
          q += `, COALESCE(SUM(CASE WHEN \`${field}\` ${op} ? THEN ${typeof c.then === 'number' ? c.then : 1} ELSE ${typeof c.else === 'number' ? c.else : 0} END), 0) AS \`${k}\``;
        }
      }
      q += ` FROM ${TABLE}${whereClause} GROUP BY ${byRole ? 'role' : groupBy.replace('$', '')}`;
      return db.query(q, replacements);
    }
    let q = `SELECT ${COLS} FROM ${TABLE}${whereClause}`;
    const sortStage = stages.find(s => s.$sort);
    if (sortStage) q += ' ' + buildOrder(sortStage.$sort);
    const limitStage = stages.find(s => s.$limit);
    if (limitStage) q += ` LIMIT ${limitStage.$limit}`;
    return aliasRows(await db.query(q, replacements));
  },
};

module.exports = User;
