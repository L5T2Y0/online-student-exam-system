import React, { useState, useEffect, useRef, useCallback, useMemo, useContext } from 'react';
import { Card, Radio, Checkbox, Input, Button, Space, message, Modal, Progress, Tag, InputNumber, Form, Switch } from 'antd';
import { useParams } from 'react-router-dom';
import api from '../utils/api';
import { AuthContext } from '../contexts/AuthContext';

const { TextArea } = Input;

const ExamDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [gradingModal, setGradingModal] = useState({ visible: false, questionId: null, question: null, answerItem: null, maxScore: 10 });
  const [gradingForm] = Form.useForm();

  const examRef = useRef(exam);
  examRef.current = exam;
  const saveTimerRef = useRef(null);
  const answersInitializedRef = useRef(false);

  // 获取考试详情
  const fetchExam = useCallback(async () => {
    try {
      const res = await api.get(`/api/exams/${id}`);
      const examData = res.data.exam;
      setExam(examData);

      // 初始化答案状态
      const initialAnswers = {};
      
      if (examData.answers && Array.isArray(examData.answers)) {
        examData.answers.forEach(answerItem => {
          let qId = null;
          if (answerItem.questionId) {
            if (typeof answerItem.questionId === 'object' && answerItem.questionId !== null) {
              qId = answerItem.questionId.id || answerItem.questionId._id;
            } else {
              qId = answerItem.questionId;
            }
          }
          
          if (qId) {
            qId = parseInt(qId);
            const answerValue = answerItem.answer;
            // 注意：null、空字符串、0、false 都是有效答案，必须保存
            if (answerValue !== undefined) {
              initialAnswers[qId] = answerValue;
            } else {
              initialAnswers[qId] = null;
            }
          }
        });
      }
      
      setAnswers(initialAnswers);
      
      if (examData.status !== 'in_progress') {
        answersInitializedRef.current = true;
      }

      // 计算剩余时间
      if (examData.status === 'in_progress' && examData.endTime) {
        const remaining = Math.max(0, Math.floor((new Date(examData.endTime) - new Date()) / 1000));
        setTimeLeft(remaining);
      }
    } catch (error) {
      console.error('获取考试详情失败:', error);
      message.error(error.response?.data?.message || '获取考试详情失败');
    }
  }, [id]);

  useEffect(() => {
    fetchExam();
  }, [fetchExam]);

  // 防作弊检测（仅在进行中的考试时启用）
  useEffect(() => {
    if (!exam || exam.status !== 'in_progress' || user?.role !== 'student') {
      return;
    }

    const recordCheat = async (type) => {
      try {
        await api.post(`/api/exams/${id}/cheat`, { type, timestamp: new Date().toISOString() });
      } catch (error) {
        console.error('记录作弊行为失败:', error);
      }
    };

    // 监听标签页切换
    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordCheat('tabSwitch');
        message.warning('检测到标签页切换，已记录异常行为');
      }
    };

    // 监听复制操作
    const handleCopy = (e) => {
      e.preventDefault();
      recordCheat('copy');
      message.warning('考试期间禁止复制操作');
      return false;
    };

    // 监听粘贴操作
    const handlePaste = (e) => {
      e.preventDefault();
      recordCheat('paste');
      message.warning('考试期间禁止粘贴操作');
      return false;
    };

    // 禁止右键菜单（防止复制）
    const handleContextMenu = (e) => {
      e.preventDefault();
      message.warning('考试期间禁止使用右键菜单');
      return false;
    };

    // 禁止快捷键（Ctrl+C, Ctrl+V等）
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.key === 'a')) {
        e.preventDefault();
        message.warning('考试期间禁止使用复制粘贴快捷键');
        return false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    // 添加CSS样式禁止选择文本
    const style = document.createElement('style');
    style.textContent = `
      body {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
      }
      input, textarea {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.head.removeChild(style);
    };
  }, [exam, id, user]);

  // 倒计时
  useEffect(() => {
    if (exam?.status === 'in_progress' && timeLeft > 0) {
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (examRef.current?.status === 'in_progress') {
              handleAutoSubmit();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam?.status, timeLeft]);

  const handleAutoSubmit = useCallback(async () => {
    try {
      await api.post(`/api/exams/${id}/submit`);
      message.warning('考试时间到，已自动提交');
      answersInitializedRef.current = false; // 重置标记，允许重新初始化
      fetchExam();
    } catch (error) {
      console.error('自动提交失败:', error);
    }
  }, [id, fetchExam]);

  // 答案改变处理 - 移除 answers 依赖，避免不必要的重新创建
  const handleAnswerChange = useCallback((questionId, answer) => {
    const qId = parseInt(questionId);
    
    setAnswers(prev => ({ ...prev, [qId]: answer }));

    // 防抖保存到服务器（300ms延迟）
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    
    saveTimerRef.current = setTimeout(async () => {
      try {
        await api.put(`/api/exams/${id}/answer`, { 
          questionId: qId, 
          answer 
        });
      } catch (error) {
        console.error('保存答案失败:', error);
        message.error('保存答案失败，请重试');
      }
    }, 300);
  }, [id]);

  // 提交考试
  const handleSubmit = useCallback(() => {
    Modal.confirm({
      title: '确认提交',
      content: '确定要提交试卷吗？提交后将无法修改答案。',
      onOk: async () => {
        setLoading(true);
        try {
          // 清除防抖定时器
          if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
          }
          
          // 立即保存所有答案（包括空字符串、0、false等有效答案）
          const savePromises = Object.entries(answers).map(async ([qId, answer]) => {
            if (answer !== undefined) {
              try {
                await api.put(`/api/exams/${id}/answer`, { 
                  questionId: parseInt(qId), 
                  answer 
                });
              } catch (error) {
                console.error(`保存题目 ${qId} 的答案失败:`, error);
              }
            }
          });
          
          await Promise.all(savePromises);
          await new Promise(resolve => setTimeout(resolve, 500));
          
          await api.post(`/api/exams/${id}/submit`);
          message.success('提交成功');
          
          // 重置初始化标记
          answersInitializedRef.current = false;
          
          // 重新获取考试数据
          await fetchExam();
        } catch (error) {
          message.error(error.response?.data?.message || '提交失败');
        } finally {
          setLoading(false);
        }
      }
    });
  }, [id, answers, fetchExam]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 使用 useMemo 缓存题目渲染，避免不必要的重新渲染
  const renderQuestion = useCallback((answerItem, index) => {
    const question = answerItem.questionId;
    if (!question) {
      return null;
    }

    const questionType = question.type;
    const questionId = parseInt(question.id || question._id);
    
    // 获取该题在试卷中的分值（优先使用试卷中设置的分值）
    const paperQuestions = exam?.paper?.questions || [];
    let questionScore = question.score || 5; // 默认使用题目本身的分值
    if (Array.isArray(paperQuestions)) {
      const paperQuestion = paperQuestions.find(q => {
        const qId = typeof q.questionId === 'object' ? (q.questionId.id || q.questionId._id) : q.questionId;
        return parseInt(qId) === questionId;
      });
      if (paperQuestion && paperQuestion.score) {
        questionScore = paperQuestion.score; // 使用试卷中设置的分值
      }
    }
    
    // 获取答案的完整逻辑：
    // 1. 如果考试进行中，优先从 answers 状态获取（实时更新）
    // 2. 如果考试已提交，优先从 answerItem.answer 获取（服务器数据）
    // 3. 如果都没有，则为 null（未作答）
    let currentAnswer = null;
    
    if (exam?.status === 'in_progress') {
      // 进行中的考试：优先使用本地状态
      currentAnswer = answers[questionId];
      if (currentAnswer === undefined) {
        currentAnswer = answerItem.answer !== undefined ? answerItem.answer : null;
      }
    } else {
      // 已提交的考试：优先使用服务器数据
      currentAnswer = answerItem.answer !== undefined ? answerItem.answer : null;
      // 如果服务器数据为空，再尝试从本地状态获取（作为备用）
      if ((currentAnswer === null || currentAnswer === undefined || currentAnswer === '') && answers[questionId] !== undefined) {
        currentAnswer = answers[questionId];
      }
    }
    
    // 多选题确保是数组
    let displayAnswer = currentAnswer;
    if (questionType === 'multiple') {
      if (!Array.isArray(displayAnswer)) {
        displayAnswer = displayAnswer ? [displayAnswer] : [];
      }
    }

    // 判断是否已作答
    const hasAnswer = displayAnswer !== null && 
                     displayAnswer !== undefined && 
                     displayAnswer !== '' &&
                     (Array.isArray(displayAnswer) ? displayAnswer.length > 0 : true);

    return (
      <Card
        key={questionId}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>第{index + 1}题 ({getTypeName(questionType)}) - {questionScore} 分</span>
            {exam?.status === 'in_progress' && (
              <Tag color={hasAnswer ? 'success' : 'default'}>
                {hasAnswer ? '已作答' : '未作答'}
              </Tag>
            )}
          </div>
        }
        style={{ marginBottom: 16 }}
      >
        <div style={{ marginBottom: 16 }}>
          <strong>{question.content}</strong>
        </div>

        {questionType === 'single' && (
          <Radio.Group
            value={displayAnswer || undefined}
            onChange={(e) => {
              handleAnswerChange(questionId, e.target.value);
            }}
            disabled={exam?.status !== 'in_progress'}
          >
            <Space direction="vertical">
              {question.options?.map((option, idx) => (
                <Radio key={idx} value={option.label}>
                  {option.label}. {option.content}
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        )}

        {questionType === 'multiple' && (
          <Checkbox.Group
            value={Array.isArray(displayAnswer) ? displayAnswer : []}
            onChange={(values) => {
              handleAnswerChange(questionId, values);
            }}
            disabled={exam?.status !== 'in_progress'}
          >
            <Space direction="vertical">
              {question.options?.map((option, idx) => (
                <Checkbox key={idx} value={option.label}>
                  {option.label}. {option.content}
                </Checkbox>
              ))}
            </Space>
          </Checkbox.Group>
        )}

        {questionType === 'judge' && (
          <Radio.Group
            value={displayAnswer || undefined}
            onChange={(e) => {
              handleAnswerChange(questionId, e.target.value);
            }}
            disabled={exam?.status !== 'in_progress'}
          >
            <Space>
              <Radio value="true">正确</Radio>
              <Radio value="false">错误</Radio>
            </Space>
          </Radio.Group>
        )}

        {questionType === 'fill' && (
          <Input
            value={displayAnswer || ''}
            onChange={(e) => {
              handleAnswerChange(questionId, e.target.value);
            }}
            disabled={exam?.status !== 'in_progress'}
            placeholder="请输入答案"
          />
        )}

        {questionType === 'essay' && (
          <TextArea
            value={displayAnswer || ''}
            onChange={(e) => {
              handleAnswerChange(questionId, e.target.value);
            }}
            disabled={exam?.status !== 'in_progress'}
            rows={6}
            placeholder="请输入答案"
          />
        )}

        {/* 提交后的结果显示 */}
        {exam?.status !== 'in_progress' && (() => {
          // 重新计算用户答案，确保能正确显示
          let userAns = null;
          
          // 优先级1: 从 answerItem.answer 获取（服务器数据，最可靠）
          // 注意：空字符串 '' 也是有效答案（填空题、简答题可能为空）
          if (answerItem.answer !== null && answerItem.answer !== undefined) {
            userAns = answerItem.answer;
          }
          // 优先级2: 从 displayAnswer 获取（已处理过的答案）
          else if (displayAnswer !== null && displayAnswer !== undefined) {
            userAns = displayAnswer;
          }
          // 优先级3: 从 answers 状态获取（本地状态）
          else if (answers[questionId] !== null && answers[questionId] !== undefined) {
            userAns = answers[questionId];
          }
          
          // 多选题处理
          if (questionType === 'multiple' && userAns !== null) {
            if (!Array.isArray(userAns)) {
              userAns = userAns ? [userAns] : [];
            }
          }
          
          // 格式化显示答案
          let answerText = '未作答';
          // 注意：null 和 undefined 才是未作答，空字符串也算作答
          if (userAns !== null && userAns !== undefined) {
            if (Array.isArray(userAns)) {
              answerText = userAns.length > 0 ? userAns.join(', ') : '未作答';
            } else if (userAns === 'true' || userAns === true) {
              answerText = '正确';
            } else if (userAns === 'false' || userAns === false) {
              answerText = '错误';
            } else if (questionType === 'single' && question.options) {
              const option = question.options.find(opt => opt.label === String(userAns));
              answerText = option ? `${option.label}. ${option.content}` : String(userAns);
            } else {
              answerText = String(userAns);
            }
          }
          const formatCorrectAnswer = () => {
            const correctAns = question.correctAnswer;
            if (Array.isArray(correctAns)) {
              return correctAns.join(', ');
            }
            if (correctAns === 'true' || correctAns === true) return '正确';
            if (correctAns === 'false' || correctAns === false) return '错误';
            
            if (questionType === 'single' && question.options) {
              const option = question.options.find(opt => opt.label === String(correctAns));
              if (option) {
                return `${option.label}. ${option.content}`;
              }
            }
            
            return String(correctAns || '无');
          };
          
          return (
            <div style={{ marginTop: 16, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
              <div style={{ marginBottom: 12 }}>
                <strong style={{ fontSize: '14px' }}>你的答案：</strong>
                <span style={{ 
                  color: answerItem.isCorrect !== null && answerItem.isCorrect !== undefined
                    ? (answerItem.isCorrect ? '#52c41a' : '#ff4d4f')
                    : '#1890ff',
                  fontWeight: 'bold',
                  marginLeft: 8,
                  fontSize: '14px'
                }}>
                  {answerText}
                </span>
              </div>
            
              <div style={{ marginBottom: 12 }}>
                <strong style={{ fontSize: '14px' }}>正确答案：</strong>
                <span style={{ color: '#52c41a', fontWeight: 'bold', marginLeft: 8, fontSize: '14px' }}>
                  {formatCorrectAnswer()}
                </span>
              </div>
            
              {answerItem.isCorrect !== undefined && answerItem.isCorrect !== null ? (
                <div style={{ marginTop: 12 }}>
                  <Tag color={answerItem.isCorrect ? 'success' : 'error'} style={{ fontSize: '14px', padding: '4px 12px' }}>
                    {answerItem.isCorrect ? '✓ 正确' : '✗ 错误'}
                  </Tag>
                  <span style={{ marginLeft: 12, fontSize: '16px', fontWeight: 'bold' }}>
                    得分：{answerItem.score || 0} / {questionScore} 分
                  </span>
                </div>
              ) : (answerItem.score !== undefined && answerItem.score !== null && parseFloat(answerItem.score) > 0) || (answerItem.teacherComment && answerItem.teacherComment.trim() !== '') ? (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#52c41a' }}>
                      得分：{(() => {
                        const scoreValue = answerItem.score !== undefined && answerItem.score !== null 
                          ? parseFloat(answerItem.score) 
                          : 0;
                        return isNaN(scoreValue) ? '0.0' : scoreValue.toFixed(1);
                      })()} / {questionScore} 分
                    </span>
                    {answerItem.score !== undefined && answerItem.score !== null && parseFloat(answerItem.score) === 0 && (
                      <Tag color="default" style={{ fontSize: '12px' }}>0分</Tag>
                    )}
                  </div>
                  {answerItem.teacherComment && answerItem.teacherComment.trim() !== '' && (
                    <div style={{ marginTop: 8, padding: 8, background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4 }}>
                      <strong style={{ color: '#52c41a' }}>教师评语：</strong>
                      <span>{answerItem.teacherComment}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <Tag color="default" style={{ fontSize: '14px', padding: '4px 12px' }}>
                        待批阅
                      </Tag>
                      <span style={{ marginLeft: 12, fontSize: '14px', color: '#8c8c8c' }}>
                        等待教师批阅
                      </span>
                    </div>
                    {/* 教师/管理员可以批阅所有类型的题目 */}
                    {(user?.role === 'teacher' || user?.role === 'admin') && exam?.status !== 'in_progress' && (
                      <Button 
                        type="primary" 
                        size="middle"
                        onClick={() => {
                          // 使用上面已经计算好的 questionScore
                          const initialValues = {
                            score: answerItem.score || 0,
                            comment: answerItem.teacherComment || ''
                          };
                          // 对于客观题，设置 isCorrect（如果是布尔值，转换为 Switch 需要的格式）
                          if (answerItem.isCorrect !== undefined && answerItem.isCorrect !== null) {
                            initialValues.isCorrect = answerItem.isCorrect === true || answerItem.isCorrect === 'true';
                          }
                          gradingForm.setFieldsValue(initialValues);
                          setGradingModal({
                            visible: true,
                            questionId: questionId,
                            question: question,
                            answerItem: answerItem,
                            maxScore: questionScore
                          });
                        }}
                      >
                        📝 批阅此题
                      </Button>
                    )}
                  </div>
                  {/* 如果是学生，显示提示信息 */}
                  {user?.role === 'student' && (
                    <div style={{ padding: 8, background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4, fontSize: '13px', color: '#52c41a' }}>
                      ⏳ 此题目等待教师批阅中，批阅完成后会显示得分
                    </div>
                  )}
                  {/* 如果是教师但按钮未显示，显示提示 */}
                  {(user?.role === 'teacher' || user?.role === 'admin') && exam?.status === 'in_progress' && (
                    <div style={{ padding: 8, background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 4, fontSize: '13px', color: '#d46b08' }}>
                      ⚠️ 考试进行中，请等待学生提交后再批阅
                    </div>
                  )}
                </div>
              )}
              
              {/* 已批阅题目可重新批阅 */}
              {exam?.status !== 'in_progress' && (user?.role === 'teacher' || user?.role === 'admin') && 
               ((answerItem.score !== undefined && answerItem.score !== null && parseFloat(answerItem.score) > 0) || (answerItem.teacherComment && answerItem.teacherComment.trim() !== '')) && (
                <div style={{ marginTop: 8 }}>
                  <Button 
                    type="default" 
                    size="small"
                    onClick={() => {
                      const initialValues = {
                        score: answerItem.score || 0,
                        comment: answerItem.teacherComment || ''
                      };
                      if (answerItem.isCorrect !== undefined && answerItem.isCorrect !== null) {
                        initialValues.isCorrect = answerItem.isCorrect === true || answerItem.isCorrect === 'true';
                      }
                      gradingForm.setFieldsValue(initialValues);
                      setGradingModal({
                        visible: true,
                        questionId: questionId,
                        question: question,
                        answerItem: answerItem,
                        maxScore: questionScore
                      });
                    }}
                  >
                    重新批阅
                  </Button>
                </div>
              )}
            
              {question.explanation && (
                <div style={{ marginTop: 12, padding: 8, background: '#fff', borderRadius: 4 }}>
                  <strong>解析：</strong>{question.explanation}
                </div>
              )}
            
              {answerItem.teacherComment && (
                <div style={{ marginTop: 12, padding: 8, background: '#fff', borderRadius: 4 }}>
                  <strong>教师评语：</strong>{answerItem.teacherComment}
                </div>
              )}
            </div>
          );
        })()}
      </Card>
    );
  }, [answers, exam?.status, handleAnswerChange, user?.role, exam?.paper?.questions, gradingForm]); // 添加 user 和 gradingForm 依赖

  const getTypeName = (type) => {
    const typeMap = {
      single: '单选题',
      multiple: '多选题',
      judge: '判断题',
      fill: '填空题',
      essay: '简答题'
    };
    return typeMap[type] || type;
  };

  // 计算已答题数量 - 必须在所有 hooks 之后
  const answeredCount = Object.values(answers).filter(answer => {
    return answer !== null && answer !== undefined && answer !== '' &&
           (Array.isArray(answer) ? answer.length > 0 : true);
  }).length;
  const totalQuestions = exam?.answers?.length || 0;

  // 使用 useMemo 缓存题目列表，避免不必要的重新渲染
  // 必须在所有条件返回之前调用
  const questionCards = useMemo(() => {
    if (!exam || !exam.answers) return [];
    return exam.answers.map((answer, index) => renderQuestion(answer, index));
  }, [exam, renderQuestion]);

  if (!exam) {
    return <div style={{ textAlign: 'center', padding: 50 }}>加载中...</div>;
  }

  return (
    <div>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2>{exam.paper?.title || exam.paperId?.title}</h2>
            <div>科目：{exam.paper?.subject || exam.paperId?.subject}</div>
            <div>总分：{exam.paper?.totalScore || exam.paperId?.totalScore} 分</div>
            {/* 显示作弊记录（教师/管理员可见，或学生查看已提交的考试） */}
            {(user?.role === 'teacher' || user?.role === 'admin' || exam.status !== 'in_progress') && (
              <div style={{ marginTop: 8 }}>
                {(exam.tabSwitchCount > 0 || exam.copyPasteCount > 0) && (
                  <div style={{ marginTop: 8, padding: 8, background: '#fff7e6', borderRadius: 4, border: '1px solid #ffd591' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: 4, color: '#d46b08' }}>⚠️ 异常行为记录</div>
                    {exam.tabSwitchCount > 0 && (
                      <div style={{ color: '#d46b08' }}>
                        标签页切换：<strong>{exam.tabSwitchCount}</strong> 次
                      </div>
                    )}
                    {exam.copyPasteCount > 0 && (
                      <div style={{ color: '#d46b08' }}>
                        复制/粘贴操作：<strong>{exam.copyPasteCount}</strong> 次
                      </div>
                    )}
                    {exam.cheatRecords && Array.isArray(exam.cheatRecords) && exam.cheatRecords.length > 0 && (
                      <div style={{ marginTop: 4, fontSize: 12, color: '#8c8c8c' }}>
                        详细记录：共 {exam.cheatRecords.length} 条
                      </div>
                    )}
                  </div>
                )}
                {(!exam.tabSwitchCount || exam.tabSwitchCount === 0) && 
                 (!exam.copyPasteCount || exam.copyPasteCount === 0) && 
                 (user?.role === 'teacher' || user?.role === 'admin') && (
                  <div style={{ marginTop: 8, color: '#52c41a', fontSize: 12 }}>
                    ✓ 未检测到异常行为
                  </div>
                )}
              </div>
            )}
          </div>
          {exam.status === 'in_progress' && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: timeLeft < 300 ? 'red' : 'inherit' }}>
                {formatTime(timeLeft)}
              </div>
              <div>剩余时间</div>
              {/* 学生进行考试时显示作弊警告 */}
              {user?.role === 'student' && (exam.tabSwitchCount > 0 || exam.copyPasteCount > 0) && (
                <div style={{ marginTop: 8, padding: 4, background: '#fff1f0', borderRadius: 4, fontSize: 12, color: '#cf1322' }}>
                  ⚠️ 已记录 {exam.tabSwitchCount + exam.copyPasteCount} 次异常行为
                </div>
              )}
            </div>
          )}
          {exam.status !== 'in_progress' && (
            <div>
              <Tag color={exam.status === 'graded' ? 'green' : 'orange'}>
                {exam.status === 'graded' ? '已批阅' : '已提交'}
              </Tag>
              <div style={{ marginTop: 8, fontSize: '18px', fontWeight: 'bold' }}>
                得分：{parseFloat(exam.totalScore || 0).toFixed(1)} / {exam.paper?.totalScore || exam.paperId?.totalScore} 分
              </div>
              {exam.status === 'submitted' && (user?.role === 'teacher' || user?.role === 'admin') && (
                <div style={{ marginTop: 4, fontSize: '12px', color: '#fa8c16' }}>
                  ⚠️ 有题目待批阅
                </div>
              )}
            </div>
          )}
        </div>

        {exam.status === 'in_progress' && (
          <div style={{ marginBottom: 16 }}>
            <Progress
              percent={totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0}
              format={() => `已答 ${answeredCount}/${totalQuestions} 题`}
            />
          </div>
        )}

        {questionCards}

        {exam.status === 'in_progress' && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Button type="primary" size="large" onClick={handleSubmit} loading={loading}>
              提交试卷
            </Button>
          </div>
        )}
      </Card>

      {/* 批阅Modal */}
      <Modal
        title="批阅题目"
        open={gradingModal.visible}
        onOk={async () => {
          try {
            const values = await gradingForm.validateFields();
            setLoading(true);
            const gradeData = {
              questionId: gradingModal.questionId,
              score: values.score,
              comment: values.comment || ''
            };
            
            // 对于客观题，可以设置 isCorrect（Switch 返回的是布尔值）
            if (values.isCorrect !== undefined && values.isCorrect !== null) {
              gradeData.isCorrect = values.isCorrect === true || values.isCorrect === 'true';
            }
            
            await api.put(`/api/exams/${id}/grade`, gradeData);
            message.success('批阅成功');
            setGradingModal({ visible: false, questionId: null, question: null, answerItem: null });
            gradingForm.resetFields();
            await fetchExam();
          } catch (error) {
            if (error.response?.data?.message) {
              message.error(error.response.data.message);
            } else {
              message.error('批阅失败');
            }
          } finally {
            setLoading(false);
          }
        }}
        onCancel={() => {
          setGradingModal({ visible: false, questionId: null, question: null, answerItem: null });
          gradingForm.resetFields();
        }}
        confirmLoading={loading}
        width={600}
      >
        <Form form={gradingForm} layout="vertical">
          <Form.Item label="题目内容">
            <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
              {gradingModal.question?.content}
            </div>
          </Form.Item>
          <Form.Item label="学生答案">
            <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 4, whiteSpace: 'pre-wrap' }}>
              {gradingModal.answerItem?.answer || '未作答'}
            </div>
          </Form.Item>
          <Form.Item
            label="得分"
            name="score"
            rules={[
              { required: true, message: '请输入得分' },
              { type: 'number', min: 0, max: gradingModal.maxScore || 10, message: `分数应在0-${gradingModal.maxScore || 10}之间` }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={gradingModal.maxScore || 10}
              precision={1}
              placeholder={`请输入得分（0-${gradingModal.maxScore || 10}分）`}
            />
          </Form.Item>
          {/* 客观题显示"是否正确"选项 */}
          {gradingModal.question && ['single', 'multiple', 'judge', 'fill'].includes(gradingModal.question.type) && (
            <Form.Item
              label="是否正确"
              name="isCorrect"
              valuePropName="checked"
              tooltip="客观题可以标记为正确或错误"
            >
              <Switch
                checkedChildren="正确"
                unCheckedChildren="错误"
              />
            </Form.Item>
          )}
          <Form.Item
            label="评语"
            name="comment"
          >
            <TextArea
              rows={4}
              placeholder="请输入评语（可选）"
            />
          </Form.Item>
          <div style={{ color: '#8c8c8c', fontSize: '12px' }}>
            满分：{gradingModal.maxScore || 10} 分
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ExamDetail;
