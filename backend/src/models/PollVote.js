const { db, buildWhere, aliasRow, aliasRows } = require('./dbHelpers');

const TABLE = 'poll_votes';
const COLS = 'id AS _id, pollId, userId, optionIndex, createdAt';

const PollVote = {
  async find(conditions = {}) {
    const { sql, params } = buildWhere(conditions);
    const rows = await db.query(`SELECT ${COLS} FROM ${TABLE} WHERE ${sql}`, params);
    return aliasRows(rows);
  },
  async findOne(conditions) {
    const { sql, params } = buildWhere(conditions);
    const rows = await db.query(`SELECT ${COLS} FROM ${TABLE} WHERE ${sql} LIMIT 1`, params);
    return aliasRow(rows[0]);
  },
  async create(data) {
    const cols = []; const vals = []; const phs = [];
    for (const [k, v] of Object.entries(data)) { if (v !== undefined) { cols.push(`\`${k}\``); vals.push(v); phs.push('?'); } }
    const result = await db.query(`INSERT INTO ${TABLE} (${cols.join(',')}) VALUES (${phs.join(',')})`, vals);
    return { _id: result.insertId, ...data };
  },
  async countDocuments(conditions = {}) { const { sql, params } = buildWhere(conditions); const rows = await db.query(`SELECT COUNT(*) AS count FROM ${TABLE} WHERE ${sql}`, params); return rows[0].count; },
  async countByPoll(pollId) {
    const rows = await db.query(`SELECT optionIndex, COUNT(*) AS count FROM ${TABLE} WHERE pollId = ? GROUP BY optionIndex`, [pollId]);
    return rows;
  },
};

module.exports = PollVote;
