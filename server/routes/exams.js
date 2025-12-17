const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Exam = require('../models/Exam');
const Paper = require('../models/Paper');
const Question = require('../models/Question');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');

// 开始考试
router.post('/start', authenticate, authorize('student'), async (req, res) => {
  try {
    const { paperId } = req.body;

    if (!paperId) {
      return res.status(400).json({ message: '请提供试卷ID' });
    }

    // 检查试卷是否存在且已发布
    const paper = await Paper.findByPk(paperId);
    if (!paper) {
      return res.status(404).json({ message: '试卷不存在' });
    }
    if (paper.status !== 'published') {
      return res.status(400).json({ message: '试卷未发布' });
    }

    // 检查考试时间窗口
    const now = new Date();
    if (paper.startTime && new Date(paper.startTime) > now) {
      return res.status(400).json({ 
        message: `考试尚未开始，开始时间为：${new Date(paper.startTime).toLocaleString('zh-CN')}` 
      });
    }
    if (paper.endTime && new Date(paper.endTime) < now) {
      return res.status(400).json({ 
        message: `考试已结束，结束时间为：${new Date(paper.endTime).toLocaleString('zh-CN')}` 
      });
    }

    // 检查是否已有进行中的考试
    const existingExam = await Exam.findOne({
      where: {
        paperId: parseInt(paperId),
        studentId: req.user.id,
        status: 'in_progress'
      }
    });

    if (existingExam) {
      const examData = await Exam.findByPk(existingExam.id, {
        include: [
          { model: Paper, as: 'paper' },
          { model: Question, as: 'questions', through: { attributes: [] } }
        ]
      });
      return res.json({ message: '已有进行中的考试', exam: examData });
    }

    // 检查是否允许补考
    if (!paper.allowRetake) {
      // 如果不允许补考，检查是否已有完成的考试
      const completedExam = await Exam.findOne({
        where: {
          paperId: parseInt(paperId),
          studentId: req.user.id,
          status: { [Op.in]: ['submitted', 'graded'] }
        }
      });

      if (completedExam) {
        return res.status(400).json({ 
          message: '该试卷不允许补考，您已经完成过此考试',
          exam: completedExam
        });
      }
    }

    // 创建考试记录
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + paper.duration * 60 * 1000);

    const answers = (paper.questions || []).map(q => ({
      questionId: q.questionId,
      answer: null
    }));

    const exam = await Exam.create({
      paperId: parseInt(paperId),
      studentId: req.user.id,
      startTime,
      endTime,
      answers,
      status: 'in_progress'
    });

    // 加载关联数据
    const examData = await Exam.findByPk(exam.id, {
      include: [{ model: Paper, as: 'paper' }]
    });

    // 加载题目详情
    const questionIds = answers.map(a => a.questionId).filter(Boolean);
    if (questionIds.length > 0) {
      const questions = await Question.findAll({
        where: { id: { [Op.in]: questionIds } }
      });
      const questionMap = {};
      questions.forEach(q => { questionMap[q.id] = q.toJSON(); });
      
      examData.answers = examData.answers.map(a => ({
        ...a,
        questionId: questionMap[a.questionId]
      }));
    }

    res.status(201).json({ message: '考试开始', exam: examData });
  } catch (error) {
    res.status(500).json({ message: '开始考试失败', error: error.message });
  }
});

// 记录作弊行为（学生）
router.post('/:id/cheat', authenticate, authorize('student'), async (req, res) => {
  try {
    const exam = await Exam.findByPk(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: '考试不存在' });
    }
    if (exam.studentId !== req.user.id) {
      return res.status(403).json({ message: '无权操作此考试' });
    }
    if (exam.status !== 'in_progress') {
      return res.status(400).json({ message: '考试已结束' });
    }

    const { type, timestamp } = req.body; // type: 'tabSwitch' | 'copy' | 'paste'
    
    let cheatRecords = exam.cheatRecords || [];
    if (!Array.isArray(cheatRecords)) {
      cheatRecords = [];
    }

    cheatRecords.push({
      type,
      timestamp: timestamp || new Date().toISOString()
    });

    const updateData = { cheatRecords };
    if (type === 'tabSwitch') {
      updateData.tabSwitchCount = (exam.tabSwitchCount || 0) + 1;
    } else if (type === 'copy' || type === 'paste') {
      updateData.copyPasteCount = (exam.copyPasteCount || 0) + 1;
    }

    await exam.update(updateData);

    res.json({ message: '记录成功', cheatRecords: exam.cheatRecords });
  } catch (error) {
    res.status(500).json({ message: '记录失败', error: error.message });
  }
});

// 保存答案
router.put('/:id/answer', authenticate, authorize('student'), async (req, res) => {
  try {
    const { questionId, answer } = req.body;

    if (!questionId || answer === undefined) {
      return res.status(400).json({ message: '请提供题目ID和答案' });
    }

    const exam = await Exam.findByPk(req.params.id);
    
    if (!exam) {
      return res.status(404).json({ message: '考试记录不存在' });
    }

    if (exam.studentId !== req.user.id) {
      return res.status(403).json({ message: '无权操作此考试' });
    }

    if (exam.status !== 'in_progress') {
      return res.status(400).json({ message: '考试已结束' });
    }

    // 检查是否超时
    if (new Date() > exam.endTime) {
      await exam.update({
        status: 'submitted',
        autoSubmitted: true,
        submitTime: new Date()
      });
      return res.status(400).json({ message: '考试时间已到，已自动交卷' });
    }

    let answers = exam.answers || [];
    
    // 确保 answers 是数组格式
    if (typeof answers === 'string') {
      try {
        answers = JSON.parse(answers);
      } catch (e) {
        answers = [];
      }
    }
    if (!Array.isArray(answers)) {
      answers = [];
    }
    
    // 查找答案项
    const questionIdNum = parseInt(questionId);
    let answerIndex = -1;
    
    for (let i = 0; i < answers.length; i++) {
      let qId = null;
      if (answers[i].questionId) {
        if (typeof answers[i].questionId === 'object') {
          qId = parseInt(answers[i].questionId.id || answers[i].questionId._id);
        } else {
          qId = parseInt(answers[i].questionId);
        }
      }
      if (qId === questionIdNum) {
        answerIndex = i;
        break;
      }
    }

    if (answerIndex === -1) {
      return res.status(404).json({ message: '题目不存在于此试卷' });
    }

    // 统一清理所有答案项的 questionId，确保都是数字（防止 Sequelize JSON 字段保存问题）
    // 注意：空字符串、0、false 都是有效答案，必须保存
    answers = answers.map(a => {
      const qId = typeof a.questionId === 'object' && a.questionId !== null
        ? parseInt(a.questionId.id || a.questionId._id)
        : parseInt(a.questionId);
      
      return {
        questionId: qId,
        answer: a.answer !== undefined ? a.answer : null,
        score: a.score !== undefined ? a.score : 0,
        isCorrect: a.isCorrect !== undefined ? a.isCorrect : null,
        teacherComment: a.teacherComment || ''
      };
    });
    
    answerIndex = answers.findIndex(a => a.questionId === questionIdNum);
    if (answerIndex !== -1) {
      answers[answerIndex].answer = answer;
    } else {
      return res.status(404).json({ message: '题目不存在于此试卷' });
    }
    
    await exam.update({ answers });
    await exam.reload();
    
    const updatedExam = await Exam.findByPk(exam.id);
    let savedAnswers = updatedExam.answers || [];
    if (typeof savedAnswers === 'string') {
      try {
        savedAnswers = JSON.parse(savedAnswers);
      } catch (e) {
        savedAnswers = [];
      }
    }
    
    const savedAnswer = savedAnswers.find(a => {
      let qId = null;
      if (a.questionId) {
        if (typeof a.questionId === 'object') {
          qId = parseInt(a.questionId.id || a.questionId._id);
        } else {
          qId = parseInt(a.questionId);
        }
      }
      return qId === questionIdNum;
    });
    
    
    res.json({ message: '答案保存成功', exam: updatedExam });
  } catch (error) {
    res.status(500).json({ message: '保存答案失败', error: error.message });
  }
});

// 提交考试
router.post('/:id/submit', authenticate, authorize('student'), async (req, res) => {
  try {
    // 重新从数据库读取最新的考试数据，确保获取到最新的答案
    // 使用 raw: false 和重新查询确保获取最新数据
    let exam = await Exam.findByPk(req.params.id, {
      include: [{ model: Paper, as: 'paper' }]
    });
    
    if (!exam) {
      return res.status(404).json({ message: '考试记录不存在' });
    }

    if (exam.studentId !== req.user.id) {
      return res.status(403).json({ message: '无权操作此考试' });
    }

    if (exam.status !== 'in_progress') {
      return res.status(400).json({ message: '考试已提交' });
    }

    await exam.reload();
    
    let answers = exam.answers || [];
    // 确保 answers 是数组格式
    if (typeof answers === 'string') {
      try {
        answers = JSON.parse(answers);
      } catch (e) {
        answers = [];
      }
    }
    if (!Array.isArray(answers)) {
      answers = [];
    }
    
    
    // 检查是否有答案丢失
    const answersWithNull = answers.filter(a => {
      const qId = typeof a.questionId === 'object' && a.questionId !== null
        ? parseInt(a.questionId.id || a.questionId._id)
        : parseInt(a.questionId);
      return a.answer === null || a.answer === undefined;
    });
    // 提取题目ID（处理 questionId 可能是对象或数字的情况）
    const questionIds = answers.map(a => {
      if (typeof a.questionId === 'object' && a.questionId !== null) {
        return a.questionId.id || a.questionId._id;
      }
      return a.questionId;
    }).filter(Boolean);

    const questions = await Question.findAll({
      where: { id: { [Op.in]: questionIds } }
    });
    const questionMap = {};
    questions.forEach(q => { questionMap[q.id] = q.toJSON(); });

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
      paperQuestionMap[parseInt(q.questionId)] = q;
    });

    // 客观题自动评分，主观题等待教师批阅
    let totalScore = 0;
    const updatedAnswers = answers.map(answer => {
      // 获取题目ID - 统一处理为数字
      let qId = null;
      if (typeof answer.questionId === 'object' && answer.questionId !== null) {
        qId = parseInt(answer.questionId.id || answer.questionId._id);
      } else {
        qId = parseInt(answer.questionId);
      }
      
      if (!qId || isNaN(qId)) {
        return answer;
      }

      const question = questionMap[qId];
      if (!question) {
        return answer;
      }

      // 确保答案被正确保留
      const answerValue = answer.answer !== undefined ? answer.answer : null;
      
      // 获取该题在试卷中的分值
      const paperQuestion = paperQuestionMap[qId];
      const maxScore = paperQuestion ? paperQuestion.score : (question.score || 10);
      
      const newAnswer = { 
        questionId: qId,  // 确保 questionId 是数字
        answer: answerValue,  // 明确保留 answer 字段（包括空字符串、null）
        score: 0,
        isCorrect: null,
        teacherComment: answer.teacherComment || ''
      };

      // 客观题（单选题、多选题、判断题、填空题）自动评分
      if (['single', 'multiple', 'judge', 'fill'].includes(question.type)) {
        const isCorrect = checkAnswer(question, answerValue);
        newAnswer.isCorrect = isCorrect;
        newAnswer.score = isCorrect ? maxScore : 0;
        totalScore += newAnswer.score;
      } else {
        // 主观题（简答题）等待教师批阅
        newAnswer.score = 0;
        newAnswer.isCorrect = null;
      }

      return newAnswer;
    });

    // 检查是否有主观题需要批阅
    const hasEssayQuestions = updatedAnswers.some(a => {
      const qId = a.questionId;
      const question = questionMap[qId];
      return question && question.type === 'essay';
    });
    
    // 如果所有题目都是客观题且已评分，状态为 graded；如果有主观题，状态为 submitted（等待批阅）
    const examStatus = hasEssayQuestions ? 'submitted' : 'graded';
    
    
    await exam.update({
      status: examStatus,
      submitTime: new Date(),
      answers: updatedAnswers,
      totalScore
    });

    // 重新加载考试数据，包含关联信息（使用 reload 确保获取最新数据）
    await exam.reload();
    const updatedExam = await Exam.findByPk(exam.id, {
      include: [
        { model: Paper, as: 'paper' },
        { model: User, as: 'student', attributes: ['name', 'studentId'] }
      ]
    });

    // 处理 answers 字段，加载题目详情
    let finalAnswers = updatedExam.answers || [];
    if (typeof finalAnswers === 'string') {
      try {
        finalAnswers = JSON.parse(finalAnswers);
      } catch (e) {
        finalAnswers = [];
      }
    }
    if (!Array.isArray(finalAnswers)) {
      finalAnswers = [];
    }
    

    // 加载题目详情
    const finalQuestionIds = finalAnswers.map(a => {
      if (typeof a.questionId === 'object' && a.questionId !== null) {
        return parseInt(a.questionId.id || a.questionId._id);
      }
      return parseInt(a.questionId);
    }).filter(Boolean);

    if (finalQuestionIds.length > 0) {
      const finalQuestions = await Question.findAll({
        where: { id: { [Op.in]: finalQuestionIds } }
      });
      const finalQuestionMap = {};
      finalQuestions.forEach(q => { finalQuestionMap[q.id] = q.toJSON(); });
      
      updatedExam.answers = finalAnswers.map(a => {
        const qId = typeof a.questionId === 'object' && a.questionId !== null
          ? parseInt(a.questionId.id || a.questionId._id)
          : parseInt(a.questionId);
        
        const question = finalQuestionMap[qId];
        // 确保 answer 字段被正确保留
        
        if (question) {
          return {
            questionId: question,
            answer: a.answer !== undefined ? a.answer : null,  // 明确保留 answer 字段
            score: a.score !== undefined ? a.score : 0,
            isCorrect: a.isCorrect !== undefined ? a.isCorrect : null,
            teacherComment: a.teacherComment || ''
          };
        }
        // 如果没有找到题目，也要保留答案
        return {
          questionId: null,
          answer: a.answer !== undefined ? a.answer : null,
          score: a.score !== undefined ? a.score : 0,
          isCorrect: a.isCorrect !== undefined ? a.isCorrect : null,
          teacherComment: a.teacherComment || ''
        };
      });
      
    }

    res.json({ message: '提交成功', exam: updatedExam });
  } catch (error) {
    res.status(500).json({ message: '提交失败', error: error.message });
  }
});

// 检查答案的函数
function checkAnswer(question, userAnswer) {
  if (!question) {
    return false;
  }
  
  if (userAnswer === null || userAnswer === undefined || userAnswer === '') {
    return false;
  }

  // 获取并解析正确答案
  let correctAnswer = question.correctAnswer;
  
  if (typeof correctAnswer === 'string') {
    try {
      const parsed = JSON.parse(correctAnswer);
      correctAnswer = parsed;
    } catch (e) {
      // 不是 JSON，保持原样
    }
  }
  
  if (correctAnswer === null || correctAnswer === undefined || correctAnswer === '') {
    return false;
  }

  switch (question.type) {
    case 'single':
      // 单选题：字符串比较，处理 JSON 字符串格式
      let userSingle = userAnswer;
      let correctSingle = correctAnswer;
      
      if (typeof userSingle === 'string') {
        userSingle = userSingle.trim();
        if (userSingle.startsWith('"') && userSingle.endsWith('"')) {
          try {
            userSingle = JSON.parse(userSingle);
          } catch (e) {
            // 解析失败，保持原样
          }
        }
      }
      
      if (typeof correctSingle === 'string') {
        correctSingle = correctSingle.trim();
        if (correctSingle.startsWith('"') && correctSingle.endsWith('"')) {
          try {
            correctSingle = JSON.parse(correctSingle);
          } catch (e) {
            // 解析失败，保持原样
          }
        }
      }
      
      return String(userSingle).trim() === String(correctSingle).trim();
    
    case 'judge':
      // 判断题：统一转换为字符串比较
      let userJudge = userAnswer;
      let correctJudge = correctAnswer;
      
      if (typeof userJudge === 'boolean') {
        userJudge = userJudge ? 'true' : 'false';
      }
      if (typeof correctJudge === 'boolean') {
        correctJudge = correctJudge ? 'true' : 'false';
      }
      
      const userJudgeStr = String(userJudge).trim().toLowerCase();
      const correctJudgeStr = String(correctJudge).trim().toLowerCase();
      return userJudgeStr === correctJudgeStr;
    
    case 'multiple':
      // 多选题：数组比较
      let userArr = userAnswer;
      let correctArr = correctAnswer;
      
      // 处理用户答案
      if (typeof userArr === 'string') {
        try {
          userArr = JSON.parse(userArr);
        } catch (e) {
          // 如果不是 JSON，可能是逗号分隔的字符串
          userArr = userArr.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
      
      // 处理正确答案
      if (typeof correctArr === 'string') {
        try {
          correctArr = JSON.parse(correctArr);
        } catch (e) {
          // 如果不是 JSON，可能是逗号分隔的字符串
          correctArr = correctArr.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
      
      // 确保都是数组格式
      if (!Array.isArray(userArr)) {
        userArr = userArr !== null && userArr !== undefined ? [userArr] : [];
      }
      if (!Array.isArray(correctArr)) {
        correctArr = correctArr !== null && correctArr !== undefined ? [correctArr] : [];
      }
      
      if (userArr.length === 0 || correctArr.length === 0) {
        return false;
      }
      
      // 排序后比较（转换为字符串后排序）
      const userSorted = [...userArr].map(String).map(s => s.trim()).filter(Boolean).sort().join(',');
      const correctSorted = [...correctArr].map(String).map(s => s.trim()).filter(Boolean).sort().join(',');
      return userSorted === correctSorted;
    
    case 'fill':
      // 填空题：去除空格和大小写后比较
      const userFill = String(userAnswer).trim().toLowerCase().replace(/\s+/g, ' ').replace(/[，,]/g, ',');
      const correctFill = String(correctAnswer).trim().toLowerCase().replace(/\s+/g, ' ').replace(/[，,]/g, ',');
      return userFill === correctFill;
    
    default:
      return false;
  }
}

// 获取考试详情
router.get('/:id', authenticate, async (req, res) => {
  try {
    const exam = await Exam.findByPk(req.params.id, {
      include: [
        { model: Paper, as: 'paper' },
        { model: User, as: 'student', attributes: ['name', 'studentId'] }
      ]
    });

    if (!exam) {
      return res.status(404).json({ message: '考试记录不存在' });
    }

    // 权限检查
    if (req.user.role === 'student' && exam.studentId !== req.user.id) {
      return res.status(403).json({ message: '无权查看此考试' });
    }

    // 获取 exam 的 JSON 数据
    const examData = exam.toJSON();
    
    // 确保 answers 是数组（Sequelize JSON 字段可能返回字符串）
    let answers = examData.answers || [];
    if (typeof answers === 'string') {
      try {
        answers = JSON.parse(answers);
      } catch (e) {
        answers = [];
      }
    }
    if (!Array.isArray(answers)) {
      answers = [];
    }
    
    const questionIds = answers.map(a => {
      // 处理 questionId 可能是对象或数字的情况
      if (typeof a.questionId === 'object' && a.questionId !== null) {
        return a.questionId.id || a.questionId._id;
      }
      return a.questionId;
    }).filter(Boolean);
    
    if (questionIds.length > 0) {
      const questions = await Question.findAll({
        where: { id: { [Op.in]: questionIds } }
      });
      const questionMap = {};
      questions.forEach(q => {
        const qObj = q.toJSON();
        // 学生查看时，如果考试未提交，不显示正确答案
        if (req.user.role === 'student' && exam.status === 'in_progress') {
          delete qObj.correctAnswer;
        }
        questionMap[q.id] = qObj;
      });

      examData.answers = answers.map(a => {
        const qId = typeof a.questionId === 'object' && a.questionId !== null
          ? (a.questionId.id || a.questionId._id)
          : a.questionId;
        const question = questionMap[qId];
        // 注意：空字符串也是有效答案，必须保留
        const answerValue = a.answer !== undefined ? a.answer : null;
        
        return {
          questionId: question || null,
          answer: answerValue,
          score: a.score !== undefined ? a.score : 0,
          isCorrect: a.isCorrect !== undefined ? a.isCorrect : null,
          teacherComment: a.teacherComment || ''
        };
      });
    } else {
      examData.answers = answers;
    }

    res.json({ exam: examData });
  } catch (error) {
    res.status(500).json({ message: '获取考试详情失败', error: error.message });
  }
});

// 获取我的考试列表（学生）
router.get('/my/list', authenticate, authorize('student'), async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const where = { studentId: req.user.id };

    if (status) where.status = status;

    const { count, rows: exams } = await Exam.findAndCountAll({
      where,
      include: [{ model: Paper, as: 'paper', attributes: ['title', 'subject', 'duration'] }],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      exams,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: '获取考试列表失败', error: error.message });
  }
});

// 批阅题目（教师）- 支持所有题目类型
router.put('/:id/grade', authenticate, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { questionId, score, comment, isCorrect } = req.body;

    if (!questionId || score === undefined) {
      return res.status(400).json({ message: '请提供题目ID和分数' });
    }

    const exam = await Exam.findByPk(req.params.id, {
      include: [{ model: Paper, as: 'paper' }]
    });

    if (!exam) {
      return res.status(404).json({ message: '考试记录不存在' });
    }

    if (exam.status === 'in_progress') {
      return res.status(400).json({ message: '考试尚未提交' });
    }

    // 处理 answers 字段
    let answers = exam.answers || [];
    if (typeof answers === 'string') {
      try {
        answers = JSON.parse(answers);
      } catch (e) {
        answers = [];
      }
    }
    if (!Array.isArray(answers)) {
      answers = [];
    }

    // 统一清理所有答案项的 questionId，确保都是数字（防止 Sequelize JSON 字段保存问题）
    answers = answers.map(a => {
      const qId = typeof a.questionId === 'object' && a.questionId !== null
        ? parseInt(a.questionId.id || a.questionId._id)
        : parseInt(a.questionId);
      
      return {
        questionId: qId,
        answer: a.answer !== undefined ? a.answer : null,
        score: a.score !== undefined ? a.score : 0,
        isCorrect: a.isCorrect !== undefined ? a.isCorrect : null,
        teacherComment: a.teacherComment || ''
      };
    });

    // 加载题目详情用于批阅
    const questionIds = answers.map(a => a.questionId).filter(Boolean);

    const questions = await Question.findAll({
      where: { id: { [Op.in]: questionIds } }
    });
    const questionMap = {};
    questions.forEach(q => { questionMap[q.id] = q.toJSON(); });

    const questionIdNum = parseInt(questionId);
    const answerIndex = answers.findIndex(a => a.questionId === questionIdNum);

    if (answerIndex === -1) {
      return res.status(404).json({ message: '题目不存在于此考试' });
    }

    const question = questionMap[questionIdNum];
    if (!question) {
      return res.status(404).json({ message: '题目不存在' });
    }

    // 找到该题在试卷中的分值
    let paperQuestions = exam.paper.questions || [];
    if (typeof paperQuestions === 'string') {
      try {
        paperQuestions = JSON.parse(paperQuestions);
      } catch (e) {
        paperQuestions = [];
      }
    }
    const paperQuestion = paperQuestions.find(
      q => parseInt(q.questionId) === questionIdNum
    );
    const maxScore = paperQuestion ? paperQuestion.score : (question.score || 10);

    if (score < 0 || score > maxScore) {
      return res.status(400).json({ message: `分数应在0-${maxScore}之间` });
    }

    // 更新分数和批阅信息
    const oldScore = parseFloat(answers[answerIndex].score || 0);
    // 确保分数是数字类型，并保留2位小数
    const newScore = parseFloat(score);
    if (isNaN(newScore)) {
      return res.status(400).json({ message: '分数格式无效' });
    }
    answers[answerIndex].score = newScore;
    answers[answerIndex].teacherComment = comment || '';

    // 设置客观题的正确性标记
    if (isCorrect !== undefined) {
      answers[answerIndex].isCorrect = isCorrect;
    }

    // 重新计算总分：遍历所有答案，累加得分
    let calculatedTotal = 0;
    answers.forEach(a => {
      const s = parseFloat(a.score || 0);
      if (!isNaN(s)) {
        calculatedTotal += s;
      }
    });
    
    const newTotalScore = parseFloat(calculatedTotal.toFixed(2));

    await exam.update({
      answers,
      totalScore: newTotalScore,
      status: 'graded'
    });

    await exam.reload();
    
    // 重新加载考试数据，包含题目详情（与获取考试详情API保持一致）
    const updatedExam = await Exam.findByPk(exam.id, {
      include: [
        { model: Paper, as: 'paper' },
        { model: User, as: 'student', attributes: ['name', 'studentId'] }
      ]
    });

    const examData = updatedExam.toJSON();
    let updatedAnswers = examData.answers || [];
    if (typeof updatedAnswers === 'string') {
      try {
        updatedAnswers = JSON.parse(updatedAnswers);
      } catch (e) {
        updatedAnswers = [];
      }
    }
    if (!Array.isArray(updatedAnswers)) {
      updatedAnswers = [];
    }
    
    // 加载题目详情（用于返回数据）
    const questionIdsForResponse = updatedAnswers.map(a => {
      // 如果 questionId 是对象，提取 ID
      if (typeof a.questionId === 'object' && a.questionId !== null) {
        return parseInt(a.questionId.id || a.questionId._id);
      }
      // 如果是数字，直接返回
      return parseInt(a.questionId);
    }).filter(id => id && !isNaN(id));
    
    if (questionIdsForResponse.length > 0) {
      const questionsForResponse = await Question.findAll({
        where: { id: { [Op.in]: questionIdsForResponse } }
      });
      const questionMapForResponse = {};
      questionsForResponse.forEach(q => {
        const qObj = q.toJSON();
        questionMapForResponse[q.id] = qObj;
      });

      examData.answers = updatedAnswers.map(a => {
        // 提取题目ID（统一处理）
        let qId = null;
        if (typeof a.questionId === 'object' && a.questionId !== null) {
          qId = parseInt(a.questionId.id || a.questionId._id);
        } else {
          qId = parseInt(a.questionId);
        }
        
        const question = questionMapForResponse[qId] || null;
        
        // 确保 score 是数字类型
        let scoreValue = a.score;
        if (scoreValue !== undefined && scoreValue !== null) {
          scoreValue = parseFloat(scoreValue);
          if (isNaN(scoreValue)) {
            scoreValue = 0;
          }
        } else {
          scoreValue = 0;
        }
        
        return {
          questionId: question,
          answer: a.answer !== undefined ? a.answer : null,
          score: scoreValue,
          isCorrect: a.isCorrect !== undefined ? a.isCorrect : null,
          teacherComment: a.teacherComment || ''
        };
      });
    } else {
      examData.answers = updatedAnswers;
    }

    res.json({ message: '批阅成功', exam: examData });
  } catch (error) {
    res.status(500).json({ message: '批阅失败', error: error.message });
  }
});

module.exports = router;
