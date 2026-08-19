# 用户研究素材 #001：财经内容创作者的播客选题工作流

> 来源：微信公众号「傅里叶的猫」《我的财经选题工作流：播客篇（方案可一键部署）》，2026-08-10 发布于上海
> 作者 GitHub：https://github.com/wanguolin
> 收录日期：2026-08-19 ｜ 收录人：报告（Wook 转发的文章）

## 为什么收录

作者是我们问卷中「财经内容创作者」角色的活体样本：日更财经博主 + 有工程能力 + 愿意公开完整工作流。这篇文章等于一次免费的深度用户访谈——他把痛点、决策逻辑、工具选择理由全写出来了。

## 作者的工作流（事实摘要）

- **监控规模**：26 条记录 / 25 个唯一 RSS，英文 15 + 中文 11，覆盖美股投资、宏观经济金融、大科技与 AI 三个方向
- **架构**：Notion 管清单（控制面板）→ Cloudflare Worker 每天零点定时读取 → Queue 逐 Feed 处理（限流 ≤1 req/s）→ D1 记账排重 → 结果写回 Notion
- **工程细节**：流式解析 XML（32 MiB 上限）、重定向逐次检查、拒绝内网地址和 IP 直连、GUID → 原始链接 → 媒体链接 → 标题+日期 四级排重、只保留 26 小时内内容、只读演练 + 白名单写入开关
- **转写**：本地 mlx-community/whisper-large-v3-turbo-asr-fp16（Mac mini M4 64G），长音频分段 + 文案校准，输出 Markdown
- **开源**：https://github.com/wanguolin/cf-worker-notion-podcast-monitor（已过 codex security review）、https://github.com/wanguolin/podcast-whisper-mlx

## 关键引用（用户原声）

> "凡是需要和人交互的地方，我习惯先用 Notion 或飞书做中介。传统网页适合已经稳定的产品，早期工作流往往还在变化。"

> "它（程序）不应该替我宣布某个话题一定值得做。选题仍然需要判断来源是否可靠，材料是否够用。"

> "同一个话题如果在不同节目里反复出现，我会把它放进备选，再去看它有没有新的事实、明确的分歧，或者足够具体的人物与故事。"

> "规则和数据放在同一个地方，人能看懂，程序也能读取。"

## 对 airesearch 的含义

### 验证 #152（evidence-to-output workbench）方向
真实用户已经在用 Notion + Worker 胶水自拼 evidence inbox。市场存在，现有工具没满足。他的「监控库 = 可调清单」「单集库 = evidence 池」「人工判断选题 = judgment 层」与 #152 的 Research Notes / Evidence Inbox 分层完全同构。

### 验证产品哲学一致性
「自动化停在收集和整理，判断留给人」与 TQS / 失效条件 / L3 账本核验的红线一致：工具强化判断，不替代判断。这类用户天然认同「reports end with invalidation conditions」的卖点。

### 揭示 podcast/RSS 是下一个 ingest 数据源
#131/#134 Creator Research Pipeline 目前只接 X read-only ingest。播客 RSS 与之架构同构（creator 内容 → 结构化入队 → 人工审核 → 发展成选题），且：
- RSS 无 X API 的合规风险和调用成本
- 长访谈含「判断如何形成」的过程信息，evidence 密度高于短帖子
- 作者已趟过工程坑（排重、流式解析、安全护栏），方案开源可参考

### 设计合伙人候选人
作者符合理想深度用户画像：目标角色、有工程能力、愿意公开工作流、日更频率高（反馈快）。可通过 GitHub 联系邀请填问卷 + 20 分钟访谈（激励：1 个月会员）。

## 待办追踪

- [ ] 联系作者（Wook 决策）
- [ ] Podcast/RSS ingest source issue → 见 `ISSUE-DRAFT-podcast-rss-ingest-source.md`
