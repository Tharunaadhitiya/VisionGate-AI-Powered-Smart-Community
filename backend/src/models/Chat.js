const { db, aliasRow, aliasRows } = require('./dbHelpers');
const User = require('./User');

const M_TABLE = 'messages';
const C_TABLE = 'conversations';
const CP_TABLE = 'conversation_participants';

const M_COLS = 'id AS _id, conversationId, senderId, receiverId, message, isRead AS `read`, readAt, createdAt, updatedAt';
const C_COLS = 'c.id AS _id, c.lastMessage, c.lastMessageAt, c.lastSender, c.createdAt, c.updatedAt';

async function populateMsg(m) {
  if (!m) return m;
  const [sender, receiver] = await Promise.all([
    m.senderId ? User.findById(m.senderId) : null,
    m.receiverId ? User.findById(m.receiverId) : null,
  ]);
  m.sender = sender; m.receiver = receiver;
  delete m.senderId; delete m.receiverId;
  return m;
}

async function populateConv(c) {
  if (!c) return c;
  if (c.lastSender) c.lastSender = await User.findById(c.lastSender);
  return c;
}

const Message = {
  async findById(id) { const rows = await db.query(`SELECT ${M_COLS} FROM ${M_TABLE} WHERE id = ?`, [id]); return aliasRow(rows[0]); },
  async create(data) {
    const { sender, receiver, ...rest } = data;
    let conversationId = rest.conversationId;
    if (!conversationId) {
      const cp = await db.query(
        `SELECT cp1.conversationId FROM ${CP_TABLE} cp1 JOIN ${CP_TABLE} cp2 ON cp1.conversationId = cp2.conversationId WHERE cp1.userId = ? AND cp2.userId = ?`,
        [sender, receiver]
      );
      if (cp.length) conversationId = cp[0].conversationId;
      else {
        const result = await db.query(`INSERT INTO ${C_TABLE} (lastMessageAt) VALUES (NOW())`, []);
        conversationId = result.insertId;
        await db.query(`INSERT INTO ${CP_TABLE} (conversationId, userId) VALUES (?,?), (?,?)`, [conversationId, sender, conversationId, receiver]);
      }
    }
    const allData = { conversationId, senderId: sender, receiverId: receiver, ...rest };
    const cols = []; const vals = []; const phs = [];
    for (const [k, v] of Object.entries(allData)) { if (v !== undefined) { cols.push(`\`${k}\``); vals.push(v); phs.push('?'); } }
    const result = await db.query(`INSERT INTO ${M_TABLE} (${cols.join(',')}) VALUES (${phs.join(',')})`, vals);
    return this.findById(result.insertId);
  },
  async find(conditions = {}, options = {}) {
    const clauses = []; const params = [];
    if (conditions.$or) {
      const orParts = conditions.$or.map((cond) => {
        const parts = [];
        if (cond.sender) { parts.push('senderId = ?'); params.push(cond.sender); }
        if (cond.receiver) { parts.push('receiverId = ?'); params.push(cond.receiver); }
        return `(${parts.join(' AND ')})`;
      });
      clauses.push(`(${orParts.join(' OR ')})`);
    } else {
      if (conditions.sender) { clauses.push('senderId = ?'); params.push(conditions.sender); }
      if (conditions.receiver) { clauses.push('receiverId = ?'); params.push(conditions.receiver); }
      if (conditions.read !== undefined) { clauses.push('isRead = ?'); params.push(conditions.read ? 1 : 0); }
    }
    const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
    let q = `SELECT ${M_COLS} FROM ${M_TABLE}${where}`;
    if (options.sort) q += ' ORDER BY ' + Object.entries(options.sort).map(([k, d]) => `\`${k}\` ${d === -1 ? 'DESC' : 'ASC'}`).join(',');
    if (options.skip) q += ` OFFSET ${parseInt(options.skip)}`;
    if (options.limit) q += ` LIMIT ${parseInt(options.limit)}`;
    const rows = aliasRows(await db.query(q, params));
    return options.populate ? Promise.all(rows.map(populateMsg)) : rows;
  },
  async countDocuments(conditions = {}) {
    const clauses = []; const params = [];
    if (conditions.$or) {
      const orParts = conditions.$or.map((cond) => {
        const parts = [];
        if (cond.sender) { parts.push('senderId = ?'); params.push(cond.sender); }
        if (cond.receiver) { parts.push('receiverId = ?'); params.push(cond.receiver); }
        return `(${parts.join(' AND ')})`;
      });
      clauses.push(`(${orParts.join(' OR ')})`);
    } else {
      if (conditions.sender) { clauses.push('senderId = ?'); params.push(conditions.sender); }
      if (conditions.receiver) { clauses.push('receiverId = ?'); params.push(conditions.receiver); }
      if (conditions.read !== undefined) { clauses.push('isRead = ?'); params.push(conditions.read ? 1 : 0); }
    }
    const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
    const rows = await db.query(`SELECT COUNT(*) AS count FROM ${M_TABLE}${where}`, params);
    return rows[0].count;
  },
  async updateMany(conditions, updates) {
    const clauses = []; const params = [];
    if (conditions.sender) { clauses.push('senderId = ?'); params.push(conditions.sender); }
    if (conditions.receiver) { clauses.push('receiverId = ?'); params.push(conditions.receiver); }
    if (conditions.read !== undefined) { clauses.push('isRead = ?'); params.push(conditions.read ? 1 : 0); }
    const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
    const setClauses = []; const setParams = [];
    if (updates.read !== undefined) { setClauses.push('isRead = ?'); setParams.push(updates.read ? 1 : 0); }
    if (updates.readAt) { setClauses.push('readAt = ?'); setParams.push(updates.readAt); }
    if (setClauses.length) {
      await db.query(`UPDATE ${M_TABLE} SET ${setClauses.join(',')}${where}`, [...setParams, ...params]);
    }
  },
  async aggregate(stages) {
    const matchStage = stages.find(s => s.$match);
    const groupStage = stages.find(s => s.$group);
    let whereClause = ''; let replacements = [];
    if (matchStage) {
      const clauses = []; const params = [];
      if (matchStage.$match.receiver) { clauses.push('receiverId = ?'); params.push(matchStage.$match.receiver); }
      if (matchStage.$match.read !== undefined) { clauses.push('isRead = ?'); params.push(matchStage.$match.read ? 1 : 0); }
      if (clauses.length) { whereClause = ` WHERE ${clauses.join(' AND ')}`; replacements = params; }
    }
    if (groupStage) {
      if (groupStage.$group._id === '$sender') {
        const rows = await db.query(`SELECT senderId AS _id, COUNT(*) AS \`count\` FROM ${M_TABLE}${whereClause} GROUP BY senderId`, replacements);
        const result = {};
        rows.forEach(r => { result[r._id] = r.count; });
        return Object.entries(result).map(([k, v]) => ({ _id: parseInt(k), count: v }));
      }
    }
    const rows = await db.query(`SELECT COUNT(*) AS count FROM ${M_TABLE}${whereClause}`, replacements);
    return rows;
  },
};

const Conversation = {
  async find(conditions = {}, options = {}) {
    if (conditions.participants) {
      const userId = conditions.participants;
      let q = `SELECT ${C_COLS} FROM ${C_TABLE} c JOIN ${CP_TABLE} cp ON c.id = cp.conversationId WHERE cp.userId = ?`;
      const params = [userId];
      if (options.sort) q += ' ORDER BY ' + Object.entries(options.sort).map(([k, d]) => `c.\`${k}\` ${d === -1 ? 'DESC' : 'ASC'}`).join(',');
      if (options.skip) q += ` OFFSET ${parseInt(options.skip)}`;
      if (options.limit) q += ` LIMIT ${parseInt(options.limit)}`;
      const rows = aliasRows(await db.query(q, params));
      if (options.populate) {
        return Promise.all(rows.map(async (r) => {
          const pRows = await db.query(`SELECT userId FROM ${CP_TABLE} WHERE conversationId = ?`, [r._id]);
          const participants = await Promise.all(pRows.map(p => User.findById(p.userId)));
          r.participants = participants.filter(Boolean);
          return populateConv(r);
        }));
      }
      return rows;
    }
    return [];
  },
  async findOne(conditions = {}) {
    if (conditions.participants && conditions.participants.$all) {
      const [u1, u2] = conditions.participants.$all;
      const rows = await db.query(
        `SELECT cp1.conversationId FROM ${CP_TABLE} cp1 JOIN ${CP_TABLE} cp2 ON cp1.conversationId = cp2.conversationId WHERE cp1.userId = ? AND cp2.userId = ?`,
        [u1, u2]
      );
      if (!rows.length) return null;
      const convRows = await db.query(`SELECT ${C_COLS} FROM ${C_TABLE} c WHERE c.id = ?`, [rows[0].conversationId]);
      const conv = aliasRow(convRows[0]);
      if (!conv) return null;
      const pRows = await db.query(`SELECT userId FROM ${CP_TABLE} WHERE conversationId = ?`, [conv._id]);
      const participants = await Promise.all(pRows.map(p => User.findById(p.userId)));
      conv.participants = participants.filter(Boolean);
      return populateConv(conv);
    }
    return null;
  },
  async findById(id) { const rows = await db.query(`SELECT ${C_COLS} FROM ${C_TABLE} c WHERE c.id = ?`, [id]); const conv = aliasRow(rows[0]); if (!conv) return null; return populateConv(conv); },
  async create(data) {
    const { participants, ...rest } = data;
    const result = await db.query(`INSERT INTO ${C_TABLE} (lastMessage, lastMessageAt, lastSender) VALUES (?, ?, ?)`, [rest.lastMessage || '', rest.lastMessageAt || new Date(), rest.lastSender || null]);
    const convId = result.insertId;
    if (participants && participants.length) {
      const vals = []; const phs = [];
      participants.forEach((p, i) => { vals.push(convId, p); phs.push('(?,?)'); });
      await db.query(`INSERT INTO ${CP_TABLE} (conversationId, userId) VALUES ${phs.join(',')}`, vals);
    }
    return this.findById(convId);
  },
  async updateOne(filter, updates) {
    const { $set } = updates;
    if ($set && filter._id) {
      const setClauses = []; const params = [];
      for (const [k, v] of Object.entries($set)) { if (v !== undefined) { setClauses.push(`\`${k}\` = ?`); params.push(v); } }
      if (setClauses.length) { params.push(filter._id); await db.query(`UPDATE ${C_TABLE} SET ${setClauses.join(',')} WHERE id = ?`, params); }
    }
  },
};

module.exports = { Message, Conversation };
