const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Paper = require('./Paper');

const Exam = sequelize.define('Exam', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  paperId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Paper,
      key: 'id'
    }
  },
  studentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  submitTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  answers: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  totalScore: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('in_progress', 'submitted', 'graded'),
    allowNull: false,
    defaultValue: 'in_progress'
  },
  autoSubmitted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  cheatRecords: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: '作弊记录：标签页切换、复制粘贴等异常行为'
  },
  tabSwitchCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '标签页切换次数'
  },
  copyPasteCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '复制粘贴次数'
  }
}, {
  tableName: 'exams',
  timestamps: true
});

Exam.belongsTo(Paper, { foreignKey: 'paperId', as: 'paper' });
Exam.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

module.exports = Exam;
