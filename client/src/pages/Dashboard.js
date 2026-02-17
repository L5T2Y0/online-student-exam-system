import React, { useContext } from 'react';
import { Card, Row, Col, Statistic, Typography, Space, Tag, Divider } from 'antd';
import { 
  QuestionCircleOutlined, 
  FileTextOutlined, 
  TrophyOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import api from '../utils/api';
import './Dashboard.css';

const { Title, Paragraph } = Typography;

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = React.useState({
    questionCount: 0,
    paperCount: 0,
    examCount: 0,
    scoreCount: 0,
    inProgressCount: 0,
    pendingCount: 0,
    wrongCount: 0,
    userCount: 0
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (user) {
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      if (user?.role === 'teacher' || user?.role === 'admin') {
        const [questionsRes, papersRes, scoresRes, usersRes] = await Promise.all([
          api.get('/api/questions', { params: { limit: 1 } }).catch(err => {
            console.error('获取题目统计失败:', err);
            return { data: { total: 0 } };
          }),
          api.get('/api/papers', { params: { limit: 1 } }).catch(err => {
            console.error('获取试卷统计失败:', err);
            return { data: { total: 0 } };
          }),
          api.get('/api/scores', { params: { page: 1, limit: 1000, status: 'submitted' } }).catch(err => {
            console.error('获取待批阅统计失败:', err);
            return { data: { total: 0, exams: [] } };
          }),
          // 管理员获取用户统计
          user?.role === 'admin' ? api.get('/api/users', { params: { limit: 1 } }).catch(err => {
            console.error('获取用户统计失败:', err);
            return { data: { total: 0 } };
          }) : Promise.resolve({ data: { total: 0 } })
        ]);
        
        // 统计待批阅的考试（状态为 submitted）
        const pendingExams = scoresRes.data?.exams || [];
        const pendingCount = pendingExams.filter(exam => exam.status === 'submitted').length;
        
        setStats({
          questionCount: questionsRes.data?.total || 0,
          paperCount: papersRes.data?.total || 0,
          examCount: 0,
          scoreCount: 0,
          pendingCount: pendingCount,
          userCount: usersRes.data?.total || 0
        });
      } else if (user?.role === 'student') {
        try {
          const [examsRes, scoresRes, wrongRes] = await Promise.all([
            api.get('/api/exams/my/list', { params: { page: 1, limit: 1000 } }).catch(err => {
              console.error('获取考试统计失败:', err);
              return { data: { total: 0, exams: [] } };
            }),
            api.get('/api/scores', { params: { page: 1, limit: 1 } }).catch(err => {
              console.error('获取成绩统计失败:', err);
              return { data: { total: 0, exams: [] } };
            }),
            api.get('/api/scores/wrong-questions', { params: { limit: 1000 } }).catch(err => {
              console.error('获取错题统计失败:', err);
              return { data: { questions: [] } };
            })
          ]);
          
          const examTotal = examsRes.data?.total || 0;
          const scoreTotal = scoresRes.data?.total || 0;
          const wrongCount = wrongRes.data?.questions?.length || 0;
          
          // 统计进行中的考试数量
          const exams = examsRes.data?.exams || [];
          const inProgressCount = exams.filter(exam => exam.status === 'in_progress').length;
          
          setStats({
            questionCount: 0,
            paperCount: 0,
            examCount: examTotal,
            scoreCount: scoreTotal,
            inProgressCount: inProgressCount,
            wrongCount: wrongCount
          });
        } catch (error) {
          console.error('获取学生统计失败:', error);
          setStats({
            questionCount: 0,
            paperCount: 0,
            examCount: 0,
            scoreCount: 0,
            inProgressCount: 0,
            wrongCount: 0
          });
        }
      }
    } catch (error) {
      console.error('获取统计信息失败:', error);
      // 即使出错也设置默认值
      setStats({
        questionCount: 0,
        paperCount: 0,
        examCount: 0,
        scoreCount: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleText = (role) => {
    const roleMap = {
      admin: '系统管理员',
      teacher: '教师',
      student: '学生'
    };
    return roleMap[role] || role;
  };

  const StatCard = ({ title, value, prefix, color, icon, onClick }) => (
    <Col xs={24} sm={12} lg={6}>
      <Card 
        className="stat-card" 
        hoverable={!!onClick}
        onClick={onClick}
        loading={loading}
      >
        <Statistic
          title={title}
          value={value}
          prefix={prefix}
          valueStyle={{ color, fontSize: '28px', fontWeight: 'bold' }}
        />
        <div className="stat-icon" style={{ color }}>
          {icon}
        </div>
      </Card>
    </Col>
  );

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <Title level={2} className="welcome-title">
          欢迎回来，{user?.name}！
        </Title>
        <Paragraph type="secondary" className="welcome-subtitle">
          {getRoleText(user?.role)} · 今天是 {new Date().toLocaleDateString('zh-CN', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'long'
          })}
        </Paragraph>
      </div>

      <Divider />

      <Row gutter={[24, 24]} className="stats-row">
        {(user?.role === 'teacher' || user?.role === 'admin') && (
          <>
            <StatCard
              title="题目总数"
              value={stats.questionCount}
              prefix={<QuestionCircleOutlined />}
              color="#52c41a"
              icon={<QuestionCircleOutlined style={{ fontSize: '48px' }} />}
              onClick={() => navigate('/questions')}
            />
            <StatCard
              title="试卷总数"
              value={stats.paperCount}
              prefix={<FileTextOutlined />}
              color="#1890ff"
              icon={<FileTextOutlined style={{ fontSize: '48px' }} />}
              onClick={() => navigate('/papers')}
            />
            <StatCard
              title="待批阅试卷"
              value={stats.pendingCount || 0}
              prefix={<ClockCircleOutlined />}
              color="#fa8c16"
              icon={<ClockCircleOutlined style={{ fontSize: '48px' }} />}
              onClick={() => navigate('/scores')}
            />
            {user?.role === 'admin' && (
              <StatCard
                title="用户总数"
                value={stats.userCount || 0}
                prefix={<CheckCircleOutlined />}
                color="#722ed1"
                icon={<CheckCircleOutlined style={{ fontSize: '48px' }} />}
                onClick={() => navigate('/users')}
              />
            )}
            {user?.role === 'teacher' && (
              <StatCard
                title="已发布试卷"
                value={stats.paperCount}
                prefix={<CheckCircleOutlined />}
                color="#722ed1"
                icon={<CheckCircleOutlined style={{ fontSize: '48px' }} />}
              />
            )}
          </>
        )}
        {user?.role === 'student' && (
          <>
            <StatCard
              title="我的考试"
              value={stats.examCount}
              prefix={<FileTextOutlined />}
              color="#1890ff"
              icon={<FileTextOutlined style={{ fontSize: '48px' }} />}
              onClick={() => navigate('/exams')}
            />
            <StatCard
              title="已完成考试"
              value={stats.scoreCount}
              prefix={<TrophyOutlined />}
              color="#52c41a"
              icon={<TrophyOutlined style={{ fontSize: '48px' }} />}
              onClick={() => navigate('/scores')}
            />
            <StatCard
              title="进行中"
              value={stats.inProgressCount || 0}
              prefix={<ClockCircleOutlined />}
              color="#fa8c16"
              icon={<ClockCircleOutlined style={{ fontSize: '48px' }} />}
            />
            <StatCard
              title="错题数量"
              value={stats.wrongCount || 0}
              prefix={<QuestionCircleOutlined />}
              color="#ff4d4f"
              icon={<QuestionCircleOutlined style={{ fontSize: '48px' }} />}
              onClick={() => navigate('/scores/wrong')}
            />
          </>
        )}
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card className="info-card" title="系统信息">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Tag color="blue">系统版本</Tag>
                <span style={{ marginLeft: 8 }}>v1.0.0</span>
              </div>
              <div>
                <Tag color="green">数据库</Tag>
                <span style={{ marginLeft: 8 }}>MySQL 5.7+</span>
              </div>
              <div>
                <Tag color="purple">框架</Tag>
                <span style={{ marginLeft: 8 }}>React + Node.js</span>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card className="info-card" title="快速操作">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {user?.role === 'teacher' || user?.role === 'admin' ? (
                <>
                  <button type="button" onClick={() => navigate('/questions/new')} style={{ background: 'none', border: 'none', padding: 0, color: '#1890ff', cursor: 'pointer', textAlign: 'left' }}>创建新题目</button>
                  <button type="button" onClick={() => navigate('/papers/new')} style={{ background: 'none', border: 'none', padding: 0, color: '#1890ff', cursor: 'pointer', textAlign: 'left' }}>创建新试卷</button>
                  <button type="button" onClick={() => navigate('/scores/stats')} style={{ background: 'none', border: 'none', padding: 0, color: '#1890ff', cursor: 'pointer', textAlign: 'left' }}>查看成绩统计</button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => navigate('/exams')} style={{ background: 'none', border: 'none', padding: 0, color: '#1890ff', cursor: 'pointer', textAlign: 'left' }}>开始考试</button>
                  <button type="button" onClick={() => navigate('/scores')} style={{ background: 'none', border: 'none', padding: 0, color: '#1890ff', cursor: 'pointer', textAlign: 'left' }}>查看成绩</button>
                  <button type="button" onClick={() => navigate('/scores/wrong')} style={{ background: 'none', border: 'none', padding: 0, color: '#1890ff', cursor: 'pointer', textAlign: 'left' }}>错题回顾</button>
                </>
              )}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
