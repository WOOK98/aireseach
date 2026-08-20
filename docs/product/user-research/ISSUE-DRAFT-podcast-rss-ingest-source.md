# Issue 草稿：Podcast/RSS 作为 Creator Research Pipeline 的 ingest 数据源

> 状态：草稿，待 Wook 确认后提交到 GitHub
> 建议标题：`feat: podcast/RSS ingest source for creator research pipeline`
> 建议标签：`enhancement` `P2`（不阻塞 #152 当前刀序）

## 背景

Creator Research Pipeline（#130/#131/#134）目前只支持 X 作为 creator 内容来源。真实用户工作流显示（见 `docs/product/user-research/2026-08-10-fourier-cat-podcast-workflow.md`），优质财经播客是被低估的选题/研究来源：

- 长访谈保留「判断如何形成」的过程信息，evidence 密度高于短帖子
- RSS 是开放标准，无 X API 的合规风险、调用成本和 rate limit 压力
- 与现有 pipeline 架构同构：creator 内容 → 结构化入队 → 人工审核 → 发展成研究

## 范围（第一刀）

复用 #131 的 source config / ingest runner / persistent queue / review UI 骨架，新增 podcast source 类型：

1. **PodcastSourceConfig**：show 名称、RSS URL、分类、语言、入选理由（参考用户研究素材中的监控库字段）
2. **RssIngestAdapter**（read-only）：
   - 流式解析 XML，单 Feed 32 MiB 上限
   - 重定向逐次检查，拒绝内网地址 / IP 直连（SSRF 护栏）
   - 四级排重：GUID → item link → enclosure URL → title+pubDate
   - 只保留可配置时间窗内的新单集（默认 48h）
3. **入队**：单集作为 queue item，字段含标题、发布时间、音频链接、简介、show 元信息
4. **Review UI**：复用现有 review queue，新增 source type 筛选

参考实现（开源，已过安全 review）：https://github.com/wanguolin/cf-worker-notion-podcast-monitor

## 红线（继承 #130）

- Read-only：只抓 RSS，不下载音频、不做转写（转写/ASR 是后续独立刀）
- 排重必须幂等：队列重试 / 网络超时不产生重复入队
- 外部输入不信任：RSS 内容渲染前全部 sanitize，动态字段 notranslate
- fail-closed：配置缺失 / Feed 异常时跳过并记录，不阻塞其他 source
- 不做自动发布，只进 review queue

## 非目标（明确排除）

- 音频下载与转写（whisper 等）——后续独立 issue
- 播客内容摘要 / 观点提取——审核通过后的下游环节
- 自动发布任何内容

## 验收标准

- [ ] 新增 podcast source config schema + 单测
- [ ] RssIngestAdapter 通过 fixture 测试（含畸形 XML、超大 Feed、重定向、内网地址拒绝、四级排重各 case）
- [ ] ingest runner 集成，live 开关走 env allowlist（同 `ALEABIT_LIVE_CREATORS` 模式）
- [ ] review UI 可按 source type 筛选
- [ ] 全量测试通过，无 X 写路径回归
