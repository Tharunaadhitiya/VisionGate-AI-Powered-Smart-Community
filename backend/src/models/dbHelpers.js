const db = require('../config/db');

function buildWhere(conditions) {
  if (!conditions || Object.keys(conditions).length === 0) return { sql: '1=1', params: [] };
  const clauses = []; const params = [];
  for (const [key, val] of Object.entries(conditions)) {
    if (key.startsWith('$')) {
      if (key === '$or' && Array.isArray(val)) clauses.push(`(${val.map((c) => buildWhere(c).sql).join(' OR ')})`);
      else if (key === '$and' && Array.isArray(val)) clauses.push(`(${val.map((c) => buildWhere(c).sql).join(' AND ')})`);
      continue;
    }
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      for (const [op, opVal] of Object.entries(val)) {
        if (op === '$in') { clauses.push(`\`${key}\` IN (${opVal.map(() => '?').join(',')})`); params.push(...opVal); }
        else if (op === '$ne') { if (opVal === null) clauses.push(`\`${key}\` IS NOT NULL`); else { clauses.push(`\`${key}\` != ?`); params.push(opVal); } }
        else if (op === '$gte') { clauses.push(`\`${key}\` >= ?`); params.push(opVal); }
        else if (op === '$lte') { clauses.push(`\`${key}\` <= ?`); params.push(opVal); }
        else if (op === '$gt') { clauses.push(`\`${key}\` > ?`); params.push(opVal); }
        else if (op === '$lt') { clauses.push(`\`${key}\` < ?`); params.push(opVal); }
        else if (op === '$regex') { clauses.push(`\`${key}\` LIKE ?`); params.push(`%${opVal}%`); }
        else if (op === '$exists') { clauses.push(`\`${key}\` IS${opVal ? ' NOT' : ''} NULL`); }
        else if (op === '$all') { clauses.push('1=1'); }
      }
    } else if (val === null) { clauses.push(`\`${key}\` IS NULL`); }
    else if (key === '_id') { clauses.push('id = ?'); params.push(val); }
    else { clauses.push(`\`${key}\` = ?`); params.push(val); }
  }
  return { sql: clauses.join(' AND '), params };
}

function buildOrder(order) {
  if (!order) return '';
  return 'ORDER BY ' + Object.entries(order).map(([k, d]) => `\`${k}\` ${d === -1 ? 'DESC' : 'ASC'}`).join(', ');
}

function aliasRow(row) { if (!row) return null; if (row._id) return row; const { id, ...rest } = row; rest._id = id; return rest; }
function aliasRows(rows) { return rows.map(aliasRow); }

function toColName(key) {
  if (key === '_id') return 'id';
  if (key === 'resident') return 'residentId';
  if (key === 'sender') return 'senderId';
  if (key === 'receiver') return 'receiverId';
  if (key === 'createdBy') return 'createdBy';
  if (key === 'recipient') return 'recipientId';
  if (key === 'read') return 'isRead';
  if (key === 'deleted') return 'isDeleted';
  return key;
}

const baseModel = (table, cols, { idField = 'id' } = {}) => {
  const COLS = cols || '*';
  return {
    async findById(id) { const rows = await db.query(`SELECT ${COLS} FROM \`${table}\` WHERE ${idField} = ?`, [id]); return aliasRow(rows[0]); },
    async findOne(conditions) { const { sql, params } = buildWhere(conditions); const rows = await db.query(`SELECT ${COLS} FROM \`${table}\` WHERE ${sql} LIMIT 1`, params); return aliasRow(rows[0]); },
    async find(conditions = {}, options = {}) {
      const { sql, params } = buildWhere(conditions);
      let q = `SELECT ${options.select ? options.select.replace(/[+-]/g, '').split(',').map(c => `\`${c.trim()}\``).join(',') : COLS} FROM \`${table}\` WHERE ${sql}`;
      if (options.sort) q += ' ' + buildOrder(options.sort);
      if (options.skip) q += ` OFFSET ${parseInt(options.skip)}`;
      if (options.limit) q += ` LIMIT ${parseInt(options.limit)}`;
      return aliasRows(await db.query(q, params));
    },
    async countDocuments(conditions = {}) { const { sql, params } = buildWhere(conditions); const rows = await db.query(`SELECT COUNT(*) AS count FROM \`${table}\` WHERE ${sql}`, params); return rows[0].count; },
    async create(data) {
      const { _id, id, ...rest } = data;
      const cols = []; const vals = []; const phs = [];
      for (const [k, v] of Object.entries(rest)) { if (v !== undefined) { const col = toColName(k); cols.push(`\`${col}\``); vals.push(typeof v === 'object' && v !== null ? JSON.stringify(v) : v); phs.push('?'); } }
      const result = await db.query(`INSERT INTO \`${table}\` (${cols.join(',')}) VALUES (${phs.join(',')})`, vals);
      return this.findById(result.insertId);
    },
    async findByIdAndUpdate(id, updates, options = {}) {
      const { $unset, ...setData } = updates;
      if ($unset) { for (const k of Object.keys($unset)) { await db.query(`UPDATE \`${table}\` SET \`${k}\` = NULL WHERE ${idField} = ?`, [id]); } }
      const setClauses = []; const params = [];
      for (const [k, v] of Object.entries(setData)) { if (v !== undefined) { setClauses.push(`\`${k}\` = ?`); params.push(typeof v === 'object' && v !== null ? JSON.stringify(v) : v); } }
      if (setClauses.length) { params.push(id); await db.query(`UPDATE \`${table}\` SET ${setClauses.join(',')} WHERE ${idField} = ?`, params); }
      return options.new !== false ? this.findById(id) : null;
    },
    async updateMany(conditions, data) {
      const { sql, params } = buildWhere(conditions);
      const setClauses = []; const setParams = [];
      for (const [k, v] of Object.entries(data)) { setClauses.push(`\`${k}\` = ?`); setParams.push(v); }
      if (setClauses.length) await db.query(`UPDATE \`${table}\` SET ${setClauses.join(',')} WHERE ${sql}`, [...setParams, ...params]);
    },
  };
};

module.exports = { buildWhere, buildOrder, aliasRow, aliasRows, toColName, baseModel, db };
