import React, { useContext } from 'react';
import { Layout as AntLayout, Menu, Avatar, Dropdown, Space, Badge, Typography } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  QuestionCircleOutlined,
  FileTextOutlined,
  EditOutlined,
  TrophyOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { AuthContext } from '../contexts/AuthContext';
import './Layout.css';

const { Header, Content, Sider, Footer } = AntLayout;
const { Text } = Typography;

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useContext(AuthContext);

  const getRoleText = (role) => {
    const roleMap = {
      admin: '管理员',
      teacher: '教师',
      student: '学生'
    };
    return roleMap[role] || role;
  };

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '首页',
    },
  ];

  // 根据角色添加菜单项
  if (user?.role === 'teacher' || user?.role === 'admin') {
    menuItems.push(
      {
        key: '/questions',
        icon: <QuestionCircleOutlined />,
        label: '题库管理',
      },
      {
        key: '/papers',
        icon: <FileTextOutlined />,
        label: '试卷管理',
      }
    );
  }

  if (user?.role === 'student') {
    menuItems.push(
      {
        key: '/exams',
        icon: <EditOutlined />,
        label: '我的考试',
      },
      {
        key: '/scores',
        icon: <TrophyOutlined />,
        label: '我的成绩',
      },
      {
        key: '/scores/wrong',
        icon: <QuestionCircleOutlined />,
        label: '错题回顾',
      }
    );
  }

  if (user?.role === 'teacher' || user?.role === 'admin') {
    menuItems.push(
      {
        key: '/scores',
        icon: <TrophyOutlined />,
        label: '成绩管理',
      },
      {
        key: '/scores/stats',
        icon: <TrophyOutlined />,
        label: '成绩统计',
      }
    );
  }

  if (user?.role === 'admin') {
    menuItems.push({
      key: '/users',
      icon: <UserOutlined />,
      label: '用户管理',
    });
  }

  const userMenuItems = [
    {
      key: 'profile',
      icon: <SettingOutlined style={{ fontSize: '13px' }} />,
      label: '个人设置',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined style={{ fontSize: '13px' }} />,
      label: '退出登录',
      danger: true,
    },
  ];

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  const handleUserMenuClick = ({ key }) => {
    if (key === 'logout') {
      logout();
      navigate('/login');
    } else if (key === 'profile') {
      navigate('/profile');
    }
  };

  return (
    <AntLayout className="main-layout" style={{ minHeight: '100vh' }}>
      <Header className="main-header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">📚</span>
            <span className="logo-text">在线考试系统</span>
          </div>
        </div>
        <div className="header-right">
          <Dropdown
            menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
            placement="bottomRight"
            overlayClassName="user-dropdown-menu"
          >
            <Space className="user-info" style={{ cursor: 'pointer' }}>
              <Avatar 
                size={36} 
                style={{ 
                  backgroundColor: '#1890ff',
                  flexShrink: 0
                }}
                icon={<UserOutlined />}
              />
              <div className="user-details">
                <Text strong style={{ fontSize: '14px', color: '#262626', display: 'block', lineHeight: '20px' }}>
                  {user?.name || user?.username || '用户'}
                </Text>
                <Text type="secondary" style={{ fontSize: '12px', display: 'block', lineHeight: '16px', marginTop: '2px' }}>
                  {getRoleText(user?.role)}
                </Text>
              </div>
            </Space>
          </Dropdown>
        </div>
      </Header>
      <AntLayout>
        <Sider width={220} className="main-sider" theme="light">
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            className="main-menu"
          />
        </Sider>
        <AntLayout className="main-content-layout">
          <Content className="main-content">
            {children}
          </Content>
          <Footer className="main-footer">
            <div style={{ textAlign: 'center', color: '#8c8c8c', fontSize: '12px' }}>
              <span>© 2025 在线考试系统</span>
              <span style={{ margin: '0 8px' }}>|</span>
              <span>作者：L5T2Y0</span>
              <span style={{ margin: '0 8px' }}>|</span>
              <span>版本：v1.0.0</span>
            </div>
          </Footer>
        </AntLayout>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
