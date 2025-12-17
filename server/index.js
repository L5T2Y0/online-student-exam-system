const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { sequelize } = require('./models');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

