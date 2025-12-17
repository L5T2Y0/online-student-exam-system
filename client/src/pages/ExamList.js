import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { Table, Button, Tag, message, Space, Tooltip, Tabs, Popconfirm } from 'antd';
import { EyeOutlined, PlayCircleOutlined, FileTextOutlined, ClockCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { AuthContext } from '../contexts/AuthContext';

const ExamList = () => {
  const [exams, setExams] = useState([]);
  const [availablePapers, setAvailablePapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [papersLoading, setPapersLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [papersPagination, setPapersPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  // 根据用户角色设置初始标签页
  const [activeTab, setActiveTab] = useState(() => {
    return user?.role === 'student' ? 'available' : 'my-exams';
  });

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/exams/my/list', {
        params: { page: pagination.current, limit: pagination.pageSize }
      });
      setExams(res.data.exams || []);
      setPagination(prev => ({ ...prev, total: res.data.total || 0 }));
    } catch (error) {
      message.error(error.response?.data?.message || '获取考试列表失败');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current, pagination.pageSize]);

  const fetchAvailablePapers = useCallback(async () => {
    setPapersLoading(true);
    try {
      const res = await api.get('/api/papers', {
        params: { 
          page: papersPagination.current, 
          limit: papersPagination.pageSize,
          status: 'published'
        }
      });
      setAvailablePapers(res.data.papers || []);
      setPapersPagination(prev => ({ ...prev, total: res.data.total || 0 }));
    } catch (error) {
      message.error(error.response?.data?.message || '获取试卷列表失败');
    } finally {
      setPapersLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [papersPagination.current, papersPagination.pageSize]);

  useEffect(() => {
    if (activeTab === 'my-exams') {
      fetchExams();
    } else {
      fetchAvailablePapers();
    }
  }, [activeTab, fetchExams, fetchAvailablePapers]);

  const handleStartExam = useCallback(async (paperId) => {
    try {
      const res = await api.post('/api/exams/start', { paperId });
      navigate(`/exams/${res.data.exam.id || res.data.exam._id}`);
    } catch (error) {
      message.error(error.response?.data?.message || '开始考试失败');
    }
  }, [navigate]);

  const handleDelete = useCallback(async (examId) => {
    try {
      await api.delete(`/api/scores/${examId}`);
      message.success('删除成功');
      fetchExams();
    } catch (error) {
      message.error(error.response?.data?.message || '删除失败');
    }
  }, [fetchExams]);

  const columns = useMemo(() => [
    {
      title: '试卷名称',
      key: 'title',
      ellipsis: {
        showTitle: false,
      },
      render: (_, record) => {
        const paper = record.paper || record.paperId;
        const title = paper?.title || '-';
        return (
          <Tooltip placement="topLeft" title={title}>
            <span style={{ fontWeight: 500 }}>{title}</span>
          </Tooltip>
        );
      },
    },
    {
      title: '科目',
      key: 'subject',
      width: 120,
      render: (_, record) => {
        const paper = record.paper || record.paperId;
        return paper?.subject || '-';
      },
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 180,
      render: (time) => time ? new Date(time).toLocaleString('zh-CN') : '-',
    },
    {
      title: '提交时间',
      dataIndex: 'submitTime',
      key: 'submitTime',
      width: 180,
      render: (time) => time ? new Date(time).toLocaleString('zh-CN') : '-',
    },
    {
      title: '得分',
      dataIndex: 'totalScore',
      key: 'totalScore',
      width: 120,
      render: (score, record) => {
        if (record.status === 'in_progress') return <Tag>-</Tag>;
        const totalScore = record.paper?.totalScore || 0;
        const currentScore = parseFloat(score) || 0;
        const rate = totalScore > 0 ? (currentScore / totalScore * 100).toFixed(1) : 0;
        return (
          <Space direction="vertical" size={0}>
            <span style={{ fontWeight: 'bold' }}>{currentScore} / {totalScore}</span>
            <Tag color={rate >= 60 ? 'success' : 'error'}>{rate}%</Tag>
          </Space>
        );
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const statusMap = {
          in_progress: { text: '进行中', color: 'processing' },
          submitted: { text: '已提交', color: 'default' },
          graded: { text: '已批阅', color: 'success' }
        };
        const s = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={s.color}>{s.text}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {record.status === 'in_progress' ? (
            <Tooltip title="继续考试">
              <Button
                type="primary"
                size="small"
                icon={<PlayCircleOutlined />}
                onClick={() => navigate(`/exams/${record.id || record._id}`)}
              >
                继续考试
              </Button>
            </Tooltip>
          ) : (
            <>
              <Tooltip title="查看详情">
                <Button
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => navigate(`/exams/${record.id || record._id}`)}
                >
                  查看详情
                </Button>
              </Tooltip>
              <Popconfirm
                title="确定要删除这条考试记录吗？"
                description="删除后将无法恢复"
                onConfirm={() => handleDelete(record.id || record._id)}
                okText="确定"
                cancelText="取消"
              >
                <Tooltip title="删除记录">
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                  >
                    删除
                  </Button>
                </Tooltip>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ], [navigate, handleDelete]);

  const availablePapersColumns = useMemo(() => [
    {
      title: '试卷名称',
      dataIndex: 'title',
      key: 'title',
      ellipsis: {
        showTitle: false,
      },
      render: (title) => (
        <Tooltip placement="topLeft" title={title}>
          <span style={{ fontWeight: 500 }}>{title}</span>
        </Tooltip>
      ),
    },
    {
      title: '科目',
      dataIndex: 'subject',
      key: 'subject',
      width: 120,
    },
    {
      title: '总分',
      dataIndex: 'totalScore',
      key: 'totalScore',
      width: 100,
      render: (score) => <Tag color="blue">{score} 分</Tag>,
    },
    {
      title: '时长',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (duration) => (
        <Space>
          <ClockCircleOutlined />
          <span>{duration} 分钟</span>
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: {
        showTitle: false,
      },
      render: (desc) => (
        <Tooltip placement="topLeft" title={desc}>
          <span style={{ color: '#8c8c8c' }}>{desc || '-'}</span>
        </Tooltip>
      ),
    },
    {
      title: '补考',
      dataIndex: 'allowRetake',
      key: 'allowRetake',
      width: 100,
      render: (allowRetake) => (
        <Tag color={allowRetake ? 'green' : 'red'}>
          {allowRetake ? '允许' : '不允许'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        user?.role === 'student' ? (
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => handleStartExam(record.id)}
          >
            开始考试
          </Button>
        ) : (
          <Tooltip title="只有学生可以参加考试">
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              disabled
            >
              开始考试
            </Button>
          </Tooltip>
        )
      ),
    },
  ], [handleStartExam, user?.role]);

  const tabItems = useMemo(() => [
    {
      key: 'available',
      label: (
        <span>
          <FileTextOutlined />
          可用试卷
        </span>
      ),
      children: (
        <Table
          columns={availablePapersColumns}
          dataSource={availablePapers}
          rowKey={(record) => record.id || record._id}
          loading={papersLoading}
          pagination={{
            current: papersPagination.current,
            pageSize: papersPagination.pageSize,
            total: papersPagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          onChange={(newPagination) => setPapersPagination(prev => ({ ...prev, ...newPagination }))}
          scroll={{ x: 1000 }}
        />
      ),
    },
    {
      key: 'my-exams',
      label: (
        <span>
          <ClockCircleOutlined />
          我的考试
        </span>
      ),
      children: (
        <Table
          columns={columns}
          dataSource={exams}
          rowKey={(record) => record.id || record._id}
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          onChange={(newPagination) => setPagination(prev => ({ ...prev, ...newPagination }))}
          scroll={{ x: 1200 }}
        />
      ),
    },
  ], [availablePapersColumns, availablePapers, papersLoading, papersPagination, columns, exams, loading, pagination]);

  // 只有学生可以看到"可用试卷"标签页
  const filteredTabItems = useMemo(() => {
    if (user?.role === 'student') {
      return tabItems;
    }
    // 教师和管理员只显示"我的考试"标签页（虽然他们不应该有考试记录）
    return tabItems.filter(item => item.key === 'my-exams');
  }, [tabItems, user?.role]);

  // 当用户角色改变时，调整活动标签页
  useEffect(() => {
    if (user?.role !== 'student' && activeTab === 'available') {
      setActiveTab('my-exams');
    }
  }, [user?.role, activeTab]);

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>
        {user?.role === 'student' ? '我的考试' : '考试管理'}
      </h2>
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab} 
        items={filteredTabItems}
        onTabClick={(key) => {
          if (key === 'available' && user?.role !== 'student') {
            message.warning('只有学生可以参加考试');
            return;
          }
          setActiveTab(key);
        }}
      />
    </div>
  );
};

export default ExamList;
