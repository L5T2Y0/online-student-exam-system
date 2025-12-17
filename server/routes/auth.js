const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/auth');

// 生成token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// 注册
router.post('/register', [
  body('username').notEmpty().withMessage('用户名不能为空'),
  body('password').isLength({ min: 6 }).withMessage('密码至少6位'),
  body('name').notEmpty().withMessage('姓名不能为空'),
  body('role').isIn(['student', 'teacher']).withMessage('角色无效，只能注册学生或教师')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0];
      return res.status(400).json({ 
        message: firstError.msg || '验证失败',
        errors: errors.array() 
      });
    }

    const { username, password, name, role, studentId, email, phone } = req.body;

    // 禁止通过注册接口创建管理员账户（安全措施）
    if (role === 'admin') {
      return res.status(403).json({ message: '不允许注册管理员账户，请联系系统管理员' });
    }

    // 检查用户名是否已存在
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: '用户名已存在' });
    }

    // 检查学号是否已存在
    if (studentId && studentId.trim()) {
      const existingStudentId = await User.findOne({ where: { studentId: studentId.trim() } });
      if (existingStudentId) {
        return res.status(400).json({ message: '学号已存在' });
      }
    }

    // 处理空值：将空字符串转换为 null
    const processedData = {
      username,
      password,
      name,
      role,
      studentId: studentId && studentId.trim() ? studentId.trim() : null,
      email: email && email.trim() ? email.trim() : null,
      phone: phone && phone.trim() ? phone.trim() : null
    };

    const user = await User.create(processedData);

    const token = generateToken(user.id);

    res.status(201).json({
      message: '注册成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    
    // 处理 Sequelize 唯一约束错误
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors[0]?.path;
      if (field === 'username') {
        return res.status(400).json({ message: '用户名已存在' });
      } else if (field === 'studentId') {
        return res.status(400).json({ message: '学号已存在' });
      }
      return res.status(400).json({ message: `${field} 已存在` });
    }
    
    // 处理 Sequelize 验证错误
    if (error.name === 'SequelizeValidationError') {
      const firstError = error.errors[0];
      return res.status(400).json({ message: firstError?.message || '数据验证失败' });
    }
    
    res.status(500).json({ 
      message: '注册失败', 
      error: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误' 
    });
  }
});

// 登录
router.post('/login', [
  body('username').notEmpty().withMessage('用户名不能为空'),
  body('password').notEmpty().withMessage('密码不能为空')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    // 查找用户
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    // 验证密码
    if (!user.password) {
      console.error('用户密码为空:', user.username);
      return res.status(500).json({ message: '用户数据异常，请联系管理员' });
    }
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const token = generateToken(user.id);

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        studentId: user.studentId,
        email: user.email,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ 
      message: '登录失败', 
      error: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
    });
  }
});

module.exports = router;

