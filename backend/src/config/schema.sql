-- VisionGate MySQL Schema
-- Run: mysql -u root -p visiongate < schema.sql

CREATE DATABASE IF NOT EXISTS visiongate CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE visiongate;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('resident','security','admin') DEFAULT 'resident',
  flatNumber VARCHAR(50),
  tower VARCHAR(50),
  houseCode VARCHAR(50),
  isVerified BOOLEAN DEFAULT false,
  isActive BOOLEAN DEFAULT true,
  profileImage VARCHAR(500),
  fcmToken VARCHAR(500),
  deletedAt DATETIME NULL,
  reactivationRequested BOOLEAN DEFAULT false,
  reactivationReason TEXT,
  preferences JSON,
  lastLogin DATETIME NULL,
  deviceInfo JSON,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_role (role),
  INDEX idx_isActive (isActive),
  INDEX idx_email (email)
) ENGINE=InnoDB;

-- Visitors
CREATE TABLE IF NOT EXISTS visitors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  photo VARCHAR(500),
  vehicleNumber VARCHAR(50),
  vehicleType VARCHAR(50) DEFAULT 'car',
  purpose ENUM('personal','delivery','service','emergency','other') DEFAULT 'personal',
  description TEXT,
  idProof VARCHAR(500),
  status ENUM('pending','approved','rejected','checked_in','checked_out','denied') DEFAULT 'pending',
  residentId INT NOT NULL,
  approvedBy INT,
  checkedInBy INT,
  qrCode VARCHAR(500),
  otp VARCHAR(10),
  otpExpires DATETIME NULL,
  expectedArrival DATETIME NULL,
  checkInTime DATETIME NULL,
  checkOutTime DATETIME NULL,
  isPreRegistered BOOLEAN DEFAULT false,
  isBlacklisted BOOLEAN DEFAULT false,
  blacklistReason TEXT,
  visitCount INT DEFAULT 0,
  isSuspicious BOOLEAN DEFAULT false,
  suspiciousReason TEXT,
  aiConfidence FLOAT,
  faceEmbedding JSON,
  notes TEXT,
  flatNumber VARCHAR(50),
  tower VARCHAR(50),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (residentId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approvedBy) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (checkedInBy) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_resident (residentId),
  INDEX idx_phone (phone),
  INDEX idx_status (status),
  INDEX idx_blacklisted (isBlacklisted),
  INDEX idx_checkInTime (checkInTime)
) ENGINE=InnoDB;

-- Houses Master Table
CREATE TABLE IF NOT EXISTS houses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  houseCode VARCHAR(20) NOT NULL UNIQUE,
  tower CHAR(1) NOT NULL DEFAULT '',
  block VARCHAR(10) NOT NULL,
  flatNumber VARCHAR(20) NOT NULL,
  floor INT DEFAULT 1,
  residentId INT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (residentId) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_tower (tower),
  INDEX idx_block (block),
  INDEX idx_houseCode (houseCode),
  INDEX idx_resident (residentId)
) ENGINE=InnoDB;

ALTER TABLE houses ADD COLUMN tower CHAR(1) NOT NULL DEFAULT '';
UPDATE houses SET tower = LEFT(block, 1) WHERE tower = '';
ALTER TABLE visitors ADD COLUMN securityId INT AFTER residentId;
ALTER TABLE visitors ADD COLUMN houseCode VARCHAR(20) AFTER securityId;
ALTER TABLE visitors ADD COLUMN approvalTime DATETIME AFTER checkOutTime;
ALTER TABLE visitors ADD COLUMN entryTime DATETIME AFTER approvalTime;
ALTER TABLE visitors ADD COLUMN exitTime DATETIME AFTER entryTime;
ALTER TABLE visitors MODIFY COLUMN status ENUM('pending','approved','rejected','entered','exited') DEFAULT 'pending';

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('suspicious_activity','unauthorized_access','emergency_sos','fire_smoke','weapon_detected','intrusion','loitering','crowd_density','general') NOT NULL,
  severity ENUM('low','medium','high','critical') DEFAULT 'medium',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  location VARCHAR(255),
  cameraId VARCHAR(100),
  imageUrl VARCHAR(500),
  videoUrl VARCHAR(500),
  metadata JSON,
  aiProcessed BOOLEAN DEFAULT false,
  aiConfidence FLOAT,
  status ENUM('new','acknowledged','resolved','false_alarm') DEFAULT 'new',
  acknowledgedBy INT,
  resolvedBy INT,
  acknowledgedAt DATETIME NULL,
  resolvedAt DATETIME NULL,
  isEmergency BOOLEAN DEFAULT false,
  createdBy INT,
  broadcastTo JSON,
  targetUsers JSON,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (acknowledgedBy) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (resolvedBy) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status_created (status, createdAt),
  INDEX idx_type (type),
  INDEX idx_severity (severity),
  INDEX idx_isEmergency (isEmergency)
) ENGINE=InnoDB;

-- Alert target users (join table for targetUsers array)
CREATE TABLE IF NOT EXISTS alert_target_users (
  alertId INT NOT NULL,
  userId INT NOT NULL,
  PRIMARY KEY (alertId, userId),
  FOREIGN KEY (alertId) REFERENCES alerts(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Complaints
CREATE TABLE IF NOT EXISTS complaints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  residentId INT NOT NULL,
  category ENUM('plumbing','electrical','cleaning','noise','security','parking','pest_control','structural','other') NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority ENUM('low','medium','high','critical') DEFAULT 'medium',
  aiPriority ENUM('low','medium','high','critical'),
  status ENUM('submitted','in_progress','resolved','rejected','closed') DEFAULT 'submitted',
  assignedTo INT,
  images JSON,
  location VARCHAR(255),
  flatNumber VARCHAR(50),
  resolution TEXT,
  resolvedAt DATETIME NULL,
  resolvedBy INT,
  feedback INT,
  feedbackComment TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (residentId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assignedTo) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (resolvedBy) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_resident (residentId),
  INDEX idx_status (status),
  INDEX idx_priority (priority)
) ENGINE=InnoDB;

-- Maintenance records
CREATE TABLE IF NOT EXISTS maintenance_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  residentId INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  dueDate DATE NOT NULL,
  period ENUM('monthly','quarterly','yearly') DEFAULT 'monthly',
  month INT,
  year INT,
  status ENUM('pending','paid','overdue','cancelled') DEFAULT 'pending',
  paymentMethod ENUM('credit_card','debit_card','upi','net_banking','cash'),
  transactionId VARCHAR(255),
  paidAt DATETIME NULL,
  receiptUrl VARCHAR(500),
  lateFee DECIMAL(10,2) DEFAULT 0,
  totalAmount DECIMAL(10,2),
  notes TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (residentId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_resident_status (residentId, status),
  INDEX idx_dueDate (dueDate)
) ENGINE=InnoDB;

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  senderId INT,
  recipientId INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  type ENUM('rent','maintenance','penalty','fine','other') NOT NULL,
  description TEXT,
  status ENUM('pending','paid','overdue','cancelled') DEFAULT 'pending',
  dueDate DATE NOT NULL,
  paidAt DATETIME NULL,
  paymentMethod ENUM('credit_card','debit_card','upi','net_banking','cash'),
  transactionId VARCHAR(255),
  createdBy INT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (recipientId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_recipient_status (recipientId, status),
  INDEX idx_sender_status (senderId, status)
) ENGINE=InnoDB;

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lastMessage TEXT,
  lastMessageAt DATETIME NULL,
  lastSender INT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (lastSender) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Conversation participants (join table)
CREATE TABLE IF NOT EXISTS conversation_participants (
  conversationId INT NOT NULL,
  userId INT NOT NULL,
  PRIMARY KEY (conversationId, userId),
  FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_userId (userId)
) ENGINE=InnoDB;

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversationId INT NOT NULL,
  senderId INT NOT NULL,
  receiverId INT NOT NULL,
  message TEXT NOT NULL,
  isRead BOOLEAN DEFAULT false,
  readAt DATETIME NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiverId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sender_receiver (senderId, receiverId),
  INDEX idx_receiver_read (receiverId, isRead),
  INDEX idx_conversation (conversationId, createdAt)
) ENGINE=InnoDB;

-- Notifications (custom notifications from admin)
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  senderId INT NOT NULL,
  type VARCHAR(50) DEFAULT 'general',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Notification recipients (per-user notification state)
CREATE TABLE IF NOT EXISTS notification_recipients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  notificationId INT NOT NULL,
  userId INT NOT NULL,
  isRead BOOLEAN DEFAULT false,
  isDeleted BOOLEAN DEFAULT false,
  readAt DATETIME NULL,
  deletedAt DATETIME NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (notificationId) REFERENCES notifications(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE INDEX idx_user_notification (userId, notificationId),
  INDEX idx_user_deleted (userId, isDeleted, isRead)
) ENGINE=InnoDB;

-- User notifications (per-user alert tracking)
CREATE TABLE IF NOT EXISTS user_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  alertId INT NOT NULL,
  isRead BOOLEAN DEFAULT false,
  isDeleted BOOLEAN DEFAULT false,
  readAt DATETIME NULL,
  deletedAt DATETIME NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (alertId) REFERENCES alerts(id) ON DELETE CASCADE,
  UNIQUE INDEX idx_user_alert (userId, alertId),
  INDEX idx_user_deleted_read (userId, isDeleted, isRead)
) ENGINE=InnoDB;

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT,
  action VARCHAR(255) NOT NULL,
  resource VARCHAR(255) NOT NULL,
  resourceId VARCHAR(100),
  details JSON,
  ipAddress VARCHAR(45),
  userAgent TEXT,
  status ENUM('success','failure') DEFAULT 'success',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_action (userId, createdAt),
  INDEX idx_action (action),
  INDEX idx_created (createdAt)
) ENGINE=InnoDB;

-- Analytics
CREATE TABLE IF NOT EXISTS analytics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,
  type ENUM('visitor_stats','security_stats','complaint_stats','surveillance_stats','maintenance_stats','general') NOT NULL,
  data JSON NOT NULL,
  total INT,
  approved INT,
  rejected INT,
  suspicious INT,
  pending INT,
  resolved INT,
  averageTime FLOAT,
  peakHour INT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_date_type (date, type)
) ENGINE=InnoDB;

-- Amenity bookings
CREATE TABLE IF NOT EXISTS amenity_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  residentId INT NOT NULL,
  amenityType ENUM('clubhouse','swimming_pool','gym','tennis_court','badminton_court','party_hall','garden','other') NOT NULL,
  date DATE NOT NULL,
  startTime VARCHAR(10) NOT NULL,
  endTime VARCHAR(10) NOT NULL,
  status ENUM('pending','confirmed','cancelled','completed') DEFAULT 'pending',
  guests INT DEFAULT 0,
  purpose TEXT,
  fee DECIMAL(10,2) DEFAULT 0,
  paymentStatus ENUM('pending','paid','refunded') DEFAULT 'pending',
  approvedBy INT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (residentId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approvedBy) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_resident_date (residentId, date),
  INDEX idx_amenity_date_status (amenityType, date, status)
) ENGINE=InnoDB;

ALTER TABLE complaints ADD COLUMN IF NOT EXISTS aiCategory VARCHAR(50) AFTER category;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS aiSuggestedDepartment VARCHAR(100) AFTER aiCategory;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS aiSummary TEXT AFTER aiSuggestedDepartment;

CREATE TABLE IF NOT EXISTS notices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category ENUM('general','maintenance','security','events','emergency') NOT NULL DEFAULT 'general',
  priority ENUM('low','medium','high','emergency') DEFAULT 'medium',
  publishDate DATETIME DEFAULT CURRENT_TIMESTAMP,
  expiryDate DATETIME NULL,
  attachmentUrl VARCHAR(500),
  createdBy INT NOT NULL,
  isActive BOOLEAN DEFAULT true,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_category (category),
  INDEX idx_priority (priority),
  INDEX idx_publish (publishDate),
  INDEX idx_expiry (expiryDate)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS polls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  startDate DATETIME NOT NULL,
  endDate DATETIME NOT NULL,
  options JSON NOT NULL,
  allowMultipleVotes BOOLEAN DEFAULT false,
  isActive BOOLEAN DEFAULT true,
  createdBy INT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_active (isActive, endDate),
  INDEX idx_category (category)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS poll_votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pollId INT NOT NULL,
  userId INT NOT NULL,
  optionIndex INT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pollId) REFERENCES polls(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE INDEX idx_poll_user (pollId, userId, optionIndex)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS incidents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(255),
  mediaUrl VARCHAR(500),
  mediaType ENUM('image','video') DEFAULT 'image',
  category VARCHAR(50),
  priority ENUM('low','medium','high','critical') DEFAULT 'medium',
  aiCategory VARCHAR(50),
  aiPriority ENUM('low','medium','high','critical'),
  aiSummary TEXT,
  status ENUM('submitted','ai_analyzed','under_review','assigned','resolved','dismissed') DEFAULT 'submitted',
  reportedBy INT NOT NULL,
  assignedTo INT,
  resolution TEXT,
  resolvedAt DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (reportedBy) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assignedTo) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_category (category),
  INDEX idx_priority (priority),
  INDEX idx_reporter (reportedBy)
) ENGINE=InnoDB;

ALTER TABLE incidents MODIFY COLUMN mediaUrl LONGTEXT;
ALTER TABLE visitors ADD COLUMN vehicleType VARCHAR(50) DEFAULT 'car';
ALTER TABLE users ADD COLUMN houseCode VARCHAR(50) AFTER tower;
