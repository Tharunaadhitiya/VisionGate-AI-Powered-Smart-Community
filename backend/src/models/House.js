const { db, buildWhere, buildOrder, aliasRow, aliasRows } = require('./dbHelpers');
const User = require('./User');
const logger = require('../utils/logger');

const TABLE = 'houses';
const COLS = 'id AS _id, houseCode, tower, block, flatNumber, floor, residentId, createdAt, updatedAt';

async function populate(h) {
  if (!h) return h;
  if (h.residentId) h.resident = await User.findById(h.residentId);
  return h;
}

const House = {
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
  async create(data) {
    const d = { ...data }; delete d._id;
    const cols = []; const vals = []; const phs = [];
    for (const [k, v] of Object.entries(d)) { if (v !== undefined) { cols.push(`\`${k}\``); vals.push(v); phs.push('?'); } }
    const result = await db.query(`INSERT INTO ${TABLE} (${cols.join(',')}) VALUES (${phs.join(',')})`, vals);
    return this.findById(result.insertId);
  },
  async search(q) {
    const keyword = `%${q}%`;
    const rows = await db.query(
      `SELECT h.id AS _id, h.houseCode, h.block, h.flatNumber, h.floor, h.residentId, u.name AS residentName, u.email AS residentEmail, u.phone AS residentPhone
       FROM houses h LEFT JOIN users u ON h.residentId = u.id
       WHERE h.houseCode LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR CONCAT(h.block, '-', h.flatNumber) LIKE ?
       LIMIT 20`,
      [keyword, keyword, keyword, keyword]
    );
    return rows.map((r) => ({ _id: r._id, houseCode: r.houseCode, block: r.block, flatNumber: r.flatNumber, floor: r.floor, residentId: r.residentId, residentName: r.residentName, residentEmail: r.residentEmail, residentPhone: r.residentPhone }));
  },
  async getTowers() {
    const rows = await db.query(
      `SELECT DISTINCT u.tower FROM users u WHERE u.role = 'resident' AND u.tower IS NOT NULL AND u.tower != '' ORDER BY u.tower`
    );
    const towers = rows.map((r) => r.tower).filter(Boolean);
    logger.info(`[House.getTowers] Found ${towers.length} towers: ${towers.join(',') || 'none'}`);
    return towers;
  },
  async ensureHouseForResident(userId, tower, flatNumber) {
    const existing = await this.findByResident(userId);
    if (existing.length > 0) return existing[0];
    const houseCode = `${tower}-${flatNumber}`;
    const floor = parseInt(flatNumber.charAt(0)) || 1;
    const house = await this.create({
      houseCode,
      tower,
      block: tower,
      flatNumber,
      floor,
      residentId: userId,
    });
    logger.info(`[House.ensureHouseForResident] Created house ${houseCode} for user ${userId}`);
    return house;
  },
  async getFlatsByTower(tower) {
    const rows = await db.query(
      `SELECT u.id AS residentId, u.name AS residentName, u.email AS residentEmail, u.phone AS residentPhone,
              u.tower, u.flatNumber, h.id AS houseId, h.houseCode
       FROM users u
       LEFT JOIN houses h ON h.residentId = u.id
       WHERE u.role = 'resident' AND u.tower = ? AND u.flatNumber IS NOT NULL AND u.flatNumber != ''
       ORDER BY u.flatNumber`,
      [tower]
    );
    const results = [];
    for (const r of rows) {
      let houseId = r.houseId;
      let houseCode = r.houseCode;
      if (!houseId) {
        const house = await this.ensureHouseForResident(r.residentId, r.tower, r.flatNumber);
        houseId = house._id;
        houseCode = house.houseCode;
      }
      results.push({
        _id: houseId,
        houseCode,
        tower: r.tower,
        flatNumber: r.flatNumber,
        residentId: r.residentId,
        residentName: r.residentName,
        residentEmail: r.residentEmail,
        residentPhone: r.residentPhone,
      });
    }
    logger.info(`[House.getFlatsByTower] Tower ${tower}: ${results.length} flats found`);
    return results;
  },
  async findByResident(userId) {
    const rows = await db.query(`SELECT ${COLS} FROM ${TABLE} WHERE residentId = ?`, [userId]);
    return aliasRows(rows);
  },
};

module.exports = House;
