@echo off
chcp 65001 >nul
echo ==========================================
echo   在线考试系统 - 快速上传到GitHub
echo ==========================================
echo.
echo 📝 使用说明：
echo 1. 先在GitHub创建新仓库（不要添加README等文件）
echo 2. 复制仓库地址（例如：https://github.com/username/online-exam-system.git）
echo 3. 在下面输入仓库地址
echo.
echo ==========================================
echo.

set /p repo_url="请输入你的GitHub仓库地址: "

if "%repo_url%"=="" (
    echo.
    echo ❌ 错误：仓库地址不能为空
    echo.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo   开始上传...
echo ==========================================
echo.

echo 📦 步骤 1/6: 初始化Git仓库...
git init
if %errorlevel% neq 0 (
    echo ❌ Git初始化失败，请确保已安装Git
    pause
    exit /b 1
)
echo ✅ Git仓库初始化完成
echo.

echo 📝 步骤 2/6: 添加所有文件...
git add .
if %errorlevel% neq 0 (
    echo ❌ 添加文件失败
    pause
    exit /b 1
)
echo ✅ 文件添加完成
echo.

echo 💾 步骤 3/6: 提交更改...
git commit -m "feat: 初始版本 v1.1.1 - 完整的在线考试系统" -m "" -m "- 完整的前后端代码" -m "- 23个测试用户（1管理员 + 2教师 + 20学生）" -m "- 27道测试题目（7个科目）" -m "- 5份测试试卷" -m "- 完整的文档和测试报告" -m "- 安全特性（JWT、CORS、频率限制、XSS防护）"
if %errorlevel% neq 0 (
    echo ❌ 提交失败
    pause
    exit /b 1
)
echo ✅ 提交完成
echo.

echo 🔗 步骤 4/6: 添加远程仓库...
git remote add origin "%repo_url%"
if %errorlevel% neq 0 (
    echo ⚠️  远程仓库可能已存在，尝试更新...
    git remote set-url origin "%repo_url%"
)
echo ✅ 远程仓库配置完成
echo.

echo 🌿 步骤 5/6: 设置主分支...
git branch -M main
echo ✅ 分支设置完成
echo.

echo 🚀 步骤 6/6: 推送到GitHub...
echo.
echo ⚠️  如果提示输入用户名和密码：
echo    - 用户名：你的GitHub用户名
echo    - 密码：使用Personal Access Token（不是GitHub密码）
echo.
echo 💡 如何获取Token：
echo    1. 访问 https://github.com/settings/tokens
echo    2. 点击 "Generate new token (classic)"
echo    3. 勾选 repo 权限
echo    4. 复制生成的token作为密码使用
echo.
pause
echo.

git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ==========================================
    echo   🎉 上传成功！
    echo ==========================================
    echo.
    echo ✅ 项目已成功上传到GitHub
    echo.
    echo 📌 下一步操作：
    echo 1. 访问你的GitHub仓库
    echo 2. 更新README.md中的仓库链接
    echo 3. 添加Topics标签
    echo 4. 设置仓库描述
    echo.
    echo 🔗 仓库地址: %repo_url%
    echo.
) else (
    echo.
    echo ==========================================
    echo   ❌ 上传失败
    echo ==========================================
    echo.
    echo 可能的原因：
    echo 1. 网络连接问题
    echo 2. GitHub仓库地址错误
    echo 3. 没有推送权限（需要Personal Access Token）
    echo 4. 仓库已存在内容（需要先pull）
    echo.
    echo 💡 建议：
    echo 1. 检查网络连接
    echo 2. 确认仓库地址正确
    echo 3. 使用Personal Access Token作为密码
    echo 4. 或者使用GitHub Desktop上传
    echo.
)

pause
