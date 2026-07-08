---
name: airesearch-plugin-promo
description: Create promotion and distribution content for the airesearch-plugin (Claude Code / Codex plugin with deep-dive and snapshot skills, hosted MCP at airesearchs.com/api/mcp). Use whenever Wook wants to promote the plugin, write README/docs/launch posts, grow plugin installs, "插件推广", "获客", developer marketing, listing the plugin in directories, or turn a product update into bilingual (EN/中文) launch content.
---

# airesearch-plugin Ecosystem Promotion

Goal: turn the `airesearch-plugin` (deep-dive + snapshot skills, 6 lenses, hosted MCP with 5 tools) into a discoverable, installable, talked-about product in the Claude Code / Codex ecosystem. Every asset must lead to one action: install the plugin or visit airesearchs.com.

## Before writing anything

1. Verify current plugin state in `WOOK98/aireseach` (install command, MCP endpoint auth story, tool list). Never publish an install flow you haven't confirmed works — especially: the MCP server requires an API key, so docs must explain how users obtain one (this is also the conversion point to registered accounts).
2. Search for the current state of Claude Code plugin/skill directories and marketplaces before recommending listing targets — this ecosystem changes fast; do not rely on memory.

## Asset stack (produce in this order)

### 1. README (repo front door, English)
Structure: one-line value prop → 30-second demo GIF placeholder → install (copy-paste, one block) → 3 example prompts with real abbreviated output → how the 6 lenses work → getting an API key → limits/pricing → disclaimer (not investment advice). Keep under 200 lines. The README is the landing page; write it like one.

### 2. Launch thread — X 中文
Wook's audience overlap: AI 工具 + 美股/投研圈. Format per Wook's established style: hook first tweet (具体场景:"在 Claude Code 里一句话生成一份 6 维度的个股深度报告"), 5–8 tweets, each one concrete capability with example query, end with install command + link. 避免空话("强大"、"高效"),每条都给一个可复制的 prompt。

### 3. Launch post — English (X + Reddit)
Reddit targets: subreddits for Claude/AI coding tools and algotrading/investing-tools communities (verify current subreddit rules on self-promotion first; prefer "I built X, here's how it works" show-and-tell format with genuine technical detail — the entity-resolution bug story is good material: "my plugin confidently analyzed a rubber compound as a stock ticker, here's how I fixed it").

### 4. Docs page on airesearchs.com
`/plugin` route: install, auth, tool reference for the 5 MCP tools, changelog. This page is also the SEO target for "claude code stock research plugin" style queries.

### 5. Ongoing cadence
Each meaningful release → one 中文 thread + one EN post, generated via this skill. Reuse the `report-to-social.skill` pipeline pattern: changelog → thread → blog HTML.

## Distribution checklist (work through, verify each currently exists)
- Anthropic/Claude Code community plugin listings or awesome-lists (submit PR)
- MCP server registries/directories
- Product Hunt (only when demo GIF + docs page are ready)
- Hacker News Show HN (the ticker-misresolution war story angle, technical depth required)

## Style rules
- 中文内容:口语化但信息密度高,数字和例子优先,不用感叹号轰炸。
- English: developer-to-developer tone, show real output, admit limitations explicitly (builds trust in finance tooling).
- Every asset ends with exactly one CTA.
- Financial content must carry a "research tool, not investment advice" line.
