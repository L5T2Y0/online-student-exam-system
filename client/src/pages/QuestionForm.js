import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Select, InputNumber, message, Card, Space } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';

const { Option } = Select;
const { TextArea } = Input;

const QuestionForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [questionType, setQuestionType] = useState('single');

  useEffect(() => {
    if (isEdit) {
      fetchQuestion();
    }
  }, [id]);

  const fetchQuestion = async () => {
    try {
      const res = await api.get(`/api/questions/${id}`);
      const question = res.data.question;
      form.setFieldsValue(question);
      setQuestionType(question.type);
    } catch (error) {
      message.error('获取题目失败');
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/api/questions/${id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/api/questions', values);
        message.success('创建成功');
      }
      navigate('/questions');
    } catch (error) {
      message.error(error.response?.data?.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const renderAnswerInput = () => {
    switch (questionType) {
      case 'single':
        return (
          <Form.Item
            name="correctAnswer"
            label="正确答案"
            rules={[{ required: true, message: '请输入正确答案（选项序号，如A、B）' }]}
          >
            <Input placeholder="如：A" />
          </Form.Item>
        );
      case 'multiple':
        return (
          <Form.Item
            name="correctAnswer"
            label="正确答案"
            rules={[{ required: true, message: '请输入正确答案（多个选项，用逗号分隔）' }]}
          >
            <Input placeholder="如：A,B,C" />
          </Form.Item>
        );
      case 'judge':
        return (
          <Form.Item
            name="correctAnswer"
            label="正确答案"
            rules={[{ required: true }]}
          >
            <Select placeholder="选择答案">
              <Option value="true">正确</Option>
              <Option value="false">错误</Option>
            </Select>
          </Form.Item>
        );
      case 'fill':
        return (
          <Form.Item
            name="correctAnswer"
            label="正确答案"
            rules={[{ required: true, message: '请输入正确答案' }]}
          >
            <Input placeholder="填空题答案" />
          </Form.Item>
        );
      case 'essay':
        return (
          <Form.Item
            name="correctAnswer"
            label="参考答案"
          >
            <TextArea rows={4} placeholder="简答题参考答案（供教师批阅参考）" />
          </Form.Item>
        );
      default:
        return null;
    }
  };

  return (
    <Card title={isEdit ? '编辑题目' : '新增题目'}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ difficulty: 'medium', score: 5 }}
      >
        <Form.Item
          name="type"
          label="题型"
          rules={[{ required: true }]}
        >
          <Select onChange={(value) => setQuestionType(value)}>
            <Option value="single">单选题</Option>
            <Option value="multiple">多选题</Option>
            <Option value="judge">判断题</Option>
            <Option value="fill">填空题</Option>
            <Option value="essay">简答题</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="subject"
          label="科目"
          rules={[{ required: true, message: '请输入科目' }]}
        >
          <Input placeholder="如：数学、语文" />
        </Form.Item>

        <Form.Item
          name="chapter"
          label="章节"
          rules={[{ required: true, message: '请输入章节' }]}
        >
          <Input placeholder="如：第一章、第二章" />
        </Form.Item>

        <Form.Item
          name="difficulty"
          label="难度"
          rules={[{ required: true }]}
        >
          <Select>
            <Option value="easy">简单</Option>
            <Option value="medium">中等</Option>
            <Option value="hard">困难</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="content"
          label="题目内容"
          rules={[{ required: true, message: '请输入题目内容' }]}
        >
          <TextArea rows={4} placeholder="请输入题目内容" />
        </Form.Item>

        {(questionType === 'single' || questionType === 'multiple') && (
          <Form.Item
            name="options"
            label="选项"
            rules={[{ required: true, message: '请添加选项' }]}
          >
            <Form.List name="options">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                      <Form.Item
                        {...restField}
                        name={[name, 'label']}
                        rules={[{ required: true, message: '选项标签' }]}
                      >
                        <Input placeholder="选项标签（如A）" style={{ width: 100 }} />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'content']}
                        rules={[{ required: true, message: '选项内容' }]}
                      >
                        <Input placeholder="选项内容" style={{ width: 400 }} />
                      </Form.Item>
                      <Button onClick={() => remove(name)}>删除</Button>
                    </Space>
                  ))}
                  <Button type="dashed" onClick={() => add()} block>
                    添加选项
                  </Button>
                </>
              )}
            </Form.List>
          </Form.Item>
        )}

        {renderAnswerInput()}

        <Form.Item
          name="score"
          label="分值"
          rules={[{ required: true }]}
        >
          <InputNumber min={1} max={100} />
        </Form.Item>

        <Form.Item
          name="explanation"
          label="解析"
        >
          <TextArea rows={3} placeholder="题目解析（可选）" />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {isEdit ? '更新' : '创建'}
            </Button>
            <Button onClick={() => navigate('/questions')}>
              取消
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default QuestionForm;

