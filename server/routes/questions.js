const express = require('express');
const router = express.Router();
const multer = require('multer');
const { Op } = require('sequelize');
const Question = require('../models/Question');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const XLSX = require('xlsx');

// 配置multer用于文件上传
const upload = multer({ storage: multer.memoryStorage() });

// 获取题目列表
router.get('/', authenticate, async (req, res) => {
  try {
    const { type, subject, chapter, difficulty, page = 1, limit = 10 } = req.query;
    
    // 验证并限制分页参数
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    
    const where = {};

    if (type) where.type = type;
    if (subject) where.subject = subject;
    if (chapter) where.chapter = chapter;
    if (difficulty) where.difficulty = difficulty;

    const { count, rows: questions } = await Question.findAndCountAll({
      where,
      include: [{ model: User, as: 'creator', attributes: ['name'] }],
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      questions,
      totalPages: Math.ceil(count / limitNum),
      currentPage: pageNum,
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: '获取题目列表失败', error: error.message });
  }
});

// 导出模板（路由顺序：必须在 /:id 之前，避免路由冲突）
router.get('/export/template', authenticate, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const templateData = [
      {
        '题型': 'single（单选）',
        '科目': '计算机基础',
        '章节': '第一章',
        '难度': 'easy（简单）',
        '题目内容': '以下哪个不是编程语言？',
        '选项A': 'Java',
        '选项B': 'Python',
        '选项C': 'MySQL',
        '选项D': 'C++',
        '正确答案': 'C（单个答案）',
        '分值': '5',
        '解析': 'MySQL是数据库管理系统，不是编程语言。'
      },
      {
        '题型': 'multiple（多选）',
        '科目': '数据结构',
        '章节': '第二章',
        '难度': 'medium（中等）',
        '题目内容': '以下哪些是线性数据结构？',
        '选项A': '数组',
        '选项B': '链表',
        '选项C': '树',
        '选项D': '栈',
        '正确答案': 'A,B,D（多个答案用逗号分隔）',
        '分值': '10',
        '解析': '数组、链表、栈都是线性结构，树是非线性结构。'
      },
      {
        '题型': 'judge（判断）',
        '科目': '计算机基础',
        '章节': '第一章',
        '难度': 'easy',
        '题目内容': 'CPU是计算机的核心部件。',
        '选项A': '',
        '选项B': '',
        '选项C': '',
        '选项D': '',
        '正确答案': 'true（正确）或false（错误）',
        '分值': '5',
        '解析': 'CPU确实是计算机的核心部件。'
      },
      {
        '题型': 'fill（填空）',
        '科目': '数据结构',
        '章节': '第二章',
        '难度': 'medium',
        '题目内容': '栈的特点是___（后进先出）。',
        '选项A': '',
        '选项B': '',
        '选项C': '',
        '选项D': '',
        '正确答案': '后进先出',
        '分值': '5',
        '解析': '栈是一种后进先出（LIFO）的数据结构。'
      },
      {
        '题型': 'essay（简答）',
        '科目': '计算机基础',
        '章节': '第一章',
        '难度': 'hard',
        '题目内容': '请简述计算机的工作原理。',
        '选项A': '',
        '选项B': '',
        '选项C': '',
        '选项D': '',
        '正确答案': '（主观题，答案示例）',
        '分值': '20',
        '解析': '计算机工作原理包括输入、处理、输出等步骤。'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '题目模板');

    const colWidths = [
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 40 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 30 },
      { wch: 10 }, { wch: 50 }
    ];
    worksheet['!cols'] = colWidths;

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const filename = `题目导入模板_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(excelBuffer);
  } catch (error) {
    res.status(500).json({ message: '导出模板失败', error: error.message });
  }
});

// 导出题目（路由顺序：必须在 /:id 之前，避免路由冲突）
router.get('/export', authenticate, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { type, subject, chapter, difficulty } = req.query;
    const where = {};

    // 教师只能导出自己创建的题目，管理员可以导出所有
    if (req.user.role === 'teacher') {
      where.createdBy = req.user.id;
    }

    if (type) where.type = type;
    if (subject) where.subject = subject;
    if (chapter) where.chapter = chapter;
    if (difficulty) where.difficulty = difficulty;

    const questions = await Question.findAll({
      where,
      include: [{ model: User, as: 'creator', attributes: ['name'] }],
      order: [['createdAt', 'DESC']]
    });

    const typeMap = {
      'single': '单选',
      'multiple': '多选',
      'judge': '判断',
      'fill': '填空',
      'essay': '简答'
    };

    const difficultyMap = {
      'easy': '简单',
      'medium': '中等',
      'hard': '困难'
    };

    const data = questions.map(q => {
      const options = q.options || [];
      const correctAnswer = typeof q.correctAnswer === 'string' 
        ? q.correctAnswer 
        : JSON.stringify(q.correctAnswer);

      return {
        '题型': typeMap[q.type] || q.type,
        '科目': q.subject,
        '章节': q.chapter,
        '难度': difficultyMap[q.difficulty] || q.difficulty,
        '题目内容': q.content,
        '选项A': options[0]?.content || '',
        '选项B': options[1]?.content || '',
        '选项C': options[2]?.content || '',
        '选项D': options[3]?.content || '',
        '正确答案': correctAnswer,
        '分值': q.score,
        '解析': q.explanation || '',
        '创建人': q.creator?.name || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '题目列表');

    const colWidths = [
      { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 40 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 30 },
      { wch: 10 }, { wch: 50 }, { wch: 10 }
    ];
    worksheet['!cols'] = colWidths;

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const filename = `题目列表_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(excelBuffer);
  } catch (error) {
    res.status(500).json({ message: '导出失败', error: error.message });
  }
});

// 获取单个题目
router.get('/:id', authenticate, async (req, res) => {
  try {
    const question = await Question.findByPk(req.params.id, {
      include: [{ model: User, as: 'creator', attributes: ['name'] }]
    });
    
    if (!question) {
      return res.status(404).json({ message: '题目不存在' });
    }

    res.json({ question });
  } catch (error) {
    res.status(500).json({ message: '获取题目失败', error: error.message });
  }
});

// 创建题目（教师和管理员）
router.post('/', authenticate, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { type, subject, chapter, difficulty, content, options, correctAnswer, score, explanation } = req.body;

    if (!type || !subject || !chapter || !content || !correctAnswer) {
      return res.status(400).json({ message: '请填写必填字段' });
    }

    // 验证题型
    if (!['single', 'multiple', 'judge', 'fill', 'essay'].includes(type)) {
      return res.status(400).json({ message: '题型无效' });
    }

    // 验证分数
    const scoreValue = parseInt(score) || 5;
    if (scoreValue <= 0) {
      return res.status(400).json({ message: '分数必须大于0' });
    }

    const question = await Question.create({
      type,
      subject,
      chapter,
      difficulty: difficulty || 'medium',
      content,
      options: options || [],
      correctAnswer,
      score: scoreValue,
      explanation: explanation || '',
      createdBy: req.user.id
    });

    res.status(201).json({ message: '创建成功', question });
  } catch (error) {
    res.status(500).json({ message: '创建题目失败', error: error.message });
  }
});

// 更新题目（教师和管理员）
router.put('/:id', authenticate, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const question = await Question.findByPk(req.params.id);
    
    if (!question) {
      return res.status(404).json({ message: '题目不存在' });
    }

    // 检查权限：只能修改自己创建的题目，除非是管理员
    if (question.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权修改此题目' });
    }

    const { type, subject, chapter, difficulty, content, options, correctAnswer, score, explanation } = req.body;

    await question.update({
      type: type || question.type,
      subject: subject || question.subject,
      chapter: chapter || question.chapter,
      difficulty: difficulty || question.difficulty,
      content: content || question.content,
      options: options !== undefined ? options : question.options,
      correctAnswer: correctAnswer !== undefined ? correctAnswer : question.correctAnswer,
      score: score || question.score,
      explanation: explanation !== undefined ? explanation : question.explanation
    });

    res.json({ message: '更新成功', question });
  } catch (error) {
    res.status(500).json({ message: '更新题目失败', error: error.message });
  }
});

// 获取题目分类统计
router.get('/stats/categories', authenticate, async (req, res) => {
  try {
    const { Sequelize } = require('sequelize');
    const sequelize = require('../config/database');

    const subjects = await Question.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('subject')), 'subject']],
      raw: true
    }).then(results => results.map(r => r.subject));

    const chapters = await Question.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('chapter')), 'chapter']],
      raw: true
    }).then(results => results.map(r => r.chapter));

    const types = await Question.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('type')), 'type']],
      raw: true
    }).then(results => results.map(r => r.type));

    const difficulties = await Question.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('difficulty')), 'difficulty']],
      raw: true
    }).then(results => results.map(r => r.difficulty));

    res.json({ subjects, chapters, types, difficulties });
  } catch (error) {
    res.status(500).json({ message: '获取统计信息失败', error: error.message });
  }
});


// 批量导入题目（教师和管理员）
router.post('/import', authenticate, authorize('teacher', 'admin'), upload.single('file'), async (req, res) => {
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

    const typeMap = {
      'single': 'single',
      '单选': 'single',
      'single（单选）': 'single',
      'single(单选)': 'single',
      'multiple': 'multiple',
      '多选': 'multiple',
      'multiple（多选）': 'multiple',
      'multiple(多选)': 'multiple',
      'judge': 'judge',
      '判断': 'judge',
      'judge（判断）': 'judge',
      'judge(判断)': 'judge',
      'fill': 'fill',
      '填空': 'fill',
      'fill（填空）': 'fill',
      'fill(填空)': 'fill',
      'essay': 'essay',
      '简答': 'essay',
      'essay（简答）': 'essay',
      'essay(简答)': 'essay'
    };

    const difficultyMap = {
      'easy': 'easy',
      '简单': 'easy',
      'easy（简单）': 'easy',
      'easy(简单)': 'easy',
      'medium': 'medium',
      '中等': 'medium',
      'medium（中等）': 'medium',
      'medium(中等)': 'medium',
      'hard': 'hard',
      '困难': 'hard',
      'hard（困难）': 'hard',
      'hard(困难)': 'hard'
    };

    const results = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        // 处理题型：支持多种格式（single、单选、single（单选）等）
        const typeValue = row['题型'] ? String(row['题型']).trim() : '';
        let finalType = typeMap[typeValue] || typeValue;

        // 如果无法匹配，尝试提取括号前的英文部分
        if (!['single', 'multiple', 'judge', 'fill', 'essay'].includes(finalType)) {
          const match = typeValue.match(/^([a-z]+)/i);
          if (match) {
            const extractedType = match[1].toLowerCase();
            finalType = typeMap[extractedType] || extractedType;
          }
        }

        if (!finalType || !['single', 'multiple', 'judge', 'fill', 'essay'].includes(finalType)) {
          results.errors.push(`第${i + 2}行：题型无效（当前值："${typeValue}"），支持的题型：single/单选、multiple/多选、judge/判断、fill/填空、essay/简答`);
          results.failed++;
          continue;
        }

        const difficulty = difficultyMap[row['难度']] || row['难度'] || 'medium';

        // 构建选项（仅单选和多选需要）
        const options = [];
        if (finalType === 'single' || finalType === 'multiple') {
          ['A', 'B', 'C', 'D'].forEach(label => {
            const content = row[`选项${label}`];
            if (content) {
              options.push({ label, content: String(content) });
            }
          });
        }

        // 处理正确答案格式
        let correctAnswer = row['正确答案'] || '';
        if (finalType === 'judge') {
          correctAnswer = String(correctAnswer).toLowerCase() === 'true' || String(correctAnswer) === '正确' ? 'true' : 'false';
        } else if (finalType === 'multiple') {
          correctAnswer = String(correctAnswer).split(',').map(s => s.trim()).join(',');
        }

        await Question.create({
          type: finalType,
          subject: row['科目'] || '',
          chapter: row['章节'] || '',
          difficulty,
          content: row['题目内容'] || '',
          options,
          correctAnswer,
          score: parseInt(row['分值']) || 5,
          explanation: row['解析'] || '',
          createdBy: req.user.id
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

// 批量删除题目（教师和管理员）（路由顺序：必须在 /:id 之前，避免路由冲突）
router.delete('/batch', authenticate, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: '请提供要删除的题目ID数组' });
    }

    // 限制批量操作数量
    if (ids.length > 100) {
      return res.status(400).json({ message: '单次最多删除100道题目' });
    }

    const questions = await Question.findAll({
      where: { id: { [Op.in]: ids } }
    });

    let deletedCount = 0;
    for (const question of questions) {
      // 检查权限：只能删除自己创建的题目，除非是管理员
      if (question.createdBy === req.user.id || req.user.role === 'admin') {
        await question.destroy();
        deletedCount++;
      }
    }

    res.json({ 
      message: `成功删除${deletedCount}道题目`,
      deleted: deletedCount,
      total: ids.length
    });
  } catch (error) {
    res.status(500).json({ message: '批量删除失败', error: error.message });
  }
});

// 删除题目（教师和管理员）
router.delete('/:id', authenticate, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const question = await Question.findByPk(req.params.id);
    
    if (!question) {
      return res.status(404).json({ message: '题目不存在' });
    }

    // 检查权限
    if (question.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权删除此题目' });
    }

    await question.destroy();
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ message: '删除题目失败', error: error.message });
  }
});

// 获取每题正确率统计（教师和管理员）
router.get('/stats/accuracy', authenticate, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { questionId } = req.query;
    const Exam = require('../models/Exam');
    const { Sequelize } = require('sequelize');
    const sequelize = require('../config/database');

    let where = {};
    if (questionId) {
      where.id = parseInt(questionId);
    }

    // 教师只能查看自己创建的题目
    if (req.user.role === 'teacher') {
      where.createdBy = req.user.id;
    }

    const questions = await Question.findAll({ where });

    const stats = await Promise.all(questions.map(async (question) => {
      // 查找所有包含该题目的考试
      const exams = await Exam.findAll({
        where: {
          status: { [Op.in]: ['submitted', 'graded'] }
        },
        attributes: ['answers']
      });

      let totalCount = 0;
      let correctCount = 0;

      exams.forEach(exam => {
        const answers = exam.answers || [];
        const answerItem = answers.find(a => {
          const qId = typeof a.questionId === 'object' ? a.questionId.id : a.questionId;
          return qId === question.id;
        });

        if (answerItem) {
          totalCount++;
          if (answerItem.isCorrect === true) {
            correctCount++;
          }
        }
      });

      const accuracy = totalCount > 0 ? ((correctCount / totalCount) * 100).toFixed(2) : 0;

      return {
        questionId: question.id,
        content: question.content,
        type: question.type,
        subject: question.subject,
        totalCount,
        correctCount,
        wrongCount: totalCount - correctCount,
        accuracy: parseFloat(accuracy)
      };
    }));

    res.json({ stats });
  } catch (error) {
    res.status(500).json({ message: '获取正确率统计失败', error: error.message });
  }
});

module.exports = router;
