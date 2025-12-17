const sequelize = require('../config/database');
const User = require('./User');
const Question = require('./Question');
const Paper = require('./Paper');
const Exam = require('./Exam');

// 注意：关联关系已在各自的模型文件中定义
// 这里只是导出模型，避免重复定义关联

module.exports = {
  sequelize,
  User,
  Question,
  Paper,
  Exam
};

