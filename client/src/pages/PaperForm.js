import React, { useState, useEffect } from 'react';
import { Form, Input, Button, InputNumber, message, Card, Space, Table, Modal, Select, Tag, Switch, DatePicker } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../utils/api';

const { Option } = Select;
const { TextArea } = Input;

const PaperForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [autoGenerateVisible, setAutoGenerateVisible] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (isEdit && questions.length > 0) {
      fetchPaper();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, questions.length]);

  const fetchPaper = async () => {
    try {
      const res = await api.get(`/api/papers/${id}`);
      const paper = res.data.paper;
      const formValues = {
        ...paper,
        startTime: paper.startTime ? dayjs(paper.startTime) : null,
        endTime: paper.endTime ? dayjs(paper.endTime) : null
      };
      form.setFieldsValue(formValues);
      
      // 处理题目数据：统一格式为 { questionId: 数字ID, question: 题目对象, score, order }
      const formattedQuestions = (paper.questions || []).map((q, index) => {
        if (q.questionId && typeof q.questionId === 'object') {
          const questionObj = q.questionId;
          const questionScore = q.score !== undefined && q.score !== null ? q.score : (questionObj.score || 5);
          return {
            questionId: questionObj.id || questionObj._id,
            question: questionObj,
            score: questionScore,
            order: q.order || index + 1
          };
        }
        const questionId = q.questionId;
        const question = questions.find(qq => (qq.id || qq._id) === questionId);
        const questionScore = q.score !== undefined && q.score !== null ? q.score : (question?.score || 5);
        return {
          questionId: questionId,
          question: question || null,
          score: questionScore,
          order: q.order || index + 1
        };
      });
      
      setSelectedQuestions(formattedQuestions);
    } catch (error) {
      message.error('获取试卷失败');
    }
  };

  const fetchQuestions = async () => {
    try {
      const res = await api.get('/api/questions?limit=1000');
      setQuestions(res.data.questions);
    } catch (error) {
      console.error('获取题目列表失败');
    }
  };

  const handleAddQuestion = (question) => {
    const questionId = question.id || question._id;
    const exists = selectedQuestions.find(q => {
      const qId = typeof q.questionId === 'object' ? (q.questionId.id || q.questionId._id) : q.questionId;
      return qId === questionId;
    });
    if (exists) {
      message.warning('该题目已添加');
      return;
    }
    const newQuestions = [...selectedQuestions, {
      questionId: questionId,
      question: question,
      score: question.score || 5,
      order: selectedQuestions.length + 1
    }];
    setSelectedQuestions(newQuestions);
    // 自动更新总分
    const newTotalScore = newQuestions.reduce((sum, q) => sum + (q.score || 0), 0);
    form.setFieldsValue({ totalScore: newTotalScore });
    setModalVisible(false);
  };

  const handleRemoveQuestion = (questionId) => {
    const newQuestions = selectedQuestions.filter(q => q.questionId !== questionId);
    setSelectedQuestions(newQuestions);
    const newTotalScore = newQuestions.reduce((sum, q) => sum + (q.score || 0), 0);
    form.setFieldsValue({ totalScore: newTotalScore });
  };

  const handleAutoGenerate = async (values) => {
    try {
      const rules = values.rules.map(rule => ({
        type: rule.type,
        difficulty: rule.difficulty,
        chapter: rule.chapter,
        count: rule.count,
        score: rule.score
      }));

      const totalScore = rules.reduce((sum, rule) => sum + rule.count * rule.score, 0);

      await api.post('/api/papers/auto-generate', {
        title: values.title,
        description: values.description,
        subject: values.subject,
        totalScore,
        duration: values.duration,
        rules
      });

      message.success('自动组卷成功');
      navigate('/papers');
    } catch (error) {
      message.error(error.response?.data?.message || '自动组卷失败');
    }
  };

  const onFinish = async (values) => {
    if (selectedQuestions.length === 0) {
      message.error('请至少添加一道题目');
      return;
    }

    // 自动计算总分：所有题目分数之和
    const totalScore = selectedQuestions.reduce((sum, q) => sum + (q.score || 0), 0);
    
    setLoading(true);
    try {
      const paperData = {
        ...values,
        totalScore,
        startTime: values.startTime ? values.startTime.toISOString() : null,
        endTime: values.endTime ? values.endTime.toISOString() : null,
        questions: selectedQuestions.map((q, index) => {
          const questionId = typeof q.questionId === 'object' ? (q.questionId.id || q.questionId._id) : q.questionId;
          return {
            questionId: parseInt(questionId),
            score: q.score || 5,
            order: index + 1
          };
        })
      };

      if (isEdit) {
        await api.put(`/api/papers/${id}`, paperData);
        message.success('更新成功');
      } else {
        await api.post('/api/papers', paperData);
        message.success('创建成功');
      }
      navigate('/papers');
    } catch (error) {
      message.error(error.response?.data?.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const questionColumns = [
    {
      title: '题目内容',
      dataIndex: ['question', 'content'],
      key: 'content',
      ellipsis: true,
    },
    {
      title: '题型',
      dataIndex: ['question', 'type'],
      key: 'type',
      render: (type) => {
        const typeMap = { single: '单选', multiple: '多选', judge: '判断', fill: '填空', essay: '简答' };
        return <Tag>{typeMap[type] || type}</Tag>;
      }
    },
    {
      title: '分值',
      dataIndex: 'score',
      key: 'score',
      render: (score, record) => {
        const questionScore = record.question?.score || 5;
        const paperScore = score || questionScore;
        return (
          <div>
            <InputNumber
              min={1}
              value={paperScore}
              onChange={(value) => {
                const newQuestions = selectedQuestions.map(q =>
                  q.questionId === record.questionId ? { ...q, score: value } : q
                );
                setSelectedQuestions(newQuestions);
                const newTotalScore = newQuestions.reduce((sum, q) => sum + (q.score || 0), 0);
                form.setFieldsValue({ totalScore: newTotalScore });
              }}
            />
            {paperScore !== questionScore && (
              <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                题目原分值：{questionScore} 分
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button type="link" danger onClick={() => handleRemoveQuestion(record.questionId)}>
          删除
        </Button>
      ),
    },
  ];

  return (
    <Card title={isEdit ? '编辑试卷' : '新增试卷'}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ duration: 60, totalScore: 100 }}
      >
        <Form.Item
          name="title"
          label="试卷名称"
          rules={[{ required: true, message: '请输入试卷名称' }]}
        >
          <Input placeholder="试卷名称" />
        </Form.Item>

        <Form.Item
          name="description"
          label="试卷描述"
        >
          <TextArea rows={3} placeholder="试卷描述（可选）" />
        </Form.Item>

        <Form.Item
          name="subject"
          label="科目"
          rules={[{ required: true, message: '请输入科目' }]}
        >
          <Input placeholder="如：数学、语文" />
        </Form.Item>

        <Form.Item
          name="totalScore"
          label="总分"
          rules={[{ required: true }]}
          tooltip="总分将自动计算为所有题目分数之和"
        >
          <InputNumber 
            min={1} 
            max={1000} 
            disabled
            value={selectedQuestions.reduce((sum, q) => sum + (q.score || 0), 0)}
          />
        </Form.Item>

        <Form.Item
          name="duration"
          label="考试时长（分钟）"
          rules={[{ required: true }]}
        >
          <InputNumber min={1} max={600} />
        </Form.Item>

        <Form.Item
          name="allowRetake"
          label="是否允许补考"
          valuePropName="checked"
          initialValue={true}
          tooltip="开启后，学生可以多次参加此考试；关闭后，学生只能参加一次"
        >
          <Switch 
            checkedChildren="允许补考" 
            unCheckedChildren="不允许补考"
          />
        </Form.Item>

        <Form.Item
          name="startTime"
          label="考试开始时间（可选）"
          tooltip="设置后，学生只能在此时间之后开始考试。不设置则随时可以开始。"
        >
          <DatePicker
            showTime
            format="YYYY-MM-DD HH:mm:ss"
            placeholder="选择开始时间"
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item
          name="endTime"
          label="考试结束时间（可选）"
          tooltip="设置后，学生只能在此时间之前开始考试。不设置则随时可以开始。"
        >
          <DatePicker
            showTime
            format="YYYY-MM-DD HH:mm:ss"
            placeholder="选择结束时间"
            style={{ width: '100%' }}
          />
        </Form.Item>

        <div style={{ marginBottom: 16 }}>
          <Space>
            <Button type="primary" onClick={() => setModalVisible(true)}>
              手动添加题目
            </Button>
            <Button onClick={() => setAutoGenerateVisible(true)}>
              自动组卷
            </Button>
          </Space>
        </div>

        <Table
          columns={questionColumns}
          dataSource={selectedQuestions}
          rowKey="questionId"
          pagination={false}
        />

        <Form.Item style={{ marginTop: 24 }}>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {isEdit ? '更新' : '创建'}
            </Button>
            <Button onClick={() => navigate('/papers')}>
              取消
            </Button>
          </Space>
        </Form.Item>
      </Form>

      <Modal
        title="选择题目"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <Table
          dataSource={questions}
          rowKey={(record) => record.id || record._id}
          columns={[
            { title: '题目内容', dataIndex: 'content', key: 'content', ellipsis: true },
            { title: '题型', dataIndex: 'type', key: 'type' },
            { title: '科目', dataIndex: 'subject', key: 'subject' },
            {
              title: '操作',
              key: 'action',
              render: (_, record) => (
                <Button type="link" onClick={() => handleAddQuestion(record)}>
                  添加
                </Button>
              ),
            },
          ]}
          pagination={{ pageSize: 10 }}
        />
      </Modal>

      <Modal
        title="自动组卷"
        open={autoGenerateVisible}
        onCancel={() => setAutoGenerateVisible(false)}
        footer={null}
      >
        <Form onFinish={handleAutoGenerate} layout="vertical">
          <Form.Item name="title" label="试卷名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="试卷描述">
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item name="subject" label="科目" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="duration" label="考试时长（分钟）" rules={[{ required: true }]}>
            <InputNumber min={1} />
          </Form.Item>
          <Form.List name="rules">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item {...restField} name={[name, 'type']} label="题型" rules={[{ required: true }]}>
                      <Select style={{ width: 100 }}>
                        <Option value="single">单选</Option>
                        <Option value="multiple">多选</Option>
                        <Option value="judge">判断</Option>
                        <Option value="fill">填空</Option>
                        <Option value="essay">简答</Option>
                      </Select>
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'difficulty']} label="难度">
                      <Select style={{ width: 100 }} allowClear>
                        <Option value="easy">简单</Option>
                        <Option value="medium">中等</Option>
                        <Option value="hard">困难</Option>
                      </Select>
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'count']} label="数量" rules={[{ required: true }]}>
                      <InputNumber min={1} style={{ width: 80 }} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'score']} label="分值" rules={[{ required: true }]}>
                      <InputNumber min={1} style={{ width: 80 }} />
                    </Form.Item>
                    <Button onClick={() => remove(name)}>删除</Button>
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} block>
                  添加规则
                </Button>
              </>
            )}
          </Form.List>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              生成试卷
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default PaperForm;

