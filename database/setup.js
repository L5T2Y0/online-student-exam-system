/**
 * 数据库初始化脚本
 * 用于创建数据库和表结构
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

const DB_NAME = process.env.DB_NAME || 'online_exam';

async function setupDatabase() {
  let connection;
  
  try {
    console.log('正在连接 MySQL...');
    
    // 连接到 MySQL（不指定数据库）
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✓ MySQL 连接成功');

    // 创建数据库（如果不存在）
    console.log(`正在创建数据库 ${DB_NAME}...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✓ 数据库 ${DB_NAME} 创建成功`);

    // 选择数据库
    await connection.query(`USE \`${DB_NAME}\``);
    console.log(`✓ 已切换到数据库 ${DB_NAME}`);

    // 读取并执行 init.sql
    const fs = require('fs');
    const path = require('path');
    const initSqlPath = path.join(__dirname, 'init.sql');
    
    if (fs.existsSync(initSqlPath)) {
      console.log('正在执行 init.sql...');
      const initSql = fs.readFileSync(initSqlPath, 'utf8');
      
      // 分割 SQL 语句（以分号和换行分割）
      const statements = initSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
      
      for (const statement of statements) {
        if (statement) {
          try {
            await connection.query(statement);
          } catch (err) {
            // 忽略已存在的表错误
            if (!err.message.includes('already exists')) {
              console.warn('执行 SQL 时出现警告:', err.message);
            }
          }
        }
      }
      console.log('✓ 数据库表结构创建完成');
    } else {
      console.log('⚠ init.sql 文件不存在，将使用 Sequelize 自动同步表结构');
    }

    console.log('\n✅ 数据库初始化完成！');
    console.log('\n下一步：运行 npm run seed 创建测试数据');

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    console.error('\n请检查：');
    console.error('1. MySQL 服务是否已启动');
    console.error('2. .env 文件中的数据库配置是否正确');
    console.error('3. 数据库用户是否有创建数据库的权限');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行
setupDatabase();

