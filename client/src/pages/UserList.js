import React, { useState, useEffect, useContext } from 'react';
import { Table, Button, Popconfirm, Select, Tag, Space, Upload, App, Modal, Form, Input } from 'antd';
import { DeleteOutlined, UploadOutlined, DownloadOutlined, FileExcelOutlined, PlusOutlined, UserOutlined, LockOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import api from '../utils/api';
import { AuthContext } from '../contexts/AuthContext';


const UserList = () => {
  const { message, modal } = App.useApp();
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/users', {
        params: { page: pagination.current, limit: pagination.pageSize }
      });
      setUsers(res.data.users);
      setPagination({ ...pagination, total: res.data.total });
    } catch (error) {
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/users/${id}`);
      message.success('删除成功');
      fetchUsers();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的用户');
      return;
    }
    try {
      await api.delete('/api/users/batch', { data: { ids: selectedRowKeys } });
      message.success(`成功删除${selectedRowKeys.length}个用户`);
      setSelectedRowKeys([]);
      fetchUsers();
    } catch (error) {
      message.error(error.response?.data?.message || '批量删除失败');
    }
  };

  // 导出模板
  const handleExportTemplate = async () => {
    try {
      const res = await api.get('/api/users/export/template', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `用户导入模板_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success('模板导出成功');
    } catch (error) {
      message.error('导出模板失败');
    }
  };

  // 导出用户
  const handleExport = async () => {
    try {
      const res = await api.get('/api/users/export', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `用户列表_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
    }
  };

  // 创建用户
  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      await api.post('/api/users', values);
      message.success('创建用户成功');
      setCreateModalVisible(false);
      createForm.resetFields();
      fetchUsers();
    } catch (error) {
      message.error(error.response?.data?.message || '创建用户失败');
    }
  };

  // 批量导入
  const handleImport = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await api.post('/api/users/import', formData, {
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
      
      fetchUsers();
    } catch (error) {
      message.error(error.response?.data?.message || '导入失败');
    }
    
    return false; // 阻止自动上传
  };

  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role) => {
        const roleMap = {
          student: { text: '学生', color: 'blue' },
          teacher: { text: '教师', color: 'green' },
          admin: { text: '管理员', color: 'red' }
        };
        const r = roleMap[role] || { text: role, color: 'default' };
        return <Tag color={r.color}>{r.text}</Tag>;
      }
    },
    {
      title: '学号',
      dataIndex: 'studentId',
      key: 'studentId',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Popconfirm
          title="确定删除此用户吗？"
          onConfirm={() => handleDelete(record.id || record._id)}
        >
          <Button type="link" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  // 批量选择配置
  const rowSelection = isAdmin ? {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
    getCheckboxProps: (record) => ({
      disabled: record.id === user?.id // 不能选择自己
    })
  } : null;

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>用户管理</h2>
        {isAdmin && (
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              创建用户
            </Button>
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
              导出用户
            </Button>
            {selectedRowKeys.length > 0 && (
              <Popconfirm
                title={`确定删除选中的${selectedRowKeys.length}个用户吗？`}
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
          </Space>
        )}
      </div>
      <Table
        columns={columns}
        dataSource={users}
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
        onChange={(newPagination) => setPagination(newPagination)}
      />
      <Modal
        title="创建用户"
        open={createModalVisible}
        onOk={handleCreate}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        okText="创建"
        cancelText="取消"
        width={600}
      >
        <Form
          form={createForm}
          layout="vertical"
          initialValues={{ role: 'student' }}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6位' }
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码（至少6位）" />
          </Form.Item>
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="姓名" />
          </Form.Item>
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="选择角色">
              <Select.Option value="student">学生</Select.Option>
              <Select.Option value="teacher">教师</Select.Option>
              <Select.Option value="admin">管理员</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="studentId"
            label="学号"
          >
            <Input placeholder="学号（可选）" />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[{ type: 'email', message: '请输入有效的邮箱' }]}
          >
            <Input prefix={<MailOutlined />} placeholder="邮箱（可选）" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="手机号"
          >
            <Input prefix={<PhoneOutlined />} placeholder="手机号（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserList;

