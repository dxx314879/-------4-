# Vercel 部署说明

## ✅ 问题已解决

**问题**: `No Output Directory named "public" found after the Build completed`

**解决方案**: 已将所有静态文件移动到 `public` 目录，并配置了 `vercel.json`

## 📁 当前项目结构

```
├── api/
│   └── socket.js          # Socket.io 服务器端
├── public/                # 静态文件目录 (Vercel输出目录)
│   ├── index.html         # 主页面
│   ├── style.css          # 样式文件
│   ├── script.js          # 原始脚本
│   └── script-realtime.js # 实时聊天脚本
├── package.json           # 项目配置
├── vercel.json           # Vercel配置
└── README.md             # 项目说明
```

## 🚀 部署步骤

### 方法一：Vercel CLI
```bash
# 1. 安装 Vercel CLI
npm install -g vercel

# 2. 登录 Vercel
vercel login

# 3. 部署项目
vercel

# 4. 选择配置
# - Set up and deploy? [Y/n] Y
# - Which scope? [你的用户名]
# - Link to existing project? [N/y] N
# - What's your project's name? [项目名称]
# - In which directory is your code located? [./]
```

### 方法二：GitHub 集成
1. 推送代码到 GitHub
2. 访问 [vercel.com](https://vercel.com)
3. 点击 "New Project"
4. 选择你的 GitHub 仓库
5. 点击 "Deploy"

## ⚙️ 配置说明

### vercel.json 配置
```json
{
  "functions": {
    "api/socket.js": {
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/socket.io/(.*)",
      "destination": "/api/socket"
    }
  ],
  "outputDirectory": "public"  // 指定输出目录
}
```

### package.json 配置
```json
{
  "scripts": {
    "build": "echo 'Static files are in public directory'",
    "dev": "vercel dev"
  }
}
```

## 🔧 本地测试

```bash
# 安装依赖
npm install

# 启动开发服务器
vercel dev

# 访问 http://localhost:3000
```

## ✅ 验证部署

部署成功后，访问你的 Vercel URL，应该能看到：
- 多人协作任务管理界面
- 实时聊天功能
- Socket.io 连接正常

## 🐛 故障排除

如果仍然遇到问题：

1. **检查文件结构**
   ```bash
   ls -la public/
   ```

2. **检查 vercel.json**
   - 确保 `outputDirectory` 设置为 `"public"`
   - 确保 API 路由配置正确

3. **重新部署**
   ```bash
   vercel --prod
   ```

4. **查看部署日志**
   - 在 Vercel 控制台查看构建日志
   - 检查是否有错误信息

## 🎉 成功部署后

你的应用将支持：
- ✅ 多用户实时聊天
- ✅ 任务协作管理
- ✅ 在线状态显示
- ✅ 实时消息推送

享受你的多人协作应用！🚀
