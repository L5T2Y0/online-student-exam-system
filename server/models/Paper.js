const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Paper = sequelize.define('Paper', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: ''
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false
  },
  totalScore: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  questions: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('draft', 'published'),
    allowNull: false,
    defaultValue: 'draft'
  },
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  allowRetake: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: '是否允许补考'
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '考试开始时间（时间窗口）'
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '考试结束时间（时间窗口）'
  }
}, {
  tableName: 'papers',
  timestamps: true
});

Paper.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

module.exports = Paper;
