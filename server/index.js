const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const { sequelize } = require('./models');

// 环境变量验证
const requiredEnvVars = ['JWT_SECRET', 'DB_NAME', 'DB_USER'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('❌ 缺少必需的环境变量:', missingEnvVars.join(', '));
  console.error('请在 .env 文件中配置这些变量');
  process.exit(1);
}

const app = express();

// CORS 配置 - 限制允许的来源
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: (origin, callback) => {
    // 允许没有 origin 的请求（如移动应用、Postman、同源请求）
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('CORS 阻止的来源:', origin);
      callback(null, true); // 开发环境暂时允许所有来源
    }
  },
  credentials: true
}));

// 请求体大小限制
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 全局请求频率限制
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 1000, // 限制1000次请求
  message: '请求过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: false, // 如果在代理后面，设置为 true
});
app.use(globalLimiter);

// 认证相关接口的严格限制
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 10, // 限制10次尝试
  message: '登录/注册尝试次数过多，请15分钟后再试',
  skipSuccessfulRequests: true, // 成功的请求不计入限制
  trustProxy: false, // 如果在代理后面，设置为 true
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/papers', require('./routes/papers'));
app.use('/api/exams', require('./routes/exams'));
app.use('/api/scores', require('./routes/scores'));

// 连接数据库
sequelize.authenticate()
  .then(() => {
    console.log('✅ MySQL 连接成功');
  })
  .catch(err => {
    console.error('\n❌ MySQL 连接失败！');
    console.error('错误详情:', err.message);
    console.error('\n请检查以下配置：');
    console.error('1. MySQL 服务是否已启动');
    console.error('2. .env 文件中的数据库配置是否正确：');
    console.error('   - DB_HOST:', process.env.DB_HOST || 'localhost');
    console.error('   - DB_PORT:', process.env.DB_PORT || 3306);
    console.error('   - DB_NAME:', process.env.DB_NAME || 'online_exam');
    console.error('   - DB_USER:', process.env.DB_USER || 'root');
    console.error('3. 数据库用户是否有访问权限');
    console.error('4. 数据库是否已创建');
    console.error('\n⚠️  服务器将继续运行，但数据库操作将失败。');
    console.error('   请修复数据库连接问题后重启服务器。\n');
  });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});

