import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Button, Space, Popconfirm, message, Tag, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const PaperList = () => {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const navigate = useNavigate();

  const fetchPapers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/papers', {
        params: { page: pagination.current, limit: pagination.pageSize }
      });
      setPapers(res.data.papers || []);
      setPagination(prev => ({ ...prev, total: res.data.total || 0 }));
    } catch (error) {
      message.error(error.response?.data?.message || '获取试卷列表失败');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current, pagination.pageSize]);

  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/papers/${id}`);
      message.success('删除成功');
      fetchPapers();
    } catch (error) {
      message.error(error.response?.data?.message || '删除失败');
    }
  };

  const handlePublish = async (id, currentStatus) => {
    try {
      await api.put(`/api/papers/${id}/publish`);
      message.success(currentStatus === 'published' ? '取消发布成功' : '发布成功');
      fetchPapers();
    } catch (error) {
      message.error(error.response?.data?.message || '操作失败');
    }
  };

  const columns = useMemo(() => [
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
      width: 80,
      render: (score) => <Tag color="blue">{score} 分</Tag>
    },
    {
      title: '时长（分钟）',
      dataIndex: 'duration',
      key: 'duration',
      width: 120,
    },
    {
      title: '题目数',
      dataIndex: 'questions',
      key: 'questions',
      width: 100,
      render: (questions) => {
        const count = Array.isArray(questions) ? questions.length : 0;
        return <Tag>{count} 道</Tag>;
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag 
          icon={status === 'published' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          color={status === 'published' ? 'success' : 'default'}
        >
          {status === 'published' ? '已发布' : '草稿'}
        </Tag>
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
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/papers/edit/${record.id || record._id}`)}
            >
              查看
            </Button>
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigate(`/papers/edit/${record.id || record._id}`)}
            >
              编辑
            </Button>
          </Tooltip>
          <Tooltip title={record.status === 'published' ? '取消发布' : '发布'}>
            <Button
              type="link"
              size="small"
              onClick={() => handlePublish(record.id || record._id, record.status)}
            >
              {record.status === 'published' ? '取消发布' : '发布'}
            </Button>
          </Tooltip>
          <Popconfirm
            title="确定删除此试卷吗？"
            description="删除后无法恢复，请谨慎操作"
            onConfirm={() => handleDelete(record.id || record._id)}
            okText="确定"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="删除">
              <Button 
                type="link" 
                danger 
                size="small"
                icon={<DeleteOutlined />}
              >
                删除
              </Button>
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [navigate]);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/papers/new')}
        >
          新增试卷
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={papers}
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

export default PaperList;
