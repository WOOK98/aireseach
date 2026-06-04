# Blogger CLI

自动将 CMS 博客文章发布到 Blogger。

## 首次设置

### 1. 获取 Google Cloud 凭证

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 [Blogger API](https://console.cloud.google.com/apis/library/blogger.googleapis.com)
4. 前往 "API 和服务" > "凭据"
5. 点击 "创建凭据" > "OAuth 客户端 ID"
6. 应用类型选择 "桌面应用"
7. 下载 JSON 文件
8. 将下载的 JSON 文件重命名为 `credentials.json` 放到 `scripts/blogger/` 目录

### 2. 运行设置向导

```bash
pnpm blogger:setup
```

这会打开浏览器进行 OAuth2 授权。

### 3. 验证设置

```bash
pnpm blogger:list
```

如果能看到文章列表，说明设置成功。

## 使用方法

### 列出所有文章

```bash
pnpm blogger:list
```

### 同步所有 CMS 博客到 Blogger

```bash
pnpm blogger:sync
```

### 发布单篇文章

```bash
pnpm blogger:publish --file packages/cms/src/collections/blog/content/best-ai-tools-2026/en.mdx
```

### 直接发布内容

```bash
pnpm blogger:publish --title "标题" --content "<p>内容</p>" --labels "标签1,标签2"
```

### 保存为草稿

```bash
pnpm blogger:publish --title "标题" --content "<p>内容</p>" --draft
```

## 文件结构

```
scripts/blogger/
├── README.md         # 本文件
├── setup.mjs         # 设置向导
├── publish.mjs       # 发布脚本
├── credentials.json  # Google OAuth2 凭证 (需要手动添加)
└── token.json        # OAuth2 Token (自动生成)
```

## 注意事项

- `credentials.json` 包含敏感信息，已添加到 `.gitignore`
- `token.json` 包含访问令牌，已添加到 `.gitignore`
- 首次运行需要浏览器进行 OAuth2 授权
- Token 过期后需要重新授权
