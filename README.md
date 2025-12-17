# 基于 React + Node.js + MySQL 的在线考试系统

**毕设标题**：基于 React + Node.js + MySQL 的在线考试系统设计与实现  
**系统版本**：v1.0.0

一个功能完整、界面精美的在线考试系统，采用前后端分离架构，支持学生、教师、管理员三种角色。

## 功能特性

### 1. 用户管理模块
- 三种角色：学生、教师、管理员
- 用户注册、登录（JWT认证）
- 个人信息管理
- 权限控制

### 2. 题库管理模块
- 支持多种题型：单选、多选、判断、填空、简答
- 题目分类：按科目、章节、难度
- 题目的增删改查
- 题目统计

### 3. 试卷管理模块
- 手动组卷：教师自己选题
- 自动组卷：按规则随机抽题
- 试卷预览、发布、管理

### 4. 考试模块
- 学生在线答题界面
- 倒计时功能、自动交卷
- 答题进度保存（防止意外退出）
- 客观题自动评分，主观题教师批阅

### 5. 成绩管理模块
- 成绩查询、成绩统计
- 错题回顾
- 成绩导出（Excel）

## 技术栈

### 后端
- **Node.js** (推荐 v18.x 或更高版本)
- **Express 4.18.2** - Web 框架
- **MySQL 3.6.0** (mysql2) + **Sequelize 6.32.1** - 数据库 ORM
- **JWT 9.0.2** (jsonwebtoken) - 身份认证
- **bcryptjs 2.4.3** - 密码加密
- **Multer 2.0.2** - 文件上传
- **XLSX 0.18.5** - Excel 导出
- **Express Validator 7.0.1** - 数据验证

### 前端
- **React 18.2.0** - 用户界面框架
- **Ant Design 5.10.0** - UI 组件库
- **React Router 6.16.0** - 路由管理
- **Axios 1.6.0** - HTTP 客户端
- **Day.js 1.11.10** - 日期处理
- **React Scripts 5.0.1** - 构建工具

## 快速开始

### 方式一：使用部署指南（推荐）

详细步骤请参考：[LOCAL_DEPLOYMENT.md](./LOCAL_DEPLOYMENT.md)

### 方式二：快速安装

#### 1. 安装依赖

```bash
npm run install-all
```

#### 2. 配置环境变量

在项目根目录创建 `.env` 文件：

**方法 1：复制模板文件（推荐）**
```bash
# 复制 .env.example 为 .env
cp .env.example .env
# Windows: copy .env.example .env
```

**方法 2：手动创建**

创建 `.env` 文件并填入以下内容：

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=online_exam
DB_USER=root
DB_PASSWORD=你的MySQL密码
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=development
```

**重要**：`.env` 文件包含敏感信息，不要提交到 Git！

#### 3. 初始化数据库

```bash
# 自动创建数据库和表结构
npm run setup

# 生成测试数据（可选）
npm run seed
```

测试数据包括：
- 1个管理员账号：`admin` / `123456`
- 2个教师账号：`teacher1`, `teacher2` / `123456`
- 10个学生账号：`student1` - `student10` / `123456`
- 13道测试题目（涵盖所有题型）
- 2套测试试卷

#### 4. 运行项目

开发模式（同时启动前后端）：

```bash
npm run dev
```

或分别启动：

```bash
# 后端（端口 5000）
npm run server

# 前端（端口 3000，新终端）
npm run client
```

#### 5. 访问应用

- 前端：http://localhost:3000
- 后端 API：http://localhost:5000

## API 接口

详细的 API 接口文档请参考：[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

### 主要接口概览

**认证相关**
- `POST /api/auth/register` - 注册（禁止注册管理员）
- `POST /api/auth/login` - 登录

**用户管理**
- `GET /api/users/me` - 获取当前用户信息
- `PUT /api/users/me` - 更新个人信息
- `PUT /api/users/change-password` - 修改密码
- `POST /api/users` - 创建用户（管理员，可创建所有角色）
- `GET /api/users` - 获取用户列表（管理员）
- `DELETE /api/users/batch` - 批量删除用户（管理员）
- `DELETE /api/users/:id` - 删除用户（管理员）
- `GET /api/users/export/template` - 导出用户模板（管理员）
- `GET /api/users/export` - 导出用户列表（管理员）
- `POST /api/users/import` - 批量导入用户（管理员，禁止导入管理员）

**题库管理**
- `GET /api/questions` - 获取题目列表
- `GET /api/questions/export/template` - 导出题目模板（教师/管理员）
- `GET /api/questions/export` - 导出题目列表（教师/管理员）
- `GET /api/questions/:id` - 获取单个题目
- `POST /api/questions` - 创建题目（教师/管理员）
- `PUT /api/questions/:id` - 更新题目（教师/管理员）
- `POST /api/questions/import` - 批量导入题目（教师/管理员）
- `DELETE /api/questions/batch` - 批量删除题目（教师/管理员）
- `DELETE /api/questions/:id` - 删除题目（教师/管理员）
- `GET /api/questions/stats/categories` - 获取分类统计
- `GET /api/questions/stats/accuracy` - 获取每题正确率统计（教师/管理员）

**试卷管理**
- `GET /api/papers` - 获取试卷列表
- `GET /api/papers/:id` - 获取单个试卷
- `POST /api/papers` - 创建试卷（教师/管理员）
- `POST /api/papers/auto-generate` - 自动组卷（教师/管理员）
- `PUT /api/papers/:id` - 更新试卷（教师/管理员）
- `PUT /api/papers/:id/publish` - 发布/取消发布（教师/管理员）
- `DELETE /api/papers/:id` - 删除试卷（教师/管理员）

**考试模块**
- `POST /api/exams/start` - 开始考试（学生）
- `POST /api/exams/:id/cheat` - 记录作弊行为（学生）
- `PUT /api/exams/:id/answer` - 保存答案（学生）
- `POST /api/exams/:id/submit` - 提交考试（学生）
- `GET /api/exams/:id` - 获取考试详情
- `GET /api/exams/my/list` - 获取我的考试列表（学生）
- `PUT /api/exams/:id/grade` - 批阅题目（教师/管理员，支持所有题型）

**成绩管理**
- `GET /api/scores` - 获取成绩列表
- `GET /api/scores/stats` - 获取成绩统计
- `GET /api/scores/wrong-questions` - 获取错题回顾（学生）
- `GET /api/scores/export` - 导出成绩Excel（教师/管理员）
- `GET /api/scores/ranking/paper/:paperId` - 获取试卷排名
- `GET /api/scores/ranking/total` - 获取总成绩排名（学生）
- `DELETE /api/scores/:id` - 删除考试记录

## 项目结构

```
online-exam-system/
├── server/                 # 后端代码
│   ├── index.js           # 服务器入口
│   ├── models/            # 数据模型
│   │   ├── User.js
│   │   ├── Question.js
│   │   ├── Paper.js
│   │   └── Exam.js
│   ├── routes/            # 路由
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── questions.js
│   │   ├── papers.js
│   │   ├── exams.js
│   │   └── scores.js
│   └── middleware/        # 中间件
│       └── auth.js
├── client/                # 前端代码（待创建）
└── package.json
```

## 测试账号

如果已运行 `npm run seed`，可以使用以下账号登录：

- **管理员**：`admin` / `123456`
- **教师**：`teacher1` / `123456` 或 `teacher2` / `123456`
- **学生**：`student1` / `123456` (student1-student10)

## 项目特色

✨ **现代化UI设计** - 采用渐变背景、毛玻璃效果、流畅动画  
📱 **响应式布局** - 完美适配桌面和移动设备  
🎨 **精美界面** - 基于 Ant Design 5，界面美观大方  
⚡ **高性能** - 前后端分离，接口响应快速  
🔒 **安全可靠** - JWT认证，密码加密存储  
📊 **数据可视化** - 成绩统计、错题分析  
👨‍🏫 **手动批阅** - 所有题目均由教师手动批阅，确保公平公正

## 文档说明

- **[SYSTEM_INTRO.md](./SYSTEM_INTRO.md)** - 系统介绍和功能说明
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - 完整的 API 接口文档
- **[LOCAL_DEPLOYMENT.md](./LOCAL_DEPLOYMENT.md)** - 本地部署详细指南
- **[SERVER_DEPLOYMENT.md](./SERVER_DEPLOYMENT.md)** - 服务器部署详细指南
- **[GITHUB_PUBLISH.md](./GITHUB_PUBLISH.md)** - GitHub 发布指南

## 开发计划

- [x] 后端API开发
- [x] 前端界面开发
- [x] UI优化升级
- [x] 测试数据脚本
- [x] 配置文档
- [x] 部署文档
- [ ] 功能测试

## 许可证

ISC

