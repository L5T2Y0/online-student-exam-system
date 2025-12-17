import React, { useState, useEffect } from 'react';
import { Card, Tag, Select, message } from 'antd';
import api from '../utils/api';

const { Option } = Select;

const WrongQuestions = () => {
  const [wrongQuestions, setWrongQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');

  useEffect(() => {
    fetchSubjects();
    fetchWrongQuestions();
  }, [selectedSubject]);

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/api/questions/stats/categories');
      setSubjects(res.data.subjects);
    } catch (error) {
      console.error('获取科目列表失败');
    }
  };

  const fetchWrongQuestions = async () => {
    setLoading(true);
    try {
      const params = selectedSubject ? { subject: selectedSubject } : {};
      const res = await api.get('/api/scores/wrong-questions', { params });
      setWrongQuestions(res.data.questions);
    } catch (error) {
      message.error('获取错题失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Select
          placeholder="筛选科目"
          style={{ width: 200 }}
          allowClear
          onChange={(value) => setSelectedSubject(value)}
        >
          {subjects.map(subject => (
            <Option key={subject} value={subject}>{subject}</Option>
          ))}
        </Select>
      </div>
      {wrongQuestions.map((item, index) => (
        <Card
          key={index}
          title={`错题 ${index + 1} - ${item.paperTitle}`}
          style={{ marginBottom: 16 }}
        >
          <div style={{ marginBottom: 8 }}>
            <strong>题目：</strong>{item.question.content}
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong>我的答案：</strong>
            <Tag color="red">{String(item.myAnswer)}</Tag>
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong>正确答案：</strong>
            <Tag color="green">{String(item.correctAnswer)}</Tag>
          </div>
          {item.explanation && (
            <div style={{ marginBottom: 8 }}>
              <strong>解析：</strong>{item.explanation}
            </div>
          )}
          <div style={{ color: '#999', fontSize: 12 }}>
            考试时间：{new Date(item.examDate).toLocaleString('zh-CN')}
          </div>
        </Card>
      ))}
      {wrongQuestions.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
          暂无错题
        </div>
      )}
    </div>
  );
};

export default WrongQuestions;

