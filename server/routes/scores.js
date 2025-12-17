const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Exam = require('../models/Exam');
const Paper = require('../models/Paper');
const Question = require('../models/Question');
const User = require('../models/User');
const XLSX = require('xlsx');
const { authenticate, authorize } = require('../middleware/auth');

// 获取成绩列表
router.get('/', authenticate, async (req, res) => {
  try {
    const { studentId, paperId, status, page = 1, limit = 10 } = req.query;
    const where = {};

    // 学生只能查看自己的成绩
    if (req.user.role === 'student') {
      where.studentId = req.user.id;
    } else if (studentId) {
      where.studentId = parseInt(studentId);
    }

    if (paperId) where.paperId = parseInt(paperId);
    if (status) where.status = status;

    const { count, rows: exams } = await Exam.findAndCountAll({
      where,
      include: [
        { model: Paper, as: 'paper', attributes: ['title', 'subject', 'duration', 'totalScore'] },
        { model: User, as: 'student', attributes: ['name', 'studentId'] }
      ],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['submitTime', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json({
      exams,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: '获取成绩列表失败', error: error.message });
  }
});

// 获取成绩统计
router.get('/stats', authenticate, async (req, res) => {
  try {
    const { paperId, subject } = req.query;
    const where = { status: { [Op.in]: ['submitted', 'graded'] } };

    if (paperId) {
      where.paperId = parseInt(paperId);
    }

    // 学生只能查看自己的统计
    if (req.user.role === 'student') {
      where.studentId = req.user.id;
    }

    const exams = await Exam.findAll({
      where,
      include: [{ model: Paper, as: 'paper', attributes: ['title', 'subject', 'totalScore'] }]
    });

    let filteredExams = exams;
    if (subject) {
      filteredExams = exams.filter(e => e.paper && e.paper.subject === subject);
    }

    // 计算统计信息
    const stats = {
      total: filteredExams.length,
      average: 0,
      highest: 0,
      lowest: 0,
      passCount: 0,
      failCount: 0,
      byPaper: {}
    };

    if (filteredExams.length > 0) {
      const scores = filteredExams.map(e => parseFloat(e.totalScore) || 0);
      stats.average = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
      stats.highest = Math.max(...scores);
      stats.lowest = Math.min(...scores);

      // 按试卷分组统计
      filteredExams.forEach(exam => {
        if (!exam.paper) return;
        const paperTitle = exam.paper.title;
        if (!stats.byPaper[paperTitle]) {
          stats.byPaper[paperTitle] = {
            count: 0,
            totalScore: 0,
            average: 0,
            highest: 0,
            lowest: 0
          };
        }
        const score = parseFloat(exam.totalScore) || 0;
        stats.byPaper[paperTitle].count++;
        stats.byPaper[paperTitle].totalScore += score;
        stats.byPaper[paperTitle].highest = Math.max(
          stats.byPaper[paperTitle].highest,
          score
        );
        stats.byPaper[paperTitle].lowest = Math.min(
          stats.byPaper[paperTitle].lowest || score,
          score
        );
      });

      // 计算各试卷平均分
      Object.keys(stats.byPaper).forEach(paper => {
        const p = stats.byPaper[paper];
        p.average = (p.totalScore / p.count).toFixed(2);
      });

      // 计算及格数（60%为及格线）- 为每个考试单独计算及格线
      let passCount = 0;
      filteredExams.forEach(exam => {
        if (!exam.paper || !exam.paper.totalScore) return;
        const passScore = exam.paper.totalScore * 0.6;
        const score = parseFloat(exam.totalScore) || 0;
        if (score >= passScore) {
          passCount++;
        }
      });
      stats.passCount = passCount;
      stats.failCount = stats.total - passCount;
    }

    res.json({ stats });
  } catch (error) {
    res.status(500).json({ message: '获取统计信息失败', error: error.message });
  }
});

// 获取错题回顾（学生）
router.get('/wrong-questions', authenticate, authorize('student'), async (req, res) => {
  try {
    const { subject, page = 1, limit = 10 } = req.query;
    
    const exams = await Exam.findAll({
      where: {
        studentId: req.user.id,
        status: { [Op.in]: ['submitted', 'graded'] }
      },
      include: [{ model: Paper, as: 'paper', attributes: ['title', 'subject', 'questions'] }]
    });

    const wrongQuestions = [];
    const questionIds = new Set();

    // 收集所有可能错题的题目ID
    exams.forEach(exam => {
      if (subject && exam.paper && exam.paper.subject !== subject) {
        return;
      }

      if (exam.answers && Array.isArray(exam.answers)) {
        exam.answers.forEach(answer => {
          if (answer.questionId) {
            questionIds.add(answer.questionId);
          }
        });
      }
    });

    // 批量加载题目
    const questions = await Question.findAll({
      where: { id: { [Op.in]: Array.from(questionIds) } }
    });
    const questionMap = {};
    questions.forEach(q => { questionMap[q.id] = q.toJSON(); });

    // 构建错题列表
    exams.forEach(exam => {
      if (subject && exam.paper && exam.paper.subject !== subject) {
        return;
      }

      // 获取试卷中每题的分数
      let paperQuestions = exam.paper.questions || [];
      if (typeof paperQuestions === 'string') {
        try {
          paperQuestions = JSON.parse(paperQuestions);
        } catch (e) {
          paperQuestions = [];
        }
      }
      const paperQuestionMap = {};
      paperQuestions.forEach(q => {
        const qId = parseInt(q.questionId);
        if (qId) {
          paperQuestionMap[qId] = q;
        }
      });

      if (exam.answers && Array.isArray(exam.answers)) {
        exam.answers.forEach(answer => {
          // 获取题目ID
          let qId = null;
          if (typeof answer.questionId === 'object' && answer.questionId !== null) {
            qId = parseInt(answer.questionId.id || answer.questionId._id);
          } else {
            qId = parseInt(answer.questionId);
          }
          
          if (!qId || isNaN(qId)) {
            return;
          }

          const question = questionMap[qId];
          if (!question) {
            return;
          }

          // 排除主观题（essay类型）
          if (question.type === 'essay') {
            return;
          }

          // 获取该题在试卷中的满分
          const paperQuestion = paperQuestionMap[qId];
          const maxScore = paperQuestion ? paperQuestion.score : (question.score || 10);
          const actualScore = parseFloat(answer.score) || 0;

          // 判断是否为错题：
          // 1. 如果已经批阅（有分数），根据分数判断：分数小于满分才算错题
          // 2. 如果未批阅，根据isCorrect判断：isCorrect为false才算错题
          let isWrong = false;
          
          if (actualScore > 0 || answer.teacherComment) {
            // 已批阅：分数小于满分才算错题
            isWrong = actualScore < maxScore;
          } else {
            // 未批阅：根据isCorrect判断
            isWrong = answer.isCorrect === false;
          }

          if (isWrong) {
            wrongQuestions.push({
              examId: exam.id,
              paperTitle: exam.paper?.title,
              question: question,
              myAnswer: answer.answer,
              correctAnswer: question.correctAnswer,
              explanation: question.explanation,
              examDate: exam.submitTime || exam.createdAt,
              score: actualScore,
              maxScore: maxScore
            });
          }
        });
      }
    });

    // 分页
    const start = (parseInt(page) - 1) * parseInt(limit);
    const end = start + parseInt(limit);
    const paginated = wrongQuestions.slice(start, end);

    res.json({
      questions: paginated,
      totalPages: Math.ceil(wrongQuestions.length / limit),
      currentPage: parseInt(page),
      total: wrongQuestions.length
    });
  } catch (error) {
    res.status(500).json({ message: '获取错题失败', error: error.message });
  }
});

// 导出成绩Excel（教师和管理员）
router.get('/export', authenticate, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { paperId } = req.query;
    const where = { status: { [Op.in]: ['submitted', 'graded'] } };

    if (paperId) {
      where.paperId = parseInt(paperId);
    }

    const exams = await Exam.findAll({
      where,
      include: [
        { model: Paper, as: 'paper', attributes: ['title', 'subject', 'totalScore'] },
        { model: User, as: 'student', attributes: ['name', 'studentId'] }
      ],
      order: [['submitTime', 'DESC']]
    });

    // 准备Excel数据
    const data = exams.map(exam => ({
      '学号': exam.student?.studentId || '',
      '姓名': exam.student?.name || '',
      '试卷名称': exam.paper?.title || '',
      '科目': exam.paper?.subject || '',
      '总分': exam.paper?.totalScore || 0,
      '得分': exam.totalScore,
      '得分率': exam.paper?.totalScore 
        ? ((parseFloat(exam.totalScore) / exam.paper.totalScore) * 100).toFixed(2) + '%'
        : '0%',
      '提交时间': exam.submitTime 
        ? new Date(exam.submitTime).toLocaleString('zh-CN')
        : '',
      '状态': exam.status === 'graded' ? '已批阅' : '已提交'
    }));

    // 创建工作簿
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '成绩单');

    // 设置列宽
    const colWidths = [
      { wch: 15 }, // 学号
      { wch: 10 }, // 姓名
      { wch: 30 }, // 试卷名称
      { wch: 15 }, // 科目
      { wch: 8 },  // 总分
      { wch: 8 },  // 得分
      { wch: 10 }, // 得分率
      { wch: 20 }, // 提交时间
      { wch: 10 }  // 状态
    ];
    worksheet['!cols'] = colWidths;

    // 生成Excel文件
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 设置响应头
    const filename = `成绩单_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    res.send(excelBuffer);
  } catch (error) {
    res.status(500).json({ message: '导出失败', error: error.message });
  }
});

// 获取考试排名（按试卷）
router.get('/ranking/paper/:paperId', authenticate, async (req, res) => {
  try {
    const { paperId } = req.params;
    const { limit = 50 } = req.query;

    // 学生只能查看自己的排名
    const where = {
      paperId: parseInt(paperId),
      status: { [Op.in]: ['submitted', 'graded'] }
    };

    if (req.user.role === 'student') {
      where.studentId = req.user.id;
    }

    const exams = await Exam.findAll({
      where,
      include: [
        { model: Paper, as: 'paper', attributes: ['title', 'totalScore'] },
        { model: User, as: 'student', attributes: ['name', 'studentId'] }
      ],
      order: [['totalScore', 'DESC'], ['submitTime', 'ASC']],
      limit: parseInt(limit)
    });

    const ranking = exams.map((exam, index) => ({
      rank: index + 1,
      studentId: exam.student?.studentId || '',
      name: exam.student?.name || '',
      score: parseFloat(exam.totalScore),
      totalScore: exam.paper?.totalScore || 0,
      scoreRate: exam.paper?.totalScore 
        ? ((parseFloat(exam.totalScore) / exam.paper.totalScore) * 100).toFixed(2) + '%'
        : '0%',
      submitTime: exam.submitTime,
      isCurrentUser: req.user.role === 'student' && exam.studentId === req.user.id
    }));

    res.json({ ranking, paperId: parseInt(paperId) });
  } catch (error) {
    res.status(500).json({ message: '获取排名失败', error: error.message });
  }
});

// 获取总成绩排名（学生）
router.get('/ranking/total', authenticate, authorize('student'), async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    // 获取所有已完成的考试
    const exams = await Exam.findAll({
      where: {
        status: { [Op.in]: ['submitted', 'graded'] }
      },
      include: [
        { model: User, as: 'student', attributes: ['id', 'name', 'studentId'] },
        { model: Paper, as: 'paper', attributes: ['totalScore'] }
      ]
    });

    // 按学生统计总分
    const studentScores = {};
    exams.forEach(exam => {
      const studentId = exam.studentId;
      if (!studentScores[studentId]) {
        studentScores[studentId] = {
          studentId: exam.student?.studentId || '',
          name: exam.student?.name || '',
          totalScore: 0,
          examCount: 0,
          averageScore: 0
        };
      }
      studentScores[studentId].totalScore += parseFloat(exam.totalScore);
      studentScores[studentId].examCount += 1;
    });

    // 计算平均分
    Object.values(studentScores).forEach(student => {
      student.averageScore = student.examCount > 0 
        ? (student.totalScore / student.examCount).toFixed(2)
        : 0;
    });

    // 排序
    const ranking = Object.values(studentScores)
      .sort((a, b) => parseFloat(b.averageScore) - parseFloat(a.averageScore))
      .slice(0, parseInt(limit))
      .map((student, index) => ({
        ...student,
        rank: index + 1,
        isCurrentUser: req.user.studentId === student.studentId
      }));

    res.json({ ranking });
  } catch (error) {
    res.status(500).json({ message: '获取总成绩排名失败', error: error.message });
  }
});

// 删除考试记录（学生只能删除自己的，教师和管理员可以删除所有）
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const examId = parseInt(req.params.id);
    
    if (isNaN(examId)) {
      return res.status(400).json({ message: '无效的考试ID' });
    }

    const exam = await Exam.findByPk(examId);
    
    if (!exam) {
      return res.status(404).json({ message: '考试记录不存在' });
    }

    // 权限检查：学生只能删除自己的，且必须是已提交的
    if (req.user.role === 'student') {
      if (exam.studentId !== req.user.id) {
        return res.status(403).json({ message: '无权删除此考试记录' });
      }
      // 学生只能删除已提交或已批阅的考试
      if (exam.status === 'in_progress') {
        return res.status(400).json({ message: '进行中的考试不能删除，请先提交或等待自动提交' });
      }
    } else {
      // 教师和管理员可以删除任何状态的考试记录（包括进行中的）
      // 这允许清理异常或遗留的考试记录
    }

    // 尝试删除，捕获可能的约束错误
    try {
      await exam.destroy();
      res.json({ message: '删除成功' });
    } catch (destroyError) {
      // 检查是否是外键约束错误
      if (destroyError.name === 'SequelizeForeignKeyConstraintError') {
        console.error('删除失败 - 外键约束:', destroyError);
        return res.status(400).json({ 
          message: '删除失败：该考试记录与其他数据有关联，无法删除。请先删除相关数据。',
          error: '外键约束错误'
        });
      }
      // 其他错误
      console.error('删除失败:', destroyError);
      throw destroyError;
    }
  } catch (error) {
    console.error('删除考试记录错误:', error);
    res.status(500).json({ 
      message: '删除失败', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;
