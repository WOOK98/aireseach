#!/usr/bin/env node

/**
 * Blogger CLI - 发布博客文章到 Blogger
 * 
 * 使用方法:
 *   node scripts/blogger/publish.mjs --title "标题" --content "内容" --labels "标签1,标签2"
 *   node scripts/blogger/publish.mjs --file path/to/article.md
 *   node scripts/blogger/publish.mjs --sync  (同步所有 CMS 博客到 Blogger)
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import { authenticate } from '@google-cloud/local-auth';
import matter from 'front-matter';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const BLOG_ID = '239043436833803416'; // Wook 的 Blogger 博客 ID
const TOKEN_PATH = join(__dirname, 'token.json');
const CREDENTIALS_PATH = join(__dirname, 'credentials.json');
const SCOPES = ['https://www.googleapis.com/auth/blogger'];

// 初始化 Blogger API
async function getBloggerClient() {
  let credentials;
  
  if (existsSync(TOKEN_PATH)) {
    credentials = JSON.parse(readFileSync(TOKEN_PATH, 'utf-8'));
  } else {
    // 首次运行需要 OAuth2 授权
    const auth = await authenticate({
      scopes: SCOPES,
      keyfilePath: CREDENTIALS_PATH,
    });
    
    credentials = auth.credentials;
    writeFileSync(TOKEN_PATH, JSON.stringify(credentials, null, 2));
    console.log('✅ Token 已保存到:', TOKEN_PATH);
  }
  
  const auth = new google.auth.OAuth2(
    JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf-8')).installed.client_id,
    JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf-8')).installed.client_secret,
    'http://localhost:3000/oauth2callback'
  );
  auth.setCredentials(credentials);
  
  return google.blogger({ version: 'v3', auth });
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
      status: draft ? 'draft' : 'live',
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
  const raw = readFileSync(filePath, 'utf-8');
  const parsed = matter(raw);
  const { title, tags = [], status } = parsed.attributes;
  const content = parsed.body;
  
  // 转换 Markdown 为 HTML (简单转换)
  const html = mdToHtml(content);
  
  return publishPost({
    title,
    content: html,
    labels: tags,
    draft: status === 'draft',
  });
}

// 同步 CMS 博客到 Blogger
async function syncAllPosts() {
  const blogDir = join(ROOT, 'packages/cms/src/collections/blog/content');
  const posts = [];
  
  // 读取所有博客目录
  const { readdirSync } = await import('fs');
  const dirs = readdirSync(blogDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  
  for (const dir of dirs) {
    const enPath = join(blogDir, dir, 'en.mdx');
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

// 简单 Markdown 转 HTML
function mdToHtml(md) {
  return md
    // 标题
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // 粗体和斜体
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // 链接
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    // 列表
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    // 段落
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hul])(.+)$/gm, '<p>$1</p>')
    // 水平线
    .replace(/^---$/gm, '<hr>')
    // 清理
    .replace(/<\/p><p>/g, '</p>\n<p>')
    .replace(/<p><\/p>/g, '');
}

// CLI 入口
const args = process.argv.slice(2);

if (args.includes('--help') || args.length === 0) {
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

if (args.includes('--list')) {
  const posts = await listPosts();
  console.log(`\n已发布文章 (${posts.length}):\n`);
  posts.forEach((p, i) => {
    console.log(`${i+1}. ${p.title}`);
    console.log(`   URL: ${p.url}`);
    console.log(`   发布: ${new Date(p.published).toLocaleDateString()}`);
    console.log('');
  });
  process.exit(0);
}

if (args.includes('--sync')) {
  console.log('🔄 开始同步 CMS 博客到 Blogger...\n');
  const results = await syncAllPosts();
  console.log(`\n✅ 同步完成: ${results.length} 篇文章`);
  process.exit(0);
}

if (args.includes('--file')) {
  const fileIdx = args.indexOf('--file') + 1;
  const filePath = args[fileIdx];
  if (!filePath || !existsSync(filePath)) {
    console.error('❌ 文件不存在:', filePath);
    process.exit(1);
  }
  const result = await publishFromFile(filePath);
  console.log('✅ 已发布:', result.title);
  console.log('   URL:', result.url);
  process.exit(0);
}

// 直接发布
const titleIdx = args.indexOf('--title') + 1;
const contentIdx = args.indexOf('--content') + 1;
const labelsIdx = args.indexOf('--labels') + 1;
const isDraft = args.includes('--draft');

if (!titleIdx || !contentIdx) {
  console.error('❌ 需要 --title 和 --content 参数');
  process.exit(1);
}

const result = await publishPost({
  title: args[titleIdx],
  content: args[contentIdx],
  labels: labelsIdx ? args[labelsIdx].split(',') : [],
  draft: isDraft,
});

console.log('✅ 已发布:', result.title);
console.log('   URL:', result.url);
