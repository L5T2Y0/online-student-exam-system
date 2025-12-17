import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ConfigProvider 
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#667eea',
          borderRadius: 8,
        },
        components: {
          Tooltip: {
            colorBgSpotlight: 'rgba(0, 0, 0, 0.85)',
            borderRadius: 8,
            paddingBlock: 8,
            paddingInline: 12,
          },
          Popconfirm: {
            borderRadius: 8,
          },
          Popover: {
            borderRadius: 12,
          },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>
);

