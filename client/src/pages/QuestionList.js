import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { Table, Button, Input, Select, Space, Popconfirm, Tag, Tooltip, Upload, App } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, UploadOutlined, DownloadOutlined, FileExcelOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { debounce } from '../utils/debounce';
import { AuthContext } from '../contexts/AuthContext';

const { Option } = Select;

const QuestionList = () => {
  const { message, modal } = App.useApp();
  const { user } = useContext(AuthContext);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({});
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const navigate = useNavigate();

  // 检查是否有管理权限（教师或管理员）
  const hasManagePermission = user?.role === 'teacher' || user?.role === 'admin';

  // 防抖搜索
  const debouncedSearch = useMemo(
    () => debounce((value) => {
      setFilters(prev => ({ ...prev, content: value }));
      setPagination(prev => ({ ...prev, current: 1 }));
    }, 500),
    []
  );

  useEffect(() => {
    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current, filters.type, filters.difficulty, filters.subject, filters.chapter]);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        ...filters
      };
      const res = await api.get('/api/questions', { params });
      setQuestions(res.data.questions || []);
      setPagination(prev => ({ ...prev, total: res.data.total || 0 }));
    } catch (error) {
      message.error(error.response?.data?.message || '获取题目列表失败');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current, pagination.pageSize, filters]);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/questions/${id}`);
      message.success('删除成功');
      fetchQuestions();
    } catch (error) {
      message.error(error.response?.data?.message || '删除失败');
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的题目');
      return;
    }
    try {
      await api.delete('/api/questions/batch', { data: { ids: selectedRowKeys } });
      message.success(`成功删除${selectedRowKeys.length}道题目`);
      setSelectedRowKeys([]);
      fetchQuestions();
    } catch (error) {
      message.error(error.response?.data?.message || '批量删除失败');
    }
  };

  // 导出模板
  const handleExportTemplate = async () => {
    try {
      const res = await api.get('/api/questions/export/template', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `题目导入模板_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success('模板导出成功');
    } catch (error) {
      message.error('导出模板失败');
    }
  };

  // 导出题目
  const handleExport = async () => {
    try {
      const params = { ...filters };
      const res = await api.get('/api/questions/export', {
        params,
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `题目列表_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
    }
  };

  // 批量导入
  const handleImport = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await api.post('/api/questions/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      
      if (res.data.results.errors.length > 0) {
        modal.error({
          title: '导入完成',
          content: (
            <div>
              <p>{res.data.message}</p>
              <div style={{ marginTop: 16, maxHeight: 200, overflow: 'auto' }}>
                <strong>错误详情：</strong>
                <ul>
                  {res.data.results.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          ),
          width: 600
        });
      } else {
        message.success(res.data.message);
      }
      
      fetchQuestions();
    } catch (error) {
      message.error(error.response?.data?.message || '导入失败');
    }
    
    return false; // 阻止自动上传
  };

  const handleTableChange = (newPagination) => {
    setPagination(prev => ({ ...prev, ...newPagination }));
  };

  // 批量选择配置
  const rowSelection = hasManagePermission ? {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
    getCheckboxProps: (record) => ({
      disabled: user?.role === 'teacher' && record.createdBy?.id !== user?.id && record.createdBy !== user?.id
    })
  } : null;

  const columns = useMemo(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return [
    {
      title: '题目内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: {
        showTitle: false,
      },
      width: 300,
      render: (content) => (
        <Tooltip placement="topLeft" title={content}>
          <span>{content}</span>
        </Tooltip>
      ),
    },
    {
      title: '题型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => {
        const typeMap = {
          single: '单选',
          multiple: '多选',
          judge: '判断',
          fill: '填空',
          essay: '简答'
        };
        return <Tag color="blue">{typeMap[type] || type}</Tag>;
      }
    },
    {
      title: '科目',
      dataIndex: 'subject',
      key: 'subject',
      width: 120,
    },
    {
      title: '章节',
      dataIndex: 'chapter',
      key: 'chapter',
      width: 120,
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 100,
      render: (difficulty) => {
        const colorMap = { easy: 'green', medium: 'orange', hard: 'red' };
        const textMap = { easy: '简单', medium: '中等', hard: '困难' };
        return <Tag color={colorMap[difficulty]}>{textMap[difficulty]}</Tag>;
      }
    },
    {
      title: '分值',
      dataIndex: 'score',
      key: 'score',
      width: 80,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigate(`/questions/edit/${record.id || record._id}`)}
            >
              编辑
            </Button>
          </Tooltip>
          <Popconfirm
            title="确定删除此题吗？"
            description="删除后无法恢复"
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
    ];
  }, [navigate]);

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <Space wrap>
          <Input
            placeholder="搜索题目内容"
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            onChange={(e) => debouncedSearch(e.target.value)}
            allowClear
          />
          <Select
            placeholder="题型"
            style={{ width: 120 }}
            allowClear
            onChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
          >
            <Option value="single">单选</Option>
            <Option value="multiple">多选</Option>
            <Option value="judge">判断</Option>
            <Option value="fill">填空</Option>
            <Option value="essay">简答</Option>
          </Select>
          <Select
            placeholder="难度"
            style={{ width: 120 }}
            allowClear
            onChange={(value) => setFilters(prev => ({ ...prev, difficulty: value }))}
          >
            <Option value="easy">简单</Option>
            <Option value="medium">中等</Option>
            <Option value="hard">困难</Option>
          </Select>
        </Space>
        <Space>
          {hasManagePermission && (
            <>
              <Button
                icon={<FileExcelOutlined />}
                onClick={handleExportTemplate}
              >
                导出模板
              </Button>
              <Upload
                beforeUpload={handleImport}
                showUploadList={false}
                accept=".xlsx,.xls"
              >
                <Button icon={<UploadOutlined />}>
                  批量导入
                </Button>
              </Upload>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExport}
              >
                导出题目
              </Button>
              {selectedRowKeys.length > 0 && (
                <Popconfirm
                  title={`确定删除选中的${selectedRowKeys.length}道题目吗？`}
                  description="删除后无法恢复"
                  onConfirm={handleBatchDelete}
                  okText="确定"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger icon={<DeleteOutlined />}>
                    批量删除({selectedRowKeys.length})
                  </Button>
                </Popconfirm>
              )}
            </>
          )}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/questions/new')}
          >
            新增题目
          </Button>
        </Space>
      </div>
      <Table
        columns={columns}
        dataSource={questions}
        rowKey={(record) => record.id || record._id}
        loading={loading}
        rowSelection={rowSelection}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        onChange={handleTableChange}
        scroll={{ x: 1000 }}
      />
    </div>
  );
};

export default QuestionList;
