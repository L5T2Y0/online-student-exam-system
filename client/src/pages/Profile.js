import React, { useState, useContext } from 'react';
import { Form, Input, Button, Card, message, Tabs } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { AuthContext } from '../contexts/AuthContext';
import api from '../utils/api';

const { TabPane } = Tabs;

const Profile = () => {
  const { user, updateUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  React.useEffect(() => {
    if (user) {
      profileForm.setFieldsValue(user);
    }
  }, [user]);

  const handleUpdateProfile = async (values) => {
    setLoading(true);
    try {
      const res = await api.put('/api/users/me', values);
      updateUser(res.data.user);
      message.success('更新成功');
    } catch (error) {
      message.error('更新失败');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (values) => {
    setLoading(true);
    try {
      await api.put('/api/users/change-password', {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword
      });
      message.success('密码修改成功');
      passwordForm.resetFields();
    } catch (error) {
      message.error(error.response?.data?.message || '密码修改失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="个人设置">
      <Tabs defaultActiveKey="profile">
        <TabPane tab="个人信息" key="profile">
          <Form
            form={profileForm}
            layout="vertical"
            onFinish={handleUpdateProfile}
            style={{ maxWidth: 500 }}
          >
            <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
              <Input prefix={<UserOutlined />} />
            </Form.Item>
            <Form.Item name="email" label="邮箱">
              <Input prefix={<MailOutlined />} />
            </Form.Item>
            <Form.Item name="phone" label="手机号">
              <Input prefix={<PhoneOutlined />} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                更新
              </Button>
            </Form.Item>
          </Form>
        </TabPane>
        <TabPane tab="修改密码" key="password">
          <Form
            form={passwordForm}
            layout="vertical"
            onFinish={handleChangePassword}
            style={{ maxWidth: 500 }}
          >
            <Form.Item
              name="oldPassword"
              label="旧密码"
              rules={[{ required: true, message: '请输入旧密码' }]}
            >
              <Input.Password prefix={<LockOutlined />} />
            </Form.Item>
            <Form.Item
              name="newPassword"
              label="新密码"
              rules={[{ required: true, message: '请输入新密码' }, { min: 6, message: '密码至少6位' }]}
            >
              <Input.Password prefix={<LockOutlined />} />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label="确认新密码"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: '请确认新密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                修改密码
              </Button>
            </Form.Item>
          </Form>
        </TabPane>
      </Tabs>
    </Card>
  );
};

export default Profile;

