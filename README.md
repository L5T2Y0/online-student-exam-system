# 🎓 基于 React + Node.js + MySQL 的在线考试系统

![Node.js](https://img.shields.io/badge/Node.js-v18.x-green?style=flat&logo=node.js)
![React](https://img.shields.io/badge/React-v18.2.0-blue?style=flat&logo=react)
![MySQL](https://img.shields.io/badge/MySQL-8.0-orange?style=flat&logo=mysql)
![Ant Design](https://img.shields.io/badge/Ant%20Design-5.10.0-blue?style=flat)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)

> **毕设题目**：基于 React + Node.js + MySQL 的在线考试系统设计与实现

这是一个功能完整、界面现代化的在线考试系统。采用前后端分离架构，支持学生、教师、管理员三种角色，涵盖了题库管理、自动组卷、在线考试、自动评分等核心功能。

---

## ✨ 功能特性

| 角色 | 核心功能 |
| :--- | :--- |
| **👨‍🎓 学生** | 用户注册登录、**在线考试**（倒计时/防作弊）、成绩查询、**错题回顾**、个人中心 |
| **👩‍🏫 教师** | **题库管理**（增删改查）、**试卷管理**（手动/自动组卷）、批阅主观题、成绩统计与导出 |
| **👮 管理员** | 用户管理（批量导入/导出）、系统权限控制、全局数据概览 |

## 🛠️ 技术栈

### 前端 (Client)
* **框架**: React 18.2.0
* **UI 组件库**: Ant Design 5.10.0
* **路由**: React Router 6
* **HTTP 请求**: Axios
* **工具**: Day.js (时间处理)

### 后端 (Server)
* **运行环境**: Node.js (推荐 v18+)
* **Web 框架**: Express 4.18.2
* **数据库 ORM**: Sequelize 6.32.1
* **数据库**: MySQL (mysql2)
* **认证**: JWT (JSON Web Token)

---

## 📂 项目结构

```text
online-student-exam-system/
├── client/                 # 前端 React 项目
│   ├── src/
│   │   ├── components/     # 公共组件
│   │   ├── pages/          # 页面视图 (Login, Exam, Dashboard...)
│   │   ├── contexts/       # 全局状态 (AuthContext)
│   │   └── utils/          # 工具函数 (api.js)
│   └── package.json
├── server/                 # 后端 Node.js 项目
│   ├── config/             # 数据库配置
│   ├── models/             # Sequelize 模型 (User, Exam, Question...)
│   ├── routes/             # API 路由接口
│   ├── middleware/         # 中间件 (Auth)
│   └── index.js            # 入口文件
├── database/               # 数据库脚本
│   ├── init.sql            # 初始 SQL 结构
│   └── seed.js             # 测试数据生成脚本
└── README.md

```

---

## 🚀 快速开始 (本地部署)

### 1. 环境准备

* 安装 [Node.js](https://nodejs.org/) (v16 或 v18 以上)
* 安装 [MySQL](https://www.mysql.com/) (v5.7 或 v8.0)
* 安装 Git

### 2. 克隆项目

```bash
git clone [https://github.com/your-username/online-student-exam-system.git](https://github.com/your-username/online-student-exam-system.git)
cd online-student-exam-system

```

### 3. 安装依赖

你需要分别安装前端和后端的依赖。

**根目录一键安装 (如果配置了脚本):**

```bash
npm run install-all

```

**或者手动分步安装:**

```bash
# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ../client
npm install

```

### 4. 数据库配置

1. 登录你的 MySQL，创建一个名为 `online_exam` 的数据库：
```sql
CREATE DATABASE online_exam CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

```


2. 在项目根目录新建 `.env` 文件（参考 `.env.example`），填入你的数据库密码：
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=你的数据库密码
DB_NAME=online_exam
JWT_SECRET=my_super_secret_key_123

```



### 5. 初始化数据

项目包含自动初始化脚本，可以一键生成表结构和测试数据。

```bash
# 回到项目根目录
npm run setup   # 创建表结构
npm run seed    # 写入测试数据 (管理员/教师/题目等)

```

### 6. 启动项目

你可以同时启动前后端（如果根目录配置了 `concurrently`），或者分别启动。

**方式 A：一键启动 (推荐)**

```bash
# 在根目录执行
npm run dev

```

**方式 B：分别启动**

* **后端**: 进入 `server` 目录 -> `npm run dev` (运行在 5000 端口)
* **前端**: 进入 `client` 目录 -> `npm start` (运行在 3000 端口)

访问浏览器：`http://localhost:3000`

---

## 🧪 测试账号

初始化 (`npm run seed`) 后，可使用以下账号登录：

| 角色 | 账号 | 密码 |
| --- | --- | --- |
| **管理员** | `admin` | `123456` |
| **教师** | `teacher1` | `123456` |
| **学生** | `student1` | `123456` |

*(注：系统包含 10 个测试学生账号 student1 - student10)*

---

## 📝 核心 API 概览

详细接口文档请参考代码中的注释。

* `POST /api/auth/login` - 用户登录
* `GET /api/users/me` - 获取当前用户信息
* `GET /api/exams/my/list` - 获取我的考试列表
* `POST /api/exams/start` - 开始考试
* `POST /api/exams/:id/submit` - 提交试卷
* `GET /api/scores/stats` - 成绩统计分析

---

## 📜 许可证 (License)

本项目采用 [MIT License](https://www.google.com/search?q=LICENSE) 开源许可证。
