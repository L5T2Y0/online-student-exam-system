import React, { useState, useContext } from 'react';
import { Form, Input, Button, Card, message, Typography, Divider } from 'antd';
import { UserOutlined, LockOutlined, BookOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import './Login.css';

const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const onFinish = async (values) => {
    setLoading(true);
    const result = await login(values.username, values.password);
    setLoading(false);
    if (result.success) {
      navigate('/');
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-background-overlay"></div>
      </div>
      <div className="login-content">
        <Card className="login-card" variant="outlined">
          <div className="login-header">
            <div className="login-logo">
              <BookOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
            </div>
            <Title level={2} className="login-title">
              智能在线考试系统
            </Title>
            <Text type="secondary" className="login-subtitle">
              基于 React + Node.js + MySQL
            </Text>
          </div>
          <Divider />
          <Form
            name="login"
            onFinish={onFinish}
            autoComplete="off"
            size="large"
            layout="vertical"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名!' }]}
            >
              <Input 
                prefix={<UserOutlined />} 
                placeholder="用户名" 
                className="login-input"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码!' }]}
            >
              <Input.Password 
                prefix={<LockOutlined />} 
                placeholder="密码" 
                className="login-input"
              />
            </Form.Item>

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                block 
                loading={loading}
                className="login-button"
              >
                登录
              </Button>
            </Form.Item>

            <div className="login-footer">
              <Text type="secondary">还没有账号？</Text>
              <Link to="/register" className="register-link">立即注册</Link>
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
    </div>
  );
};

export default Login;
