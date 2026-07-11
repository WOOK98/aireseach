#!/usr/bin/env node

/**
 * Blogger CLI - 发布博客文章到 Blogger
 *
 * 使用方法:
 *   node scripts/blogger/publish.mjs --title "标题" --content "内容" --labels "标签1,标签2"
 *   node scripts/blogger/publish.mjs --file path/to/article.md
 *   node scripts/blogger/publish.mjs --sync  (同步所有 CMS 博客到 Blogger)
 */

import { authenticate } from "@google-cloud/local-auth";
import matter from "front-matter";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { google } from "googleapis";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const BLOG_ID = "239043436833803416"; // Wook 的 Blogger 博客 ID
const TOKEN_PATH = join(__dirname, "token.json");
const CREDENTIALS_PATH = join(__dirname, "credentials.json");
const SCOPES = ["https://www.googleapis.com/auth/blogger"];

// 初始化 Blogger API
async function getBloggerClient() {
  let credentials;

  if (existsSync(TOKEN_PATH)) {
    credentials = JSON.parse(readFileSync(TOKEN_PATH, "utf-8"));
  } else {
    // 首次运行需要 OAuth2 授权
    const auth = await authenticate({
      scopes: SCOPES,
      keyfilePath: CREDENTIALS_PATH,
    });

    credentials = auth.credentials;
    writeFileSync(TOKEN_PATH, JSON.stringify(credentials, null, 2));
    console.log("✅ Token 已保存到:", TOKEN_PATH);
  }

  const auth = new google.auth.OAuth2(
    JSON.parse(readFileSync(CREDENTIALS_PATH, "utf-8")).installed.client_id,
    JSON.parse(readFileSync(CREDENTIALS_PATH, "utf-8")).installed.client_secret,
    "http://localhost:3000/oauth2callback",
  );
  auth.setCredentials(credentials);

  return google.blogger({ version: "v3", auth });
}

// 发布文章
async function publishPost({ title, content, labels = [], draft = false }) {
  const blogger = await getBloggerClient();

  const res = await blogger.posts.insert({
    blogId: BLOG_ID,
    requestBody: {
      title,
      content,
      labels,
      status: draft ? "draft" : "live",
    },
  });

  return res.data;
}

// 更新文章
async function updatePost(postId, { title, content, labels }) {
  const blogger = await getBloggerClient();

  const res = await blogger.posts.update({
    blogId: BLOG_ID,
    postId,
    requestBody: {
      title,
      content,
      labels,
    },
  });

  return res.data;
}

// 获取所有文章
async function listPosts(maxResults = 50) {
  const blogger = await getBloggerClient();

  const res = await blogger.posts.list({
    blogId: BLOG_ID,
    maxResults,
  });

  return res.data.items || [];
}

// 从 MDX 文件发布
async function publishFromFile(filePath) {
  const raw = readFileSync(filePath, "utf-8");
  const parsed = matter(raw);
  const {
    title,
    tags = [],
    status,
    thumbnail,
    description,
  } = parsed.attributes;
  const content = parsed.body;

  // 转换 Markdown 为高质量 HTML
  const html = mdToHtml(content, { title, thumbnail, description });

  return publishPost({
    title,
    content: html,
    labels: tags,
    draft: status === "draft",
  });
}

// 同步 CMS 博客到 Blogger
async function syncAllPosts() {
  const blogDir = join(ROOT, "packages/cms/src/collections/blog/content");
  const posts = [];

  // 读取所有博客目录
  const { readdirSync } = await import("fs");
  const dirs = readdirSync(blogDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const dir of dirs) {
    const enPath = join(blogDir, dir, "en.mdx");
    if (existsSync(enPath)) {
      try {
        const result = await publishFromFile(enPath);
        posts.push({ slug: dir, title: result.title, url: result.url });
        console.log(`✅ 已发布: ${result.title}`);
        console.log(`   URL: ${result.url}`);
      } catch (err) {
        console.error(`❌ 发布失败 ${dir}:`, err.message);
      }
    }
  }

  return posts;
}

// 高质量 Markdown 转 HTML
function mdToHtml(md, { title, thumbnail, description } = {}) {
  let html = md;

  // 移除 frontmatter 之后的内容（已经在 body 里）

  // 代码块（先处理，避免被其他规则影响）
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<div style="background:#1e1e1e;color:#d4d4d4;padding:16px;border-radius:8px;overflow-x:auto;font-family:'Fira Code',monospace;font-size:14px;line-height:1.6;margin:20px 0;"><pre style="margin:0;white-space:pre-wrap;">${code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre></div>`;
  });

  // 行内代码
  html = html.replace(
    /`([^`]+)`/g,
    '<code style="background:#f0f0f0;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:0.9em;">$1</code>',
  );

  // 标题
  html = html.replace(
    /^### (.+)$/gm,
    '<h3 style="font-size:20px;font-weight:700;margin:32px 0 16px;color:#1a1a1a;">$1</h3>',
  );
  html = html.replace(
    /^## (.+)$/gm,
    '<h2 style="font-size:24px;font-weight:700;margin:40px 0 16px;color:#1a1a1a;border-bottom:2px solid #e5e5e5;padding-bottom:8px;">$1</h2>',
  );
  html = html.replace(
    /^# (.+)$/gm,
    '<h1 style="font-size:32px;font-weight:800;margin:48px 0 24px;color:#0a0a0a;">$1</h1>',
  );

  // 粗体和斜体
  html = html.replace(
    /\*\*(.+?)\*\*/g,
    '<strong style="font-weight:700;color:#1a1a1a;">$1</strong>',
  );
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // 链接
  html = html.replace(
    /\[(.+?)\]\((.+?)\)/g,
    '<a href="$2" style="color:#2563eb;text-decoration:underline;">$1</a>',
  );

  // 引用块
  html = html.replace(
    /^> (.+)$/gm,
    '<blockquote style="border-left:4px solid #2563eb;padding:12px 20px;margin:20px 0;background:#f8fafc;font-style:italic;color:#475569;">$1</blockquote>',
  );

  // 表格
  html = html.replace(
    /\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)+)/g,
    (match, header, rows) => {
      const headerCells = header
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      const bodyRows = rows
        .trim()
        .split("\n")
        .map((row) =>
          row
            .split("|")
            .map((c) => c.trim())
            .filter(Boolean),
        );

      let table =
        '<table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:15px;">';
      table += "<thead><tr>";
      headerCells.forEach((cell) => {
        table += `<th style="background:#f1f5f9;padding:12px 16px;text-align:left;border:1px solid #e2e8f0;font-weight:600;">${cell}</th>`;
      });
      table += "</tr></thead><tbody>";
      bodyRows.forEach((row) => {
        table += "<tr>";
        row.forEach((cell) => {
          table += `<td style="padding:12px 16px;border:1px solid #e2e8f0;">${cell}</td>`;
        });
        table += "</tr>";
      });
      table += "</tbody></table>";
      return table;
    },
  );

  // 无序列表
  html = html.replace(
    /^- (.+)$/gm,
    '<li style="margin:8px 0;line-height:1.7;">$1</li>',
  );
  html = html.replace(
    /(<li[\s\S]*?<\/li>)/g,
    '<ul style="padding-left:24px;margin:16px 0;">$1</ul>',
  );

  // 有序列表
  html = html.replace(
    /^\d+\. (.+)$/gm,
    '<li style="margin:8px 0;line-height:1.7;">$1</li>',
  );

  // 复选框列表
  html = html.replace(
    /- \[x\] (.+)$/gm,
    '<div style="margin:8px 0;padding:8px 12px;background:#f0fdf4;border-radius:6px;">✅ $1</div>',
  );
  html = html.replace(
    /- \[ \] (.+)$/gm,
    '<div style="margin:8px 0;padding:8px 12px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;">⬜ $1</div>',
  );

  // 水平线
  html = html.replace(
    /^---$/gm,
    '<hr style="border:none;border-top:2px solid #e5e5e5;margin:40px 0;">',
  );

  // 段落（非标签行）
  html = html.replace(/^(?!<[a-z/])(.+)$/gm, (match, content) => {
    if (content.trim() === "") return "";
    return `<p style="font-size:16px;line-height:1.8;margin:16px 0;color:#374151;">${content}</p>`;
  });

  // 清理重复的 ul
  html = html.replace(/<\/ul>\s*<ul[^>]*>/g, "");

  // 添加封面图
  const heroImg = thumbnail
    ? `<div style="margin:0 0 32px;"><img src="${thumbnail}" alt="${title}" style="width:100%;max-height:400px;object-fit:cover;border-radius:12px;" /></div>`
    : "";

  // 添加描述
  const descHtml = description
    ? `<p style="font-size:18px;color:#64748b;line-height:1.6;margin:0 0 32px;font-style:italic;">${description}</p>`
    : "";

  // 包装为完整的文章 HTML
  return `
<div style="max-width:720px;margin:0 auto;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  ${heroImg}
  ${descHtml}
  ${html}
  <hr style="border:none;border-top:2px solid #e5e5e5;margin:40px 0;">
  <div style="background:#f8fafc;padding:24px;border-radius:12px;margin:32px 0;">
    <p style="font-size:14px;color:#64748b;margin:0;">
      📝 本文由 <a href="https://www.airesearchs.com" style="color:#2563eb;font-weight:600;">AI Research</a> 团队撰写
      &nbsp;·&nbsp; 最后更新：${new Date().toLocaleDateString("zh-CN")}
      &nbsp;·&nbsp; 更多内容请访问 <a href="https://www.airesearchs.com/blog" style="color:#2563eb;">airesearchs.com/blog</a>
    </p>
  </div>
</div>`;
}

// CLI 入口
const args = process.argv.slice(2);

if (args.includes("--help") || args.length === 0) {
  console.log(`
Blogger CLI - 发布博客文章到 Blogger

使用方法:
  node scripts/blogger/publish.mjs --title "标题" --content "内容" [--labels "标签1,标签2"] [--draft]
  node scripts/blogger/publish.mjs --file path/to/article.mdx
  node scripts/blogger/publish.mjs --sync
  node scripts/blogger/publish.mjs --list

参数:
  --title    文章标题
  --content  文章内容 (HTML 或 Markdown)
  --labels   标签 (逗号分隔)
  --draft    保存为草稿
  --file     从 MDX 文件发布
  --sync     同步所有 CMS 博客到 Blogger
  --list     列出所有已发布文章
  `);
  process.exit(0);
}

if (args.includes("--update")) {
  const postIdx = args.indexOf("--post-id") + 1;
  const fileIdx = args.indexOf("--file") + 1;

  if (!postIdx || !fileIdx) {
    console.error("❌ 需要 --post-id 和 --file 参数");
    process.exit(1);
  }

  const postId = args[postIdx];
  const filePath = args[fileIdx];

  if (!existsSync(filePath)) {
    console.error("❌ 文件不存在:", filePath);
    process.exit(1);
  }

  const raw = readFileSync(filePath, "utf-8");
  const parsed = matter(raw);
  const { title, tags = [], thumbnail, description } = parsed.attributes;
  const content = parsed.body;
  const html = mdToHtml(content, { title, thumbnail, description });

  const result = await updatePost(postId, {
    title,
    content: html,
    labels: tags,
  });
  console.log("✅ 已更新:", result.title);
  console.log("   URL:", result.url);
  process.exit(0);
}

if (args.includes("--list")) {
  const posts = await listPosts();
  console.log(`\n已发布文章 (${posts.length}):\n`);
  posts.forEach((p, i) => {
    console.log(`${i + 1}. ${p.title}`);
    console.log(`   URL: ${p.url}`);
    console.log(`   发布: ${new Date(p.published).toLocaleDateString()}`);
    console.log("");
  });
  process.exit(0);
}

if (args.includes("--sync")) {
  console.log("🔄 开始同步 CMS 博客到 Blogger...\n");
  const results = await syncAllPosts();
  console.log(`\n✅ 同步完成: ${results.length} 篇文章`);
  process.exit(0);
}

if (args.includes("--file")) {
  const fileIdx = args.indexOf("--file") + 1;
  const filePath = args[fileIdx];
  if (!filePath || !existsSync(filePath)) {
    console.error("❌ 文件不存在:", filePath);
    process.exit(1);
  }
  const result = await publishFromFile(filePath);
  console.log("✅ 已发布:", result.title);
  console.log("   URL:", result.url);
  process.exit(0);
}

// 直接发布
const titleIdx = args.indexOf("--title") + 1;
const contentIdx = args.indexOf("--content") + 1;
const labelsIdx = args.indexOf("--labels") + 1;
const isDraft = args.includes("--draft");

if (!titleIdx || !contentIdx) {
  console.error("❌ 需要 --title 和 --content 参数");
  process.exit(1);
}

const result = await publishPost({
  title: args[titleIdx],
  content: args[contentIdx],
  labels: labelsIdx ? args[labelsIdx].split(",") : [],
  draft: isDraft,
});

console.log("✅ 已发布:", result.title);
console.log("   URL:", result.url);
