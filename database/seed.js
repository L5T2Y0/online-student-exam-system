const bcrypt = require('bcryptjs');
const { sequelize, User, Question, Paper, Exam } = require('../server/models');

async function seedDatabase() {
  try {
    console.log('开始创建测试数据...');

    // 验证数据库连接（表结构已通过 init.sql 创建，不需要同步）
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // 1. 创建用户（使用 findOrCreate 避免重复，并确保密码正确）
    const [admin, adminCreated] = await User.findOrCreate({
      where: { username: 'admin' },
      defaults: {
        username: 'admin',
        password: '123456',
        name: '系统管理员',
        role: 'admin',
        email: 'admin@example.com',
        phone: '13800000000'
      }
    });
    // 如果用户已存在但密码可能未加密，更新密码
    if (!adminCreated) {
      // 检查密码是否已加密（bcrypt hash 以 $2a$ 开头）
      if (!admin.password || !admin.password.startsWith('$2a$')) {
        admin.password = '123456';
        await admin.save(); // 触发 beforeUpdate hook 加密密码
        console.log('○ 管理员密码已更新:', admin.username);
      } else {
        console.log('○ 管理员已存在:', admin.username);
      }
    } else {
      console.log('✓ 创建管理员:', admin.username);
    }

    const [teacher1, teacher1Created] = await User.findOrCreate({
      where: { username: 'teacher1' },
      defaults: {
        username: 'teacher1',
        password: '123456',
        name: '张老师',
        role: 'teacher',
        email: 'teacher1@example.com',
        phone: '13800000001'
      }
    });
    if (!teacher1Created) {
      if (!teacher1.password || !teacher1.password.startsWith('$2a$')) {
        teacher1.password = '123456';
        await teacher1.save();
        console.log('○ 教师密码已更新:', teacher1.username);
      } else {
        console.log('○ 教师已存在:', teacher1.username);
      }
    } else {
      console.log('✓ 创建教师:', teacher1.username);
    }

    const [teacher2, teacher2Created] = await User.findOrCreate({
      where: { username: 'teacher2' },
      defaults: {
        username: 'teacher2',
        password: '123456',
        name: '李老师',
        role: 'teacher',
        email: 'teacher2@example.com',
        phone: '13800000002'
      }
    });
    if (!teacher2Created) {
      if (!teacher2.password || !teacher2.password.startsWith('$2a$')) {
        teacher2.password = '123456';
        await teacher2.save();
        console.log('○ 教师密码已更新:', teacher2.username);
      } else {
        console.log('○ 教师已存在:', teacher2.username);
      }
    } else {
      console.log('✓ 创建教师:', teacher2.username);
    }

    const students = [];
    for (let i = 1; i <= 20; i++) {
      const [student, studentCreated] = await User.findOrCreate({
        where: { username: `student${i}` },
        defaults: {
          username: `student${i}`,
          password: '123456',
          name: ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', '郑一', '王二', 
                 '陈三', '林四', '黄五', '刘六', '杨七', '朱八', '徐九', '马十', '胡一', '何二'][i - 1],
          role: 'student',
          studentId: `202100${i < 10 ? '0' + i : i}`,
          email: `student${i}@example.com`,
          phone: `138000000${10 + i}`
        }
      });
      // 如果学生已存在但密码可能未加密，更新密码
      if (!studentCreated) {
        if (!student.password || !student.password.startsWith('$2a$')) {
          student.password = '123456';
          await student.save();
        }
      }
      students.push(student);
    }
    console.log(`✓ 处理${students.length}个学生`);

    // 2. 创建题目
    const questions = [];

    // 单选题
    const singleQuestions = [
      {
        type: 'single',
        subject: '计算机基础',
        chapter: '第一章',
        difficulty: 'easy',
        content: '计算机的基本组成部分不包括？',
        options: [
          { label: 'A', content: 'CPU' },
          { label: 'B', content: '内存' },
          { label: 'C', content: '硬盘' },
          { label: 'D', content: '鼠标' }
        ],
        correctAnswer: 'D',
        score: 5,
        explanation: '计算机的基本组成部分包括CPU、内存、硬盘等，鼠标是外部设备。',
        createdBy: teacher1.id
      },
      {
        type: 'single',
        subject: '计算机基础',
        chapter: '第一章',
        difficulty: 'medium',
        content: '以下哪个不是操作系统？',
        options: [
          { label: 'A', content: 'Windows' },
          { label: 'B', content: 'Linux' },
          { label: 'C', content: 'MySQL' },
          { label: 'D', content: 'macOS' }
        ],
        correctAnswer: 'C',
        score: 5,
        explanation: 'MySQL是数据库管理系统，不是操作系统。',
        createdBy: teacher1.id
      },
      {
        type: 'single',
        subject: '计算机基础',
        chapter: '第一章',
        difficulty: 'easy',
        content: '1GB等于多少MB？',
        options: [
          { label: 'A', content: '1000MB' },
          { label: 'B', content: '1024MB' },
          { label: 'C', content: '512MB' },
          { label: 'D', content: '2048MB' }
        ],
        correctAnswer: 'B',
        score: 5,
        explanation: '1GB = 1024MB，这是计算机中的二进制换算。',
        createdBy: teacher1.id
      },
      {
        type: 'single',
        subject: '计算机基础',
        chapter: '第一章',
        difficulty: 'medium',
        content: '以下哪个是编程语言？',
        options: [
          { label: 'A', content: 'HTML' },
          { label: 'B', content: 'CSS' },
          { label: 'C', content: 'Python' },
          { label: 'D', content: 'JSON' }
        ],
        correctAnswer: 'C',
        score: 5,
        explanation: 'Python是编程语言，HTML和CSS是标记语言，JSON是数据格式。',
        createdBy: teacher1.id
      },
      {
        type: 'single',
        subject: '数据结构',
        chapter: '第二章',
        difficulty: 'medium',
        content: '栈的特点是？',
        options: [
          { label: 'A', content: '先进先出' },
          { label: 'B', content: '后进先出' },
          { label: 'C', content: '随机存取' },
          { label: 'D', content: '双向遍历' }
        ],
        correctAnswer: 'B',
        score: 5,
        explanation: '栈是一种后进先出（LIFO）的数据结构。',
        createdBy: teacher1.id
      },
      {
        type: 'single',
        subject: '数据结构',
        chapter: '第二章',
        difficulty: 'hard',
        content: '二叉树的前序遍历顺序是？',
        options: [
          { label: 'A', content: '根-左-右' },
          { label: 'B', content: '左-根-右' },
          { label: 'C', content: '左-右-根' },
          { label: 'D', content: '右-左-根' }
        ],
        correctAnswer: 'A',
        score: 5,
        explanation: '前序遍历的顺序是：根节点、左子树、右子树。',
        createdBy: teacher1.id
      },
      {
        type: 'single',
        subject: '数据结构',
        chapter: '第二章',
        difficulty: 'medium',
        content: '队列的特点是？',
        options: [
          { label: 'A', content: '先进先出' },
          { label: 'B', content: '后进先出' },
          { label: 'C', content: '随机存取' },
          { label: 'D', content: '双向遍历' }
        ],
        correctAnswer: 'A',
        score: 5,
        explanation: '队列是一种先进先出（FIFO）的数据结构。',
        createdBy: teacher2.id
      },
      {
        type: 'single',
        subject: '计算机网络',
        chapter: '第三章',
        difficulty: 'easy',
        content: 'HTTP协议默认使用哪个端口？',
        options: [
          { label: 'A', content: '21' },
          { label: 'B', content: '80' },
          { label: 'C', content: '443' },
          { label: 'D', content: '8080' }
        ],
        correctAnswer: 'B',
        score: 5,
        explanation: 'HTTP协议默认使用80端口，HTTPS使用443端口。',
        createdBy: teacher2.id
      },
      {
        type: 'single',
        subject: '计算机网络',
        chapter: '第三章',
        difficulty: 'medium',
        content: 'TCP和UDP的主要区别是？',
        options: [
          { label: 'A', content: 'TCP是面向连接的，UDP是无连接的' },
          { label: 'B', content: 'TCP速度快，UDP速度慢' },
          { label: 'C', content: 'TCP不可靠，UDP可靠' },
          { label: 'D', content: 'TCP用于局域网，UDP用于广域网' }
        ],
        correctAnswer: 'A',
        score: 5,
        explanation: 'TCP是面向连接的可靠协议，UDP是无连接的不可靠协议。',
        createdBy: teacher2.id
      },
      {
        type: 'single',
        subject: '数据库',
        chapter: '第四章',
        difficulty: 'easy',
        content: 'SQL中用于查询数据的关键字是？',
        options: [
          { label: 'A', content: 'INSERT' },
          { label: 'B', content: 'UPDATE' },
          { label: 'C', content: 'SELECT' },
          { label: 'D', content: 'DELETE' }
        ],
        correctAnswer: 'C',
        score: 5,
        explanation: 'SELECT用于查询数据，INSERT用于插入，UPDATE用于更新，DELETE用于删除。',
        createdBy: teacher2.id
      }
    ];

    // 多选题
    const multipleQuestions = [
      {
        type: 'multiple',
        subject: '计算机网络',
        chapter: '第三章',
        difficulty: 'medium',
        content: '以下哪些是TCP/IP协议栈的层次？',
        options: [
          { label: 'A', content: '应用层' },
          { label: 'B', content: '传输层' },
          { label: 'C', content: '网络层' },
          { label: 'D', content: '数据链路层' }
        ],
        correctAnswer: ['A', 'B', 'C', 'D'],
        score: 10,
        explanation: 'TCP/IP协议栈包括应用层、传输层、网络层、数据链路层和物理层。',
        createdBy: teacher1.id
      },
      {
        type: 'multiple',
        subject: '数据库',
        chapter: '第四章',
        difficulty: 'medium',
        content: '以下哪些是关系型数据库？',
        options: [
          { label: 'A', content: 'MySQL' },
          { label: 'B', content: 'MongoDB' },
          { label: 'C', content: 'PostgreSQL' },
          { label: 'D', content: 'Redis' }
        ],
        correctAnswer: ['A', 'C'],
        score: 10,
        explanation: 'MySQL和PostgreSQL是关系型数据库，MongoDB和Redis是非关系型数据库。',
        createdBy: teacher1.id
      },
      {
        type: 'multiple',
        subject: '编程语言',
        chapter: '第六章',
        difficulty: 'easy',
        content: '以下哪些是面向对象编程语言？',
        options: [
          { label: 'A', content: 'Java' },
          { label: 'B', content: 'Python' },
          { label: 'C', content: 'C' },
          { label: 'D', content: 'JavaScript' }
        ],
        correctAnswer: ['A', 'B', 'D'],
        score: 10,
        explanation: 'Java、Python和JavaScript都支持面向对象编程，C是面向过程的语言。',
        createdBy: teacher2.id
      },
      {
        type: 'multiple',
        subject: '数据结构',
        chapter: '第二章',
        difficulty: 'medium',
        content: '以下哪些是线性数据结构？',
        options: [
          { label: 'A', content: '数组' },
          { label: 'B', content: '链表' },
          { label: 'C', content: '树' },
          { label: 'D', content: '栈' }
        ],
        correctAnswer: ['A', 'B', 'D'],
        score: 10,
        explanation: '数组、链表、栈、队列都是线性结构，树是非线性结构。',
        createdBy: teacher2.id
      }
    ];

    // 判断题
    const judgeQuestions = [
      {
        type: 'judge',
        subject: '计算机基础',
        chapter: '第一章',
        difficulty: 'easy',
        content: 'CPU是计算机的核心部件。',
        correctAnswer: 'true',
        score: 5,
        explanation: 'CPU（中央处理器）确实是计算机的核心部件。',
        createdBy: teacher1.id
      },
      {
        type: 'judge',
        subject: '数据结构',
        chapter: '第二章',
        difficulty: 'easy',
        content: '数组和链表都可以随机访问元素。',
        correctAnswer: 'false',
        score: 5,
        explanation: '数组可以随机访问，但链表只能顺序访问。',
        createdBy: teacher1.id
      },
      {
        type: 'judge',
        subject: '算法',
        chapter: '第五章',
        difficulty: 'medium',
        content: '快速排序的时间复杂度是O(n log n)。',
        correctAnswer: 'true',
        score: 5,
        explanation: '快速排序的平均时间复杂度是O(n log n)。',
        createdBy: teacher1.id
      },
      {
        type: 'judge',
        subject: '计算机网络',
        chapter: '第三章',
        difficulty: 'easy',
        content: 'IP地址是用来标识网络中设备的唯一地址。',
        correctAnswer: 'true',
        score: 5,
        explanation: 'IP地址用于在网络中唯一标识每个设备。',
        createdBy: teacher2.id
      },
      {
        type: 'judge',
        subject: '数据库',
        chapter: '第四章',
        difficulty: 'medium',
        content: 'NoSQL数据库不支持事务处理。',
        correctAnswer: 'false',
        score: 5,
        explanation: '许多NoSQL数据库也支持事务处理，如MongoDB 4.0+支持多文档事务。',
        createdBy: teacher2.id
      },
      {
        type: 'judge',
        subject: '编程语言',
        chapter: '第六章',
        difficulty: 'easy',
        content: 'JavaScript只能在浏览器中运行。',
        correctAnswer: 'false',
        score: 5,
        explanation: 'JavaScript可以在浏览器、Node.js等多种环境中运行。',
        createdBy: teacher2.id
      }
    ];

    // 填空题
    const fillQuestions = [
      {
        type: 'fill',
        subject: '计算机网络',
        chapter: '第三章',
        difficulty: 'medium',
        content: 'HTTP协议的默认端口是____。',
        correctAnswer: '80',
        score: 5,
        explanation: 'HTTP协议的默认端口是80，HTTPS的默认端口是443。',
        createdBy: teacher1.id
      },
      {
        type: 'fill',
        subject: '数据库',
        chapter: '第四章',
        difficulty: 'medium',
        content: 'SQL中用于查询的关键字是____。',
        correctAnswer: 'SELECT',
        score: 5,
        explanation: 'SELECT是SQL中用于查询数据的关键字。',
        createdBy: teacher1.id
      },
      {
        type: 'fill',
        subject: '算法',
        chapter: '第五章',
        difficulty: 'hard',
        content: '二分查找的时间复杂度是____。',
        correctAnswer: 'O(log n)',
        score: 5,
        explanation: '二分查找每次将搜索范围减半，时间复杂度为O(log n)。',
        createdBy: teacher2.id
      },
      {
        type: 'fill',
        subject: '编程语言',
        chapter: '第六章',
        difficulty: 'easy',
        content: 'Python中用于定义函数的关键字是____。',
        correctAnswer: 'def',
        score: 5,
        explanation: 'Python使用def关键字来定义函数。',
        createdBy: teacher2.id
      }
    ];

    // 简答题
    const essayQuestions = [
      {
        type: 'essay',
        subject: '软件工程',
        chapter: '第七章',
        difficulty: 'hard',
        content: '请简述软件开发生命周期的主要阶段。',
        correctAnswer: '软件开发生命周期主要包括：需求分析、系统设计、编码实现、测试、部署和维护等阶段。',
        score: 15,
        explanation: '软件开发生命周期是软件开发的标准流程，包括从需求分析到维护的完整过程。',
        createdBy: teacher1.id
      },
      {
        type: 'essay',
        subject: '软件工程',
        chapter: '第七章',
        difficulty: 'hard',
        content: '什么是敏捷开发？请说明其特点。',
        correctAnswer: '敏捷开发是一种以人为核心、迭代、循序渐进的开发方法。特点包括：快速响应变化、强调团队协作、持续交付价值、重视客户反馈等。',
        score: 15,
        explanation: '敏捷开发强调快速迭代和持续改进，能够更好地适应需求变化。',
        createdBy: teacher1.id
      },
      {
        type: 'essay',
        subject: '数据结构',
        chapter: '第二章',
        difficulty: 'hard',
        content: '请说明哈希表的工作原理及其优缺点。',
        correctAnswer: '哈希表通过哈希函数将键映射到数组索引，实现快速查找。优点：查找、插入、删除的平均时间复杂度为O(1)。缺点：可能发生哈希冲突，需要额外空间，不支持有序遍历。',
        score: 15,
        explanation: '哈希表是一种高效的数据结构，适合需要快速查找的场景。',
        createdBy: teacher2.id
      }
    ];

    // 创建所有题目（使用 findOrCreate 避免重复）
    let createdCount = 0;
    for (const q of [...singleQuestions, ...multipleQuestions, ...judgeQuestions, ...fillQuestions, ...essayQuestions]) {
      const [question, questionCreated] = await Question.findOrCreate({
        where: { content: q.content },
        defaults: q
      });
      questions.push(question);
      if (questionCreated) createdCount++;
    }
    console.log(`✓ 处理${questions.length}道题目（新建${createdCount}道）`);

    // 3. 创建试卷（使用 findOrCreate 避免重复）
    const [paper1, paper1Created] = await Paper.findOrCreate({
      where: { title: '计算机基础综合测试' },
      defaults: {
        title: '计算机基础综合测试',
        description: '涵盖计算机基础、数据结构、网络等基础知识',
        subject: '计算机基础',
        totalScore: 60,
        duration: 120,
        questions: [
          { questionId: questions[0].id, score: 5, order: 1 },  // 计算机组成
          { questionId: questions[1].id, score: 5, order: 2 },  // 操作系统
          { questionId: questions[2].id, score: 5, order: 3 },  // 1GB=1024MB
          { questionId: questions[10].id, score: 10, order: 4 }, // TCP/IP协议栈（多选）
          { questionId: questions[14].id, score: 5, order: 5 },  // CPU判断题
          { questionId: questions[18].id, score: 5, order: 6 },  // HTTP端口填空
          { questionId: questions[22].id, score: 15, order: 7 }, // 软件生命周期简答
          { questionId: questions[23].id, score: 10, order: 8 }  // 敏捷开发简答
        ],
        createdBy: teacher1.id,
        status: 'published',
        publishedAt: new Date()
      }
    });
    console.log(paper1Created ? '✓ 创建试卷:' : '○ 试卷已存在:', paper1.title);

    const [paper2, paper2Created] = await Paper.findOrCreate({
      where: { title: '数据结构专项测试' },
      defaults: {
        title: '数据结构专项测试',
        description: '重点考察数据结构相关知识',
        subject: '数据结构',
        totalScore: 70,
        duration: 90,
        questions: [
          { questionId: questions[4].id, score: 5, order: 1 },   // 栈的特点
          { questionId: questions[5].id, score: 5, order: 2 },   // 二叉树遍历
          { questionId: questions[6].id, score: 5, order: 3 },   // 队列的特点
          { questionId: questions[13].id, score: 10, order: 4 },  // 线性结构（多选）
          { questionId: questions[15].id, score: 5, order: 5 },   // 数组链表判断
          { questionId: questions[20].id, score: 5, order: 6 },   // 二分查找填空
          { questionId: questions[24].id, score: 15, order: 7 }   // 哈希表简答
        ],
        createdBy: teacher1.id,
        status: 'published',
        publishedAt: new Date()
      }
    });
    console.log(paper2Created ? '✓ 创建试卷:' : '○ 试卷已存在:', paper2.title);

    const [paper3, paper3Created] = await Paper.findOrCreate({
      where: { title: '计算机网络基础' },
      defaults: {
        title: '计算机网络基础',
        description: '测试计算机网络基础知识',
        subject: '计算机网络',
        totalScore: 50,
        duration: 60,
        questions: [
          { questionId: questions[7].id, score: 5, order: 1 },   // HTTP端口
          { questionId: questions[8].id, score: 5, order: 2 },   // TCP和UDP
          { questionId: questions[10].id, score: 10, order: 3 },  // TCP/IP协议栈（多选）
          { questionId: questions[17].id, score: 5, order: 4 },   // IP地址判断
          { questionId: questions[18].id, score: 5, order: 5 }    // HTTP端口填空
        ],
        createdBy: teacher2.id,
        status: 'published',
        publishedAt: new Date()
      }
    });
    console.log(paper3Created ? '✓ 创建试卷:' : '○ 试卷已存在:', paper3.title);

    const [paper4, paper4Created] = await Paper.findOrCreate({
      where: { title: '数据库原理与应用' },
      defaults: {
        title: '数据库原理与应用',
        description: '考察数据库基础知识和SQL语句',
        subject: '数据库',
        totalScore: 45,
        duration: 60,
        questions: [
          { questionId: questions[9].id, score: 5, order: 1 },   // SQL查询关键字
          { questionId: questions[11].id, score: 10, order: 2 },  // 关系型数据库（多选）
          { questionId: questions[18].id, score: 5, order: 3 },   // NoSQL判断
          { questionId: questions[19].id, score: 5, order: 4 }    // SELECT填空
        ],
        createdBy: teacher2.id,
        status: 'published',
        publishedAt: new Date()
      }
    });
    console.log(paper4Created ? '✓ 创建试卷:' : '○ 试卷已存在:', paper4.title);

    const [paper5, paper5Created] = await Paper.findOrCreate({
      where: { title: '编程语言基础' },
      defaults: {
        title: '编程语言基础',
        description: '测试编程语言基础知识',
        subject: '编程语言',
        totalScore: 40,
        duration: 45,
        questions: [
          { questionId: questions[3].id, score: 5, order: 1 },   // 编程语言
          { questionId: questions[12].id, score: 10, order: 2 },  // 面向对象语言（多选）
          { questionId: questions[19].id, score: 5, order: 3 },   // JavaScript判断
          { questionId: questions[21].id, score: 5, order: 4 }    // Python def填空
        ],
        createdBy: teacher2.id,
        status: 'draft'
      }
    });
    console.log(paper5Created ? '✓ 创建试卷:' : '○ 试卷已存在:', paper5.title);

    console.log('\n✅ 测试数据创建完成！');
    console.log('\n数据统计：');
    console.log(`- 用户: ${3 + students.length}个 (1管理员 + 2教师 + ${students.length}学生)`);
    console.log(`- 题目: ${questions.length}道`);
    console.log('- 试卷: 5份 (4份已发布 + 1份草稿)');
    console.log('\n登录账号：');
    console.log('管理员: admin / 123456');
    console.log('教师: teacher1 / 123456, teacher2 / 123456');
    console.log('学生: student1 / 123456 (student1-student20)');

  } catch (error) {
    console.error('创建测试数据失败:', error);
  } finally {
    await sequelize.close();
  }
}

// 执行
seedDatabase();

