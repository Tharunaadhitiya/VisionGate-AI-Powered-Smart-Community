const { db, buildWhere, buildOrder, aliasRow, aliasRows } = require('./dbHelpers');
const User = require('./User');

const TABLE = 'lost_items';
const COLS = 'id AS _id, itemName, description, location, dateLost, imageUrl, color, brand, status, reportedBy, matchedItemId, matchScore, resolvedAt, createdAt, updatedAt';

async function populate(item) {
  if (!item) return item;
  const [reporter, matched] = await Promise.all([
    item.reportedBy ? User.findById(item.reportedBy) : null,
    item.matchedItemId ? (async () => { const FoundItem = require('./FoundItem'); return FoundItem.findById(item.matchedItemId); })() : null,
  ]);
  item.reportedBy = reporter;
  item.matchedItem = matched;
  return item;
}

const LostItem = {
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
    const cols = []; const vals = []; const phs = [];
    for (const [k, v] of Object.entries(data)) { if (v !== undefined) { cols.push(`\`${k}\``); vals.push(v); phs.push('?'); } }
    const result = await db.query(`INSERT INTO ${TABLE} (${cols.join(',')}) VALUES (${phs.join(',')})`, vals);
    return this.findById(result.insertId);
  },
  async findByIdAndUpdate(id, updates, options = {}) {
    const setClauses = []; const params = [];
    for (const [k, v] of Object.entries(updates)) { if (v !== undefined) { setClauses.push(`\`${k}\` = ?`); params.push(v); } }
    if (setClauses.length) { params.push(id); await db.query(`UPDATE ${TABLE} SET ${setClauses.join(',')} WHERE id = ?`, params); }
    const row = await this.findById(id);
    return options.populate ? populate(row) : row;
  },
};

module.exports = LostItem;
