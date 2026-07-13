#!/usr/bin/env node

/**
 * Blogger API 设置向导
 *
 * 使用方法: node scripts/blogger/setup.mjs
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { google } from "googleapis";
import http from "http";
import open from "open";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { URL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKEN_PATH = join(__dirname, "token.json");
const CREDENTIALS_PATH = join(__dirname, "credentials.json");
const SCOPES = ["https://www.googleapis.com/auth/blogger"];

console.log(`
╔══════════════════════════════════════════════════════════════╗
║           Blogger API 设置向导                               ║
╚══════════════════════════════════════════════════════════════╝

📋 设置步骤:

1️⃣  前往 Google Cloud Console
    https://console.cloud.google.com/

2️⃣  创建新项目或选择现有项目

3️⃣  启用 Blogger API
    https://console.cloud.google.com/apis/library/blogger.googleapis.com

4️⃣  创建 OAuth2 凭证
    - 前往 "API 和服务" > "凭据"
    - 点击 "创建凭据" > "OAuth 客户端 ID"
    - 应用类型选择 "桌面应用"
    - 下载 JSON 文件

5️⃣  将下载的 JSON 文件重命名为 credentials.json
    放到: ${CREDENTIALS_PATH}

6️⃣  运行此脚本完成授权
`);

if (!existsSync(CREDENTIALS_PATH)) {
  console.log("❌ 未找到 credentials.json 文件");
  console.log(
    `   请先完成步骤 1-5，然后将 credentials.json 放到:\n   ${CREDENTIALS_PATH}\n`,
  );
  process.exit(1);
}

console.log("✅ 找到 credentials.json\n");

// 启动本地服务器处理 OAuth2 回调
async function startAuthServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, "http://localhost:3000");

      if (url.pathname === "/oauth2callback") {
        const code = url.searchParams.get("code");
        res.end("授权成功！请关闭此窗口。");
        server.close();
        resolve(code);
      }
    });

    server.listen(3000, () => {
      console.log("🔗 等待 OAuth2 回调...");
    });
  });
}

// 获取授权码
async function getAuthCode() {
  const credentials = JSON.parse(readFileSync(CREDENTIALS_PATH, "utf-8"));
  const { client_id, client_secret } = credentials.installed;

  const auth = new google.auth.OAuth2(
    client_id,
    client_secret,
    "http://localhost:3000/oauth2callback",
  );

  const authUrl = auth.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });

  console.log("🌐 正在打开浏览器进行授权...\n");
  console.log("如果浏览器没有自动打开，请手动访问:");
  console.log(authUrl);
  console.log("");

  await open(authUrl);

  const code = await startAuthServer();

  const { tokens } = await auth.getToken(code);
  writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));

  console.log("✅ Token 已保存到:", TOKEN_PATH);

  return tokens;
}

// 验证 token
async function verifyToken() {
  if (!existsSync(TOKEN_PATH)) {
    return false;
  }

  const credentials = JSON.parse(readFileSync(CREDENTIALS_PATH, "utf-8"));
  const { client_id, client_secret } = credentials.installed;

  const auth = new google.auth.OAuth2(client_id, client_secret);
  auth.setCredentials(JSON.parse(readFileSync(TOKEN_PATH, "utf-8")));

  try {
    const blogger = google.blogger({ version: "v3", auth });
    const res = await blogger.blogs.get({ blogId: "239043436833803416" });
    return true;
  } catch (err) {
    return false;
  }
}

// 主流程
const isValid = await verifyToken();

if (isValid) {
  console.log("✅ Token 有效，Blogger API 已就绪！");
  console.log("\n可以使用以下命令发布文章:");
  console.log("  node scripts/blogger/publish.mjs --list");
  console.log("  node scripts/blogger/publish.mjs --sync");
} else {
  console.log("🔄 需要重新授权...\n");
  await getAuthCode();

  // 验证新 token
  const isValidNow = await verifyToken();
  if (isValidNow) {
    console.log("\n✅ Blogger API 设置完成！");
    console.log("\n可以使用以下命令发布文章:");
    console.log("  node scripts/blogger/publish.mjs --list");
    console.log("  node scripts/blogger/publish.mjs --sync");
  } else {
    console.log("\n❌ 授权失败，请重试");
    process.exit(1);
  }
}
