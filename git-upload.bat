@echo off
chcp 65001 >nul
echo ==========================================
echo   在线考试系统 - GitHub 上传脚本
echo ==========================================
echo.

REM 检查是否已经是Git仓库
if not exist ".git" (
    echo 📦 初始化 Git 仓库...
    git init
    echo ✅ Git 仓库初始化完成
) else (
    echo ✅ Git 仓库已存在
)

echo.
echo 📝 添加所有文件...
git add .

echo.
echo 💾 提交更改...
git commit -m "feat: 初始版本 v1.1.1 - 完整的在线考试系统" -m "- 完整的前后端代码" -m "- 23个测试用户（1管理员 + 2教师 + 20学生）" -m "- 27道测试题目（7个科目）" -m "- 5份测试试卷" -m "- 完整的文档和测试报告" -m "- 安全特性（JWT、CORS、频率限制、XSS防护）"

echo.
echo 🔗 添加远程仓库...
set /p repo_url="请输入你的 GitHub 仓库地址（例如: https://github.com/username/online-exam-system.git）: "

if "%repo_url%"=="" (
    echo ❌ 错误：仓库地址不能为空
    pause
    exit /b 1
)

REM 检查是否已经添加了远程仓库
git remote | findstr "origin" >nul
if %errorlevel%==0 (
    echo ⚠️  远程仓库 origin 已存在，正在更新...
    git remote set-url origin "%repo_url%"
) else (
    git remote add origin "%repo_url%"
)

echo ✅ 远程仓库已配置: %repo_url%

echo.
echo 🚀 推送到 GitHub...
echo 正在推送到 main 分支...

REM 尝试推送到main分支
git branch -M main
git push -u origin main

if %errorlevel%==0 (
    echo ✅ 推送成功！
) else (
    echo ❌ 推送失败，请检查：
    echo 1. 网络连接是否正常
    echo 2. GitHub 仓库地址是否正确
    echo 3. 是否有推送权限
)

echo.
echo ==========================================
echo   🎉 上传完成！
echo ==========================================
echo.
echo 📌 下一步操作：
echo 1. 访问你的 GitHub 仓库
echo 2. 更新 README.md 中的仓库链接
echo 3. 添加 Topics 标签
echo 4. 设置仓库描述
echo.
echo 🔗 仓库地址: %repo_url%
echo.
pause
