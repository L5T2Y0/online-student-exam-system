# 🎓 在线考试系统

[![Node.js](https://img.shields.io/badge/Node.js-v18.x-green?style=flat&logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v18.2.0-blue?style=flat&logo=react)](https://reactjs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-orange?style=flat&logo=mysql)](https://www.mysql.com/)
[![Ant Design](https://img.shields.io/badge/Ant%20Design-5.10.0-blue?style=flat)](https://ant.design/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat)](./LICENSE)

一个功能完整、安全可靠的在线考试系统。采用前后端分离架构，支持学生、教师、管理员三种角色，涵盖题库管理、自动组卷、在线考试、自动评分等核心功能。

> 📦 **开箱即用**: 包含27道测试题目、5份试卷、23个测试账号，克隆即可运行！

## 🌟 项目亮点

- 🎯 **完整功能**: 从题库管理到在线考试的完整闭环
- 🔒 **安全可靠**: JWT认证、权限控制、防作弊机制
- 📊 **数据丰富**: 内置27道题、5份试卷、20个学生账号
- 🚀 **快速部署**: 一键初始化数据库和测试数据
- 📱 **响应式设计**: 支持PC和移动端访问
- 🎨 **现代UI**: 基于Ant Design的美观界面

## 🔒 安全特性

- ✅ JWT 强密钥验证
- ✅ CORS 跨域白名单
- ✅ 请求频率限制（防暴力破解）
- ✅ XSS 输入清理
- ✅ 文件上传安全检查
- ✅ 数据库事务保证一致性

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
online-exam-system/
├── client/                 # 前端 React 项目
│   ├── public/             # 静态资源
│   ├── src/
│   │   ├── components/     # 公共组件 (Layout, PrivateRoute)
│   │   ├── pages/          # 页面视图 (Login, Dashboard, Exam...)
│   │   ├── contexts/       # 全局状态 (AuthContext)
│   │   ├── utils/          # 工具函数 (api.js, debounce.js)
│   │   ├── App.js          # 应用入口
│   │   └── index.js        # React 渲染入口
│   └── package.json
├── server/                 # 后端 Node.js 项目
│   ├── config/             # 配置文件 (database.js)
│   ├── models/             # Sequelize 模型 (User, Exam, Question, Paper)
│   ├── routes/             # API 路由 (auth, users, exams, questions, papers, scores)
│   ├── middleware/         # 中间件 (auth.js)
│   └── index.js            # 服务器入口
├── database/               # 数据库脚本
│   ├── init.sql            # 数据库表结构
│   ├── setup.js            # 初始化脚本
│   └── seed.js             # 测试数据生成
├── .env.example            # 环境变量模板
├── .gitignore              # Git 忽略文件
├── CHANGELOG.md            # 更新日志
├── LICENSE                 # 开源许可证
├── package.json            # 项目依赖
└── README.md               # 项目说明
```

---

## 🚀 快速开始 (本地部署)

### 1. 环境准备

* 安装 [Node.js](https://nodejs.org/) (v16 或 v18 以上)
* 安装 [MySQL](https://www.mysql.com/) (v5.7 或 v8.0)
* 安装 Git

### 2. 克隆项目

```bash
git clone https://github.com/L5T2Y0/online-student-exam-system.git
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
# 安装根目录依赖
npm install

# 安装前端依赖
cd client
npm install
```

### 4. 配置环境变量

**重要：必须配置 JWT 密钥，否则服务器将拒绝启动！**

1. 复制环境变量模板：
```bash
cp .env.example .env
```

2. 生成强 JWT 密钥：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

3. 编辑 `.env` 文件，填入配置：
```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=online_exam
DB_USER=root
DB_PASSWORD=你的数据库密码

# JWT 密钥（必须设置！将上面生成的密钥粘贴到这里）
JWT_SECRET=粘贴刚才生成的密钥

# 服务器端口
PORT=5000

# CORS 允许的来源（多个用逗号分隔）
ALLOWED_ORIGINS=http://localhost:3000

# Node 环境
NODE_ENV=development
```

### 5. 初始化数据库

确保 MySQL 已启动，然后运行：

```bash
# 一键初始化（创建表结构 + 生成测试数据）
npm run init
```

这将自动创建：
- ✅ 数据库表结构（users, questions, papers, exams）
- ✅ 23个测试用户（1管理员 + 2教师 + 20学生）
- ✅ 27道测试题目（涵盖7个科目）
- ✅ 5份测试试卷（4份已发布 + 1份草稿）

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

## 🧪 测试数据

系统包含丰富的测试数据供演示使用：

- **用户**: 23个（1管理员 + 2教师 + 20学生）
- **题目**: 27道（涵盖单选、多选、判断、填空、简答）
- **试卷**: 5份（4份已发布 + 1份草稿）
- **科目**: 计算机基础、数据结构、计算机网络、数据库、编程语言、算法、软件工程

### 测试账号

初始化后，可使用以下账号登录：

| 角色 | 账号 | 密码 | 说明 |
| --- | --- | --- | --- |
| **管理员** | `admin` | `123456` | 系统管理员，拥有所有权限 |
| **教师** | `teacher1` | `123456` | 张老师，可创建题目、试卷，批阅考试 |
| **教师** | `teacher2` | `123456` | 李老师，可创建题目、试卷，批阅考试 |
| **学生** | `student1-student20` | `123456` | 20个测试学生，可参加考试、查看成绩 |

**⚠️ 生产环境请务必修改默认密码！**

---

## 📝 核心 API 概览

### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录

### 用户管理
- `GET /api/users/me` - 获取当前用户信息
- `PUT /api/users/me` - 更新个人信息
- `PUT /api/users/change-password` - 修改密码
- `GET /api/users` - 获取用户列表（管理员）
- `POST /api/users/import` - 批量导入用户（管理员）

### 题库管理
- `GET /api/questions` - 获取题目列表
- `POST /api/questions` - 创建题目（教师/管理员）
- `PUT /api/questions/:id` - 更新题目
- `DELETE /api/questions/:id` - 删除题目
- `POST /api/questions/import` - 批量导入题目

### 试卷管理
- `GET /api/papers` - 获取试卷列表
- `POST /api/papers` - 创建试卷（教师/管理员）
- `POST /api/papers/auto-generate` - 自动组卷
- `PUT /api/papers/:id/publish` - 发布/取消发布试卷

### 考试相关
- `POST /api/exams/start` - 开始考试
- `PUT /api/exams/:id/answer` - 保存答案
- `POST /api/exams/:id/submit` - 提交试卷
- `GET /api/exams/my/list` - 获取我的考试列表
- `PUT /api/exams/:id/grade` - 批阅题目（教师/管理员）

### 成绩统计
- `GET /api/scores/stats` - 成绩统计分析
- `GET /api/scores/export` - 导出成绩

---

## ⚠️ 常见问题

### Q: 服务器启动失败，提示 "未设置 JWT_SECRET"
A: 请按照步骤 4 生成并配置 JWT 密钥。这是必需的安全措施。

### Q: 前端无法连接后端
A: 检查 `.env` 中的 `ALLOWED_ORIGINS` 是否包含前端地址（默认 `http://localhost:3000`）。

### Q: 登录提示 "请求过于频繁"
A: 这是安全保护，15分钟内最多尝试10次。请稍后再试。

### Q: 数据库连接失败
A: 
1. 确认 MySQL 已启动
2. 检查 `.env` 中的数据库配置
3. 确认数据库用户有权限

---

## 🔧 技术细节

### 安全措施
- JWT 密钥强制验证（启动时检查）
- CORS 白名单限制
- 请求频率限制（全局 + 认证接口）
- XSS 输入清理
- 文件上传大小和类型验证
- 批量操作数量限制
- 数据库事务保证一致性

### 性能优化
- 分页参数验证和限制（最大100条/页）
- 请求体大小限制（10MB）
- 数据库连接池
- 索引优化

---

## 📋 更新日志

查看 [CHANGELOG.md](./CHANGELOG.md) 了解详细的版本更新记录。

---

## 📜 许可证

本项目采用 MIT License 开源许可证。

---

## 🙏 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📧 联系方式

如有问题或建议，请提交 Issue。


---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

在提交 PR 之前，请确保：
1. 代码符合项目规范
2. 添加必要的注释
3. 测试功能正常

详见 [贡献指南](./CONTRIBUTING.md)

---

## 📄 许可证

本项目采用 [MIT License](./LICENSE) 开源协议。

---

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者！

---

## 📞 联系方式

如有问题或建议，欢迎通过以下方式联系：

- 📧 提交 [GitHub Issue](https://github.com/L5T2Y0/online-student-exam-system/issues)
- 💬 参与 [Discussions](https://github.com/L5T2Y0/online-student-exam-system/discussions)

---

## ⭐ Star History

如果这个项目对你有帮助，请给个 Star ⭐️

---

**Made with ❤️ | Version 1.1.1**
