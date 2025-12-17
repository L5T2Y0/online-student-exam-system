import React, { useState, useContext } from 'react';
import { Form, Input, Button, Card, Select, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const { Option } = Select;

const Register = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useContext(AuthContext);

  const onFinish = async (values) => {
    setLoading(true);
    const result = await register(values);
    setLoading(false);
    if (result.success) {
      navigate('/');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
      <Card title="注册" style={{ width: 500 }}>
        <Form
          name="register"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名!' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码!' }, { min: 6, message: '密码至少6位!' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码（至少6位）" />
          </Form.Item>

          <Form.Item
            name="name"
            rules={[{ required: true, message: '请输入姓名!' }]}
          >
            <Input placeholder="姓名" />
          </Form.Item>

          <Form.Item
            name="role"
            rules={[{ required: true, message: '请选择角色!' }]}
          >
            <Select placeholder="选择角色">
              <Option value="student">学生</Option>
              <Option value="teacher">教师</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="studentId"
            rules={[{ required: false }]}
          >
            <Input placeholder="学号（可选）" />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[{ type: 'email', message: '请输入有效的邮箱!' }]}
          >
            <Input prefix={<MailOutlined />} placeholder="邮箱（可选）" />
          </Form.Item>

          <Form.Item
            name="phone"
          >
            <Input prefix={<PhoneOutlined />} placeholder="手机号（可选）" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              注册
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Link to="/login">已有账号？立即登录</Link>
          </div>
          </Form>
        </Card>
        <div style={{ 
          position: 'fixed', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          textAlign: 'center', 
          padding: '12px', 
          background: 'rgba(255, 255, 255, 0.9)', 
          borderTop: '1px solid #e8e8e8',
          fontSize: '12px',
          color: '#8c8c8c',
          zIndex: 100
        }}>
          <span>© 2025 在线考试系统</span>
          <span style={{ margin: '0 8px' }}>|</span>
          <span>作者：L5T2Y0</span>
          <span style={{ margin: '0 8px' }}>|</span>
          <span>版本：v1.0.0</span>
        </div>
      </div>
    );
  };

export default Register;

