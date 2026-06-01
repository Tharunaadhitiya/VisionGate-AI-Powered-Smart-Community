const { db, buildWhere, buildOrder, aliasRow, aliasRows } = require('./dbHelpers');

const TABLE = 'user_notifications';
const COLS = 'id AS _id, userId, alertId, isRead AS `read`, isDeleted AS deleted, readAt, deletedAt, createdAt, updatedAt';

const UserNotification = {
  async findById(id) { const rows = await db.query(`SELECT ${COLS} FROM ${TABLE} WHERE id = ?`, [id]); return aliasRow(rows[0]); },
  async find(conditions = {}, options = {}) {
    const c = { ...conditions };
    if (c.read !== undefined) { c.isRead = c.read ? 1 : 0; delete c.read; }
    if (c.deleted !== undefined) { c.isDeleted = c.deleted ? 1 : 0; delete c.deleted; }
    if (c.userId) { c.userId = c.userId; }
    const { sql, params } = buildWhere(c);
    let q = `SELECT ${COLS} FROM ${TABLE} WHERE ${sql}`;
    if (options.sort) q += ' ' + buildOrder(options.sort);
    if (options.skip) q += ` OFFSET ${parseInt(options.skip)}`;
    if (options.limit) q += ` LIMIT ${parseInt(options.limit)}`;
    return aliasRows(await db.query(q, params));
  },
  async findOne(conditions) {
    const c = { ...conditions };
    if (c.read !== undefined) { c.isRead = c.read ? 1 : 0; delete c.read; }
    const { sql, params } = buildWhere(c);
    const rows = await db.query(`SELECT ${COLS} FROM ${TABLE} WHERE ${sql} LIMIT 1`, params);
    return aliasRow(rows[0]);
  },
  async countDocuments(conditions = {}) {
    const c = { ...conditions };
    if (c.read !== undefined) { c.isRead = c.read ? 1 : 0; delete c.read; }
    if (c.deleted !== undefined) { c.isDeleted = c.deleted ? 1 : 0; delete c.deleted; }
    const { sql, params } = buildWhere(c);
    const rows = await db.query(`SELECT COUNT(*) AS count FROM ${TABLE} WHERE ${sql}`, params);
    return rows[0].count;
  },
  async create(data) {
    const { read, deleted, ...rest } = data;
    const allData = { ...rest, isRead: read ? 1 : 0, isDeleted: deleted ? 1 : 0 };
    const cols = []; const vals = []; const phs = [];
    for (const [k, v] of Object.entries(allData)) { if (v !== undefined) { cols.push(`\`${k}\``); vals.push(v); phs.push('?'); } }
    const result = await db.query(`INSERT INTO ${TABLE} (${cols.join(',')}) VALUES (${phs.join(',')})`, vals);
    return this.findById(result.insertId);
  },
  async findOneAndUpdate(filter, updates, options = {}) {
    const c = { ...filter };
    if (c._id) { c.id = c._id; delete c._id; }
    if (c.read !== undefined) { c.isRead = c.read ? 1 : 0; delete c.read; }
    if (c.deleted !== undefined) { c.isDeleted = c.deleted ? 1 : 0; delete c.deleted; }
    if (c.userId) { c.userId = c.userId; }
    const { sql, params } = buildWhere(c);
    const rows = await db.query(`SELECT ${COLS} FROM ${TABLE} WHERE ${sql} LIMIT 1`, params);
    if (!rows.length) return null;
    const notif = rows[0];
    const notifPk = notif._id || notif.id;
    const { $unset, ...setData } = updates;
    if ($unset) {
      for (const key of Object.keys($unset)) {
        await db.query(`UPDATE ${TABLE} SET \`${key === 'readAt' ? 'readAt' : key}\` = NULL WHERE id = ?`, [notifPk]);
      }
    }
    if (setData.read !== undefined) setData.isRead = setData.read ? 1 : 0;
    delete setData.read;
    if (setData.deleted !== undefined) setData.isDeleted = setData.deleted ? 1 : 0;
    delete setData.deleted;
    const setClauses = []; const setParams = [];
    for (const [k, v] of Object.entries(setData)) { if (v !== undefined) { setClauses.push(`\`${k}\` = ?`); setParams.push(v); } }
    if (setClauses.length) { setParams.push(notifPk); await db.query(`UPDATE ${TABLE} SET ${setClauses.join(',')} WHERE id = ?`, setParams); }
    return options.new !== false ? this.findById(notifPk) : null;
  },
  async updateMany(conditions, data, options = {}) {
    const c = { ...conditions };
    if (c.read !== undefined) { c.isRead = c.read ? 1 : 0; delete c.read; }
    if (c.deleted !== undefined) { c.isDeleted = c.deleted ? 1 : 0; delete c.deleted; }
    const { sql, params } = buildWhere(c);
    const setClauses = []; const setParams = [];
    if (data.deleted !== undefined) { setClauses.push('isDeleted = ?'); setParams.push(data.deleted ? 1 : 0); }
    if (data.deletedAt) { setClauses.push('deletedAt = ?'); setParams.push(data.deletedAt); }
    if (setClauses.length) { await db.query(`UPDATE ${TABLE} SET ${setClauses.join(',')} WHERE ${sql}`, [...setParams, ...params]); }
  },
  async bulkWrite(operations) {
    if (!operations.length) return;
    let successCount = 0;
    for (const op of operations) {
      if (op.updateOne) {
        const { filter, update, upsert } = op.updateOne;
        const f = { ...filter };
        const existing = await this.findOne(f);
        if (existing) {
          const setData = {};
          if (update.$setOnInsert) {
            for (const [k, v] of Object.entries(update.$setOnInsert)) {
              const col = k === 'read' ? 'isRead' : k === 'deleted' ? 'isDeleted' : k;
              if (existing[k] === undefined || existing[k] === null) setData[col] = v;
            }
          }
          if (Object.keys(setData).length) {
            const sc = Object.entries(setData).map(([k]) => `\`${k}\` = ?`);
            const sv = Object.entries(setData).map(([, v]) => v);
            sv.push(existing.id || existing._id);
            await db.query(`UPDATE ${TABLE} SET ${sc.join(',')} WHERE id = ?`, sv);
          }
        } else if (upsert) {
          const insertData = {};
          if (update.$setOnInsert) {
            Object.entries(update.$setOnInsert).forEach(([k, v]) => {
              insertData[k === 'read' ? 'isRead' : k === 'deleted' ? 'isDeleted' : k] = v;
            });
          }
          await this.create({ ...insertData, ...filter });
        }
        successCount++;
      }
    }
  },
};

module.exports = UserNotification;
