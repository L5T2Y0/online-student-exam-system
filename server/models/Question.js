const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Question = sequelize.define('Question', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  type: {
    type: DataTypes.ENUM('single', 'multiple', 'judge', 'fill', 'essay'),
    allowNull: false
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false
  },
  chapter: {
    type: DataTypes.STRING,
    allowNull: false
  },
  difficulty: {
    type: DataTypes.ENUM('easy', 'medium', 'hard'),
    allowNull: false,
    defaultValue: 'medium'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  options: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  correctAnswer: {
    type: DataTypes.TEXT,
    allowNull: false,
    get() {
      const value = this.getDataValue('correctAnswer');
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    },
    set(value) {
      this.setDataValue('correctAnswer', typeof value === 'string' ? value : JSON.stringify(value));
    }
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5
  },
  explanation: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: ''
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  }
}, {
  tableName: 'questions',
  timestamps: true
});

Question.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

module.exports = Question;
