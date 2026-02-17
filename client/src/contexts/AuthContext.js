import React, { createContext, useState, useEffect } from 'react';
import { App } from 'antd';
import api from '../utils/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const { message } = App.useApp();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }

    // 监听全局登出事件
    const handleLogout = () => {
      setUser(null);
    };
    window.addEventListener('auth:logout', handleLogout);
    
    return () => {
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, []);

  const fetchUser = async () => {
    try {
      const res = await api.get('/api/users/me');
      setUser(res.data.user);
    } catch (error) {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const res = await api.post('/api/auth/login', { username, password });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      setUser(user);
      message.success('登录成功');
      return { success: true };
    } catch (error) {
      message.error(error.response?.data?.message || '登录失败');
      return { success: false };
    }
  };

  const register = async (userData) => {
    try {
      const res = await api.post('/api/auth/register', userData);
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      setUser(user);
      message.success('注册成功');
      return { success: true };
    } catch (error) {
      // 处理验证错误数组
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const errorMessages = error.response.data.errors.map(err => err.msg || err.message).join('；');
        message.error(errorMessages || error.response?.data?.message || '注册失败');
      } else {
        message.error(error.response?.data?.message || '注册失败');
      }
      return { success: false };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    message.success('已退出登录');
  };

  const updateUser = (userData) => {
    setUser({ ...user, ...userData });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

