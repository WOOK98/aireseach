# 用户画像："Kevin，38 岁，湾区/洛杉矶工程师型散户"

> 来源：2026-07 由 Wook 定稿入库（原文产出于产品规划对话，2026-07-18 前）。
> 本画像是产品决策的锚：session rail、morning-brief、entity lock、L1 断言落地、
> 插件+MCP 战略、跨市场路线图均由其驱动。修改需 Wook 确认。

## 基本盘

- 身在美国（PST 时区），主账户 Schwab/IBKR + Robinhood，用 IBKR 或富途 moomoo 交易港股，通过 ETF（KWEB、FXI、ASHR）间接参与 A 股，用 EWY 或 IBKR 直接买韩股（如 HBM 主题下的 SK 海力士）
- 中英双语，信息源横跨两个语言圈
- ETF 做核心仓（VOO/QQQ），个股做卫星仓，用 /MES 或 /NQ 微型期货和期权对冲，关注 13F 学对冲基金持仓
- 每天投入 1–2 小时研究；痛点：**时间不够、信息太散、跨市场时差**

## 一天的工作流（按时区）

**5:30–6:30 AM PST（美股盘前）**：手机上刷。券商盘前异动 → X/FinTwit 快讯号 → 让 ChatGPT/Claude 总结隔夜要闻；财报季直接把 8-K 丢给 AI 提炼 guidance 变化。

**6:30–9:00 AM PST（盘中）**：TradingView 图表+警报；Finviz 热力图扫板块；Unusual Whales 看期权异动。执行为主。

**中午–下午（亚洲闭市时段）**：深度研究。SEC EDGAR / 10-K → AI 长文档问答；FinChat/Fiscal.ai 拉财务数据；Seeking Alpha 看多空对立；WhaleWisdom 看 13F 调仓。

**5:30–8:00 PM PST（= 北京时间早 9:30，A股/港股开盘）**：切中文信息圈。雪球、富途牛牛社区、财联社电报、格隆汇/智通财经；韩股靠 Naver Finance 机翻或英文源。最依赖 AI 翻译+压缩："把这篇雪球长文的核心逻辑三句话讲清楚，并指出作者的利益立场"。

**周末**：组合复盘。持仓 CSV 丢给 AI 算相关性/集中度/回撤归因；播客 YouTube 用 AI 转录总结；跑 watchlist 深度筛选。

## 信息源矩阵

| 市场 | 行情/数据 | 观点/社区 | 一手材料 |
|---|---|---|---|
| 美股 | TradingView, Finviz, Koyfin | X/FinTwit, Reddit, Seeking Alpha | SEC EDGAR, 财报会 |
| A股 | 东方财富/同花顺, 富途 | 雪球, 韭圈儿, 公众号 | 巨潮资讯 |
| 港股 | 富途/IBKR, AAStocks | 格隆汇, 雪球港股区 | 披露易 HKEX |
| 韩股 | Naver Finance, IBKR | Reddit, 英文财经媒体 | DART（靠AI翻译） |
| 宏观/期货 | CME FedWatch, 财经日历 | 宏观播客 | Fed/BLS 原始数据 |
| 对冲基金 | WhaleWisdom, Dataroma | 13F 追踪贴 | SEC 13F/13D 原文 |

## AI 工具栈（三层）

**第一层·通用 LLM（每天用）**：ChatGPT（搜索+Deep Research 初筛）、Claude（长文档 10-K/财报会、跨语言总结）、Gemini（视频总结）、Perplexity Finance（带行情快问快答）。典型行为：**"共识策略"**——同一问题同时问 GPT 和 Claude，两个都示警才算高置信度。

**第二层·垂直工具（订阅 1–2 个）**：券商内嵌 AI（Robinhood Cortex / 富途牛牛AI）；评分筛选类（Danelfin、Zen Ratings、Kavout）当第二意见；FinChat 自然语言查财务。

**第三层·工程师玩法（快速增长）**：Claude Code 抓 10-K/财报会到本地做分析，MCP 接实时数据；Python + yfinance/AKShare + AI 生成回测；订阅 MCP 化研究服务直接在 Claude 里调用。

**信任边界**：对 AI 分析保持谨慎——只"部分信任"并交叉验证（2026 年 3 月 Investing.com 调研 938 名美国散户：62% 已用 AI 辅助投资，54% 用 AI 聊天机器人做研究但仅部分信任）。最怕幻觉数据：编造的财务数字、错误的 ticker 匹配。

## 未来 12–18 个月工具栈演变预测

1. **问答 → 代理**：定时任务 + MCP（"每早 6 点给我持仓简报"）
2. **MCP 成为分发渠道**：谁的数据以 MCP 工具形式出现在 Claude/ChatGPT 里，谁赢得注意力
3. **跨语言/跨市场是空白区**：美国工具不覆盖 A/港/韩，中国工具不深覆盖美股——一套 prompt 同时跑 NVDA/腾讯/SK海力士供应链关联是刚需
4. **可验证性成为付费理由**：被幻觉坑过，愿为"每个数字带出处"付费
5. **多模型路由**：已形成"Claude 算数/长文档、GPT 搜索、Gemini 视频"的分工心智

## 画像 → 决策映射（入库时已在产的对应关系）

| 画像要素 | 已落地的产品决策 |
|---|---|
| 四个时段的日程 | session rail（market-sessions.ts）、morning-brief 技能 |
| 信任边界/怕幻觉 | ENTITY LOCK（L0）、L1 断言落地校验、判断-结果账本（L3） |
| 预测 2（MCP 分发） | 插件 + 托管 MCP 战略 |
| 预测 3（跨市场空白） | 六 lens 跨市场覆盖（美/港实测已过） |
| 预测 4（可验证性付费） | 免费 web 降级 + API key 数据层付费 |
| 预测 5 + 共识策略 | "Claude Code first, Codex-compatible" 双生态打包 |
