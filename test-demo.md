# 测试 Demo 步骤

## 1. 安装主包依赖
```bash
npm install
```

## 2. 构建主包
```bash
npm run build
```

## 3. 进入 demo 目录
```bash
cd demo
npm install
```

## 4. 运行 demo
```bash
npm run dev
```

## 5. 打开浏览器
访问 http://localhost:5173

## 预期效果

- 看到一个编辑器，里面有格式化的 Markdown 文本
- 当光标移动到 **粗体** 文本时，`**` 标记会平滑地出现
- 当光标移开时，`**` 标记会平滑地消失
- 可以点击 "Source Mode" 按钮查看所有标记
- 可以点击 "Live Preview" 按钮切换回实时预览模式

## 如果遇到问题

1. 确保 Node.js 版本 >= 18
2. 删除 node_modules 重新安装
3. 检查控制台是否有错误信息
