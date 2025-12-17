import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { Table, Button, Tag, message, Space, Tooltip, Popconfirm } from 'antd';
import { DownloadOutlined, EyeOutlined, TrophyOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { AuthContext } from '../contexts/AuthContext';

const ScoreList = () => {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const fetchScores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/scores', {
        params: { page: pagination.current, limit: pagination.pageSize }
      });
      setScores(res.data.exams || []);
      setPagination(prev => ({ ...prev, total: res.data.total || 0 }));
    } catch (error) {
      message.error(error.response?.data?.message || '获取成绩列表失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize]);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  const handleExport = async () => {
    try {
      const res = await api.get('/api/scores/export', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `成绩单_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success('导出成功');
    } catch (error) {
      message.error(error.response?.data?.message || '导出失败');
    }
  };

  const handleDelete = async (examId) => {
    try {
      await api.delete(`/api/scores/${examId}`);
      message.success('删除成功');
      fetchScores();
    } catch (error) {
      message.error(error.response?.data?.message || '删除失败');
    }
  };

  const columns = useMemo(() => [
    {
      title: '学号',
      key: 'studentId',
      width: 120,
      render: (_, record) => {
        const student = record.student || record.studentId;
        return student?.studentId || '-';
      },
    },
    {
      title: '姓名',
      key: 'name',
      width: 100,
      render: (_, record) => {
        const student = record.student || record.studentId;
        return student?.name || '-';
      },
    },
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
            <span>{title}</span>
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
      title: '得分',
      key: 'score',
      width: 150,
      render: (_, record) => {
        const paper = record.paper || record.paperId;
        const totalScore = paper?.totalScore || 0;
        const score = parseFloat(record.totalScore) || 0;
        const rate = totalScore > 0 ? (score / totalScore * 100).toFixed(1) : 0;
        return (
          <Space direction="vertical" size={0}>
            <span style={{ fontSize: '16px', fontWeight: 'bold', color: rate >= 60 ? '#52c41a' : '#ff4d4f' }}>
              {score} / {totalScore}
            </span>
            <Tag color={rate >= 60 ? 'success' : 'error'}>{rate}%</Tag>
          </Space>
        );
      }
    },
    {
      title: '提交时间',
      dataIndex: 'submitTime',
      key: 'submitTime',
      width: 180,
      render: (time) => time ? new Date(time).toLocaleString('zh-CN') : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status, record) => {
        const statusMap = {
          in_progress: { text: '进行中', color: 'processing' },
          submitted: { text: '已提交', color: 'default' },
          graded: { text: '已批阅', color: 'success' }
        };
        const s = statusMap[status] || { text: status, color: 'default' };
        return (
          <Space direction="vertical" size={4}>
            <Tag color={s.color} icon={<TrophyOutlined />}>{s.text}</Tag>
            {status === 'submitted' && (user?.role === 'teacher' || user?.role === 'admin') && (
              <Tag color="orange" style={{ fontSize: '12px', cursor: 'pointer' }} onClick={() => navigate(`/exams/${record.id || record._id}`)}>
                📝 待批阅
              </Tag>
            )}
          </Space>
        );
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {record.status === 'submitted' && (user?.role === 'teacher' || user?.role === 'admin') ? (
            <Tooltip title="点击进入批阅页面">
              <Button
                type="primary"
                size="small"
                onClick={() => navigate(`/exams/${record.id || record._id}`)}
              >
                📝 批阅
              </Button>
            </Tooltip>
          ) : (
            <Tooltip title="查看详情">
              <Button
                type="link"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => navigate(`/exams/${record.id || record._id}`)}
              >
                查看
              </Button>
            </Tooltip>
          )}
          {/* 学生不能删除进行中的考试，但教师和管理员可以 */}
          {(record.status !== 'in_progress' || (user?.role === 'teacher' || user?.role === 'admin')) && (
            <Popconfirm
              title="确定要删除这条考试记录吗？"
              description={
                record.status === 'in_progress' 
                  ? '该考试正在进行中，删除后将无法恢复。确定要继续吗？'
                  : '删除后将无法恢复'
              }
              onConfirm={() => handleDelete(record.id || record._id)}
              okText="确定"
              cancelText="取消"
            >
              <Tooltip title={record.status === 'in_progress' ? '删除进行中的考试记录（仅教师/管理员）' : '删除记录'}>
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                >
                  删除
                </Button>
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ], [navigate, handleDelete, user?.role]);

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>{user?.role === 'student' ? '我的成绩' : '成绩管理'}</h2>
        {(user?.role === 'teacher' || user?.role === 'admin') && (
          <Tooltip title="导出Excel格式的成绩单">
            <Button 
              type="primary" 
              icon={<DownloadOutlined />} 
              onClick={handleExport}
            >
              导出Excel
            </Button>
          </Tooltip>
        )}
      </div>
      <Table
        columns={columns}
        dataSource={scores}
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
    </div>
  );
};

export default ScoreList;
