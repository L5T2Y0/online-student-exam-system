-- 创建数据库
CREATE DATABASE IF NOT EXISTS online_exam CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE online_exam;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role ENUM('student', 'teacher', 'admin') NOT NULL,
  studentId VARCHAR(50) UNIQUE,
  email VARCHAR(100),
  phone VARCHAR(20),
  avatar VARCHAR(255) DEFAULT '',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 题目表
CREATE TABLE IF NOT EXISTS questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('single', 'multiple', 'judge', 'fill', 'essay') NOT NULL,
  subject VARCHAR(100) NOT NULL,
  chapter VARCHAR(100) NOT NULL,
  difficulty ENUM('easy', 'medium', 'hard') NOT NULL DEFAULT 'medium',
  content TEXT NOT NULL,
  options JSON,
  correctAnswer TEXT NOT NULL,
  score INT NOT NULL DEFAULT 5,
  explanation TEXT,
  createdBy INT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_type (type),
  INDEX idx_subject (subject),
  INDEX idx_chapter (chapter),
  INDEX idx_difficulty (difficulty)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 试卷表
CREATE TABLE IF NOT EXISTS papers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  subject VARCHAR(100) NOT NULL,
  totalScore INT NOT NULL,
  duration INT NOT NULL,
  questions JSON NOT NULL,
  createdBy INT NOT NULL,
  status ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
  publishedAt DATETIME,
  allowRetake BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否允许补考',
  startTime DATETIME COMMENT '考试开始时间（时间窗口）',
  endTime DATETIME COMMENT '考试结束时间（时间窗口）',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_subject (subject),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 考试表
CREATE TABLE IF NOT EXISTS exams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  paperId INT NOT NULL,
  studentId INT NOT NULL,
  startTime DATETIME NOT NULL,
  endTime DATETIME,
  submitTime DATETIME,
  answers JSON,
  totalScore DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status ENUM('in_progress', 'submitted', 'graded') NOT NULL DEFAULT 'in_progress',
  autoSubmitted BOOLEAN NOT NULL DEFAULT FALSE,
  cheatRecords JSON COMMENT '作弊记录：标签页切换、复制粘贴等异常行为',
  tabSwitchCount INT NOT NULL DEFAULT 0 COMMENT '标签页切换次数',
  copyPasteCount INT NOT NULL DEFAULT 0 COMMENT '复制粘贴次数',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (paperId) REFERENCES papers(id) ON DELETE CASCADE,
  FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_studentId (studentId),
  INDEX idx_paperId (paperId),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

