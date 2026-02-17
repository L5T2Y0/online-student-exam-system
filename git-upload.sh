#!/bin/bash

# GitHub 上传脚本
# 使用方法: bash git-upload.sh

echo "=========================================="
echo "  在线考试系统 - GitHub 上传脚本"
echo "=========================================="
echo ""

# 检查是否已经是Git仓库
if [ ! -d ".git" ]; then
    echo "📦 初始化 Git 仓库..."
    git init
    echo "✅ Git 仓库初始化完成"
else
    echo "✅ Git 仓库已存在"
fi

echo ""
echo "📝 添加所有文件..."
git add .

echo ""
echo "💾 提交更改..."
git commit -m "feat: 初始版本 v1.1.1 - 完整的在线考试系统

- 完整的前后端代码
- 23个测试用户（1管理员 + 2教师 + 20学生）
- 27道测试题目（7个科目）
- 5份测试试卷
- 完整的文档和测试报告
- 安全特性（JWT、CORS、频率限制、XSS防护）"

echo ""
echo "🔗 添加远程仓库..."
echo "请输入你的 GitHub 仓库地址（例如: https://github.com/username/online-exam-system.git）:"
read repo_url

if [ -z "$repo_url" ]; then
    echo "❌ 错误：仓库地址不能为空"
    exit 1
fi

# 检查是否已经添加了远程仓库
if git remote | grep -q "origin"; then
    echo "⚠️  远程仓库 origin 已存在，正在更新..."
    git remote set-url origin "$repo_url"
else
    git remote add origin "$repo_url"
fi

echo "✅ 远程仓库已配置: $repo_url"

echo ""
echo "🚀 推送到 GitHub..."
echo "正在推送到 main 分支..."

# 尝试推送到main分支
if git push -u origin main 2>/dev/null; then
    echo "✅ 推送成功！"
else
    echo "⚠️  main 分支推送失败，尝试 master 分支..."
    git branch -M main
    git push -u origin main
fi

echo ""
echo "=========================================="
echo "  🎉 上传完成！"
echo "=========================================="
echo ""
echo "📌 下一步操作："
echo "1. 访问你的 GitHub 仓库"
echo "2. 更新 README.md 中的仓库链接"
echo "3. 添加 Topics 标签"
echo "4. 设置仓库描述"
echo ""
echo "🔗 仓库地址: $repo_url"
echo ""
