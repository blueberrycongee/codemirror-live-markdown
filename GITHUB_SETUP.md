# 🚀 GitHub 推送指南

## ✅ 已完成的步骤

- ✅ Git 仓库已初始化
- ✅ 所有文件已添加
- ✅ 首次提交已完成

## 📋 接下来的步骤

### 1. 在 GitHub 创建仓库

访问：https://github.com/new

填写信息：
```
Repository name: codemirror-obsidian-mode
Description: Obsidian-style Live Preview mode for CodeMirror 6
Public ✅
不要勾选任何初始化选项（README、.gitignore、License）
```

点击 **"Create repository"**

### 2. 复制你的仓库 URL

创建后，GitHub 会显示类似这样的 URL：
```
https://github.com/你的用户名/codemirror-obsidian-mode.git
```

### 3. 在终端运行以下命令

**替换 `你的用户名` 为你的 GitHub 用户名：**

```bash
# 添加远程仓库
git remote add origin https://github.com/你的用户名/codemirror-obsidian-mode.git

# 推送到 GitHub
git push -u origin master
```

### 4. 刷新 GitHub 页面

你应该能看到所有文件已经上传！

## 🏷️ 可选：添加版本标签

```bash
git tag v0.1.0
git push origin v0.1.0
```

## 📝 后续提交

以后修改代码后：

```bash
git add .
git commit -m "feat: 你的修改描述"
git push
```

## 🎯 推荐的下一步

1. **添加仓库描述和主题**
   - 在 GitHub 仓库页面点击 ⚙️ Settings
   - 添加 Topics: `codemirror`, `markdown`, `live-preview`, `obsidian`, `editor`

2. **启用 GitHub Pages（可选）**
   - 可以把 demo 部署到 GitHub Pages
   - Settings → Pages → Source: GitHub Actions

3. **添加 README 徽章**
   - 在 README.md 中添加 CI 状态徽章
   - 添加 npm 版本徽章（发布后）

## ❓ 遇到问题？

### 如果提示需要配置用户信息：

```bash
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"
```

### 如果推送失败（需要认证）：

1. 使用 GitHub CLI：`gh auth login`
2. 或使用 Personal Access Token
3. 或使用 SSH key

---

**准备好了吗？去 GitHub 创建仓库吧！** 🚀
