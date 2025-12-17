const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Paper = require('../models/Paper');
const Question = require('../models/Question');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');

// 获取试卷列表
router.get('/', authenticate, async (req, res) => {
  try {
    const { subject, status, page = 1, limit = 10 } = req.query;
    const where = {};

    if (subject) where.subject = subject;
    if (status) where.status = status;

    // 学生只能看到已发布的试卷
    if (req.user.role === 'student') {
      where.status = 'published';
    }

    const { count, rows: papers } = await Paper.findAndCountAll({
      where,
      include: [{ model: User, as: 'creator', attributes: ['name'] }],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      papers,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: '获取试卷列表失败', error: error.message });
  }
});

// 获取单个试卷
router.get('/:id', authenticate, async (req, res) => {
  try {
    const paper = await Paper.findByPk(req.params.id, {
      include: [{ model: User, as: 'creator', attributes: ['name'] }]
    });

    if (!paper) {
      return res.status(404).json({ message: '试卷不存在' });
    }

    // 如果试卷中有题目ID，需要加载题目详情
    if (paper.questions && Array.isArray(paper.questions)) {
      const questionIds = paper.questions.map(q => q.questionId).filter(Boolean);
      if (questionIds.length > 0) {
        const questions = await Question.findAll({
          where: { id: { [Op.in]: questionIds } }
        });
        const questionMap = {};
        questions.forEach(q => { questionMap[q.id] = q; });
        
        paper.questions = paper.questions.map(q => {
          const question = questionMap[q.questionId];
          if (question) {
            const qObj = question.toJSON();
            // 学生查看试卷时，不显示正确答案
            if (req.user.role === 'student' && paper.status === 'published') {
              delete qObj.correctAnswer;
            }
            return { ...q, questionId: qObj };
          }
          return q;
        });
      }
    }

    res.json({ paper });
  } catch (error) {
    res.status(500).json({ message: '获取试卷失败', error: error.message });
  }
});

// 创建试卷（教师和管理员）
router.post('/', authenticate, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { title, description, subject, totalScore, duration, questions } = req.body;

    if (!title || !subject || !totalScore || !duration || !questions || questions.length === 0) {
      return res.status(400).json({ message: '请填写必填字段' });
    }

    // 验证题目是否存在并检查重复
    const questionIds = questions.map(q => {
      const id = typeof q.questionId === 'object' ? (q.questionId.id || q.questionId._id) : q.questionId;
      return parseInt(id);
    }).filter(Boolean);
    
    const uniqueIds = [...new Set(questionIds)];
    if (uniqueIds.length !== questionIds.length) {
      return res.status(400).json({ message: '试卷中不能包含重复的题目' });
    }
    
    const existingQuestions = await Question.findAll({
      where: { id: { [Op.in]: uniqueIds } }
    });

    if (existingQuestions.length !== uniqueIds.length) {
      return res.status(400).json({ message: '部分题目不存在' });
    }

    const paper = await Paper.create({
      title,
      description: description || '',
      subject,
      totalScore,
      duration,
      questions: questions.map((q, index) => {
        const questionId = typeof q.questionId === 'object' ? (q.questionId.id || q.questionId._id) : q.questionId;
        return {
          questionId: parseInt(questionId),
          score: q.score || 5,
          order: index + 1
        };
      }),
      createdBy: req.user.id,
      status: 'draft',
      allowRetake: req.body.allowRetake !== undefined ? req.body.allowRetake : true
    });
    const questionDetails = await Question.findAll({
      where: { id: { [Op.in]: questionIds } }
    });
    const questionMap = {};
    questionDetails.forEach(q => { questionMap[q.id] = q.toJSON(); });
    
    const paperData = paper.toJSON();
    paperData.questions = paperData.questions.map(q => ({
      ...q,
      questionId: questionMap[q.questionId]
    }));

    res.status(201).json({ message: '创建成功', paper: paperData });
  } catch (error) {
    res.status(500).json({ message: '创建试卷失败', error: error.message });
  }
});

// 自动组卷
router.post('/auto-generate', authenticate, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { title, description, subject, totalScore, duration, rules } = req.body;

    if (!title || !subject || !totalScore || !duration || !rules || rules.length === 0) {
      return res.status(400).json({ message: '请填写必填字段和组卷规则' });
    }

    const questions = [];
    let currentScore = 0;

    // 按规则抽题
    for (const rule of rules) {
      const where = {
        subject,
        type: rule.type
      };
      if (rule.difficulty) where.difficulty = rule.difficulty;
      if (rule.chapter) where.chapter = rule.chapter;

      const availableQuestions = await Question.findAll({ where });
      
      // 随机选择
      const shuffled = [...availableQuestions].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, rule.count);

      if (selected.length < rule.count) {
        return res.status(400).json({ 
          message: `${rule.type}类型题目不足，需要${rule.count}道，只有${selected.length}道` 
        });
      }

      selected.forEach(q => {
        const score = rule.score || 5;
        questions.push({
          questionId: q.id,
          score,
          order: questions.length + 1
        });
        currentScore += score;
      });
    }

    if (Math.abs(currentScore - totalScore) > 0.01) {
      return res.status(400).json({ 
        message: `题目总分(${currentScore})与试卷总分(${totalScore})不匹配` 
      });
    }

    const paper = await Paper.create({
      title,
      description: description || '',
      subject,
      totalScore,
      duration,
      questions,
      createdBy: req.user.id,
      status: 'draft',
      allowRetake: req.body.allowRetake !== undefined ? req.body.allowRetake : true
    });

    // 加载题目详情
    const questionIds = questions.map(q => q.questionId);
    const questionDetails = await Question.findAll({
      where: { id: { [Op.in]: questionIds } }
    });
    const questionMap = {};
    questionDetails.forEach(q => { questionMap[q.id] = q.toJSON(); });
    
    const paperData = paper.toJSON();
    paperData.questions = paperData.questions.map(q => ({
      ...q,
      questionId: questionMap[q.questionId]
    }));

    res.status(201).json({ message: '自动组卷成功', paper: paperData });
  } catch (error) {
    res.status(500).json({ message: '自动组卷失败', error: error.message });
  }
});

// 更新试卷
router.put('/:id', authenticate, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const paper = await Paper.findByPk(req.params.id);
    
    if (!paper) {
      return res.status(404).json({ message: '试卷不存在' });
    }

    // 检查权限
    if (paper.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权修改此试卷' });
    }

    const { title, description, subject, totalScore, duration, questions, status, allowRetake } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (subject) updateData.subject = subject;
    if (totalScore) updateData.totalScore = totalScore;
    if (duration) updateData.duration = duration;
    if (questions) {
      // 验证题目是否存在并检查重复
      const questionIds = questions.map(q => {
        const id = typeof q.questionId === 'object' ? (q.questionId.id || q.questionId._id) : q.questionId;
        return parseInt(id);
      }).filter(Boolean);
      
      const uniqueIds = [...new Set(questionIds)];
      if (uniqueIds.length !== questionIds.length) {
        return res.status(400).json({ message: '试卷中不能包含重复的题目' });
      }
      
      const existingQuestions = await Question.findAll({
        where: { id: { [Op.in]: uniqueIds } }
      });

      if (existingQuestions.length !== uniqueIds.length) {
        return res.status(400).json({ message: '部分题目不存在' });
      }
      
      updateData.questions = questions.map((q, index) => {
        const questionId = typeof q.questionId === 'object' ? (q.questionId.id || q.questionId._id) : q.questionId;
        return {
          questionId: parseInt(questionId),
          score: q.score || 5,
          order: index + 1
        };
      });
    }
    if (status) {
      updateData.status = status;
      if (status === 'published' && !paper.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }
    if (allowRetake !== undefined) {
      updateData.allowRetake = allowRetake;
    }

    await paper.update(updateData);
    const questionIds = (paper.questions || []).map(q => q.questionId).filter(Boolean);
    let questionMap = {};
    if (questionIds.length > 0) {
      const questionDetails = await Question.findAll({
        where: { id: { [Op.in]: questionIds } }
      });
      questionDetails.forEach(q => { questionMap[q.id] = q.toJSON(); });
    }

    const paperData = paper.toJSON();
    paperData.questions = (paperData.questions || []).map(q => ({
      ...q,
      questionId: questionMap[q.questionId]
    }));

    res.json({ message: '更新成功', paper: paperData });
  } catch (error) {
    res.status(500).json({ message: '更新试卷失败', error: error.message });
  }
});

// 发布/取消发布试卷
router.put('/:id/publish', authenticate, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const paper = await Paper.findByPk(req.params.id);
    
    if (!paper) {
      return res.status(404).json({ message: '试卷不存在' });
    }

    if (paper.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权操作此试卷' });
    }

    const newStatus = paper.status === 'published' ? 'draft' : 'published';
    const updateData = { status: newStatus };
    if (newStatus === 'published' && !paper.publishedAt) {
      updateData.publishedAt = new Date();
    }

    await paper.update(updateData);

    res.json({ message: newStatus === 'published' ? '发布成功' : '取消发布成功', paper });
  } catch (error) {
    res.status(500).json({ message: '操作失败', error: error.message });
  }
});

// 删除试卷
router.delete('/:id', authenticate, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const paper = await Paper.findByPk(req.params.id);
    
    if (!paper) {
      return res.status(404).json({ message: '试卷不存在' });
    }

    if (paper.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权删除此试卷' });
    }

    await paper.destroy();
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ message: '删除试卷失败', error: error.message });
  }
});

module.exports = router;

