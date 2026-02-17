const express = require('express');
const router = express.Router();
const multer = require('multer');
const { Op } = require('sequelize');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const XLSX = require('xlsx');

// 配置multer用于文件上传
const upload = multer({ storage: multer.memoryStorage() });

// 获取当前用户信息
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    res.status(500).json({ message: '获取用户信息失败', error: error.message });
  }
});

// 更新个人信息
router.put('/me', authenticate, async (req, res) => {
  try {
    const { name, email, phone, avatar } = req.body;
    await req.user.update({ name, email, phone, avatar });
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    res.json({ message: '更新成功', user });
  } catch (error) {
    res.status(500).json({ message: '更新失败', error: error.message });
  }
});

// 修改密码
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: '请提供旧密码和新密码' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: '新密码至少6位' });
    }

    const user = await User.findByPk(req.user.id);
    const isMatch = await user.comparePassword(oldPassword);
    
    if (!isMatch) {
      return res.status(400).json({ message: '旧密码错误' });
    }

    await user.update({ password: newPassword });

    res.json({ message: '密码修改成功' });
  } catch (error) {
    res.status(500).json({ message: '修改密码失败', error: error.message });
  }
});

// 创建用户（管理员）- 可以创建包括管理员在内的所有角色
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { username, password, name, role, studentId, email, phone } = req.body;

    if (!username || !password || !name || !role) {
      return res.status(400).json({ message: '请填写必填字段：用户名、密码、姓名、角色' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: '密码至少6位' });
    }

    if (!['student', 'teacher', 'admin'].includes(role)) {
      return res.status(400).json({ message: '角色无效，只能是 student、teacher 或 admin' });
    }

    // 安全措施：只有超级管理员才能创建管理员账户
    if (role === 'admin') {
      // 可以在这里添加额外的验证，比如检查是否是超级管理员
      console.warn(`管理员 ${req.user.username} 正在创建新的管理员账户: ${username}`);
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

    // 处理空值
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

    res.status(201).json({
      message: '创建成功',
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
    
    res.status(500).json({ message: '创建用户失败', error: error.message });
  }
});

// 获取所有用户（管理员）
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { role, page = 1, limit = 10 } = req.query;
    
    // 验证并限制分页参数
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    
    const where = role ? { role } : {};
    
    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      users,
      totalPages: Math.ceil(count / limitNum),
      currentPage: pageNum,
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: '获取用户列表失败', error: error.message });
  }
});

// 批量删除用户（管理员）（路由顺序：必须在 /:id 之前，避免路由冲突）
router.delete('/batch', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: '请提供要删除的用户ID数组' });
    }

    // 限制批量操作数量
    if (ids.length > 100) {
      return res.status(400).json({ message: '单次最多删除100个用户' });
    }

    const users = await User.findAll({
      where: { id: { [Op.in]: ids } }
    });

    let deletedCount = 0;
    for (const user of users) {
      // 防止删除自己
      if (user.id === req.user.id) {
        continue;
      }
      await user.destroy();
      deletedCount++;
    }

    res.json({ 
      message: `成功删除${deletedCount}个用户`,
      deleted: deletedCount,
      total: ids.length
    });
  } catch (error) {
    res.status(500).json({ message: '批量删除失败', error: error.message });
  }
});

// 删除用户（管理员）
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 防止删除自己
    if (user.id === req.user.id) {
      return res.status(400).json({ message: '不能删除自己的账户' });
    }
    
    await user.destroy();
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ message: '删除失败', error: error.message });
  }
});

// 导出用户模板（管理员）
router.get('/export/template', authenticate, authorize('admin'), async (req, res) => {
  try {
    const templateData = [
      {
        '用户名': 'student001',
        '姓名': '张三',
        '学号': '2021001',
        '角色': 'student（学生）/teacher（教师）/admin（管理员）',
        '邮箱': 'student001@example.com',
        '手机号': '13800138000',
        '密码': '123456（默认密码）'
      },
      {
        '用户名': 'teacher001',
        '姓名': '李老师',
        '学号': '',
        '角色': 'teacher',
        '邮箱': 'teacher001@example.com',
        '手机号': '13900139000',
        '密码': '123456'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '用户模板');

    const colWidths = [
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 30 }, 
      { wch: 25 }, { wch: 15 }, { wch: 15 }
    ];
    worksheet['!cols'] = colWidths;

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const filename = `用户导入模板_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(excelBuffer);
  } catch (error) {
    res.status(500).json({ message: '导出模板失败', error: error.message });
  }
});

// 导出用户列表（管理员）
router.get('/export', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { role } = req.query;
    const where = role ? { role } : {};

    const users = await User.findAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });

    const roleMap = {
      'student': '学生',
      'teacher': '教师',
      'admin': '管理员'
    };

    const data = users.map(u => ({
      '用户名': u.username,
      '姓名': u.name,
      '学号': u.studentId || '',
      '角色': roleMap[u.role] || u.role,
      '邮箱': u.email || '',
      '手机号': u.phone || '',
      '创建时间': u.createdAt ? new Date(u.createdAt).toLocaleString('zh-CN') : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '用户列表');

    const colWidths = [
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, 
      { wch: 25 }, { wch: 15 }, { wch: 20 }
    ];
    worksheet['!cols'] = colWidths;

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const filename = `用户列表_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(excelBuffer);
  } catch (error) {
    res.status(500).json({ message: '导出失败', error: error.message });
  }
});

// 批量导入用户（管理员）
router.post('/import', authenticate, authorize('admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请上传Excel文件' });
    }

    // 文件大小限制（5MB）
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ message: '文件大小不能超过5MB' });
    }

    // 文件类型验证
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ message: '只支持Excel文件（.xlsx, .xls）' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // 限制导入数量
    if (data.length > 500) {
      return res.status(400).json({ message: '单次最多导入500条数据' });
    }

    const roleMap = {
      'student': 'student',
      '学生': 'student',
      'teacher': 'teacher',
      '教师': 'teacher',
      'admin': 'admin',
      '管理员': 'admin'
    };

    const results = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const username = row['用户名'];
        const name = row['姓名'];
        const role = roleMap[row['角色']] || row['角色'] || 'student';
        const password = row['密码'] || '123456';

        if (!username || !name) {
          results.errors.push(`第${i + 2}行：用户名和姓名为必填项`);
          results.failed++;
          continue;
        }

        if (!['student', 'teacher', 'admin'].includes(role)) {
          results.errors.push(`第${i + 2}行：角色无效`);
          results.failed++;
          continue;
        }

        // 安全措施：禁止通过导入创建管理员账户（管理员账户只能由现有管理员手动创建）
        if (role === 'admin') {
          results.errors.push(`第${i + 2}行：不允许通过导入创建管理员账户，请通过用户管理页面手动创建`);
          results.failed++;
          continue;
        }

        // 检查用户名是否已存在
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
          results.errors.push(`第${i + 2}行：用户名${username}已存在`);
          results.failed++;
          continue;
        }

        await User.create({
          username,
          name,
          password,
          role,
          studentId: row['学号'] || null,
          email: row['邮箱'] || null,
          phone: row['手机号'] || null
        });

        results.success++;
      } catch (error) {
        results.errors.push(`第${i + 2}行：${error.message}`);
        results.failed++;
      }
    }

    res.json({
      message: `导入完成：成功${results.success}条，失败${results.failed}条`,
      results
    });
  } catch (error) {
    res.status(500).json({ message: '导入失败', error: error.message });
  }
});

module.exports = router;

