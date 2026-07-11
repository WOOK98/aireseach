---
name: Directive
about: 循环执行指令(仅 WOOK98 创建的生效)
labels: directive
---
## 目标
<一句话 + 对应指标>

## 路由
<!--
可选 label:
- agent:codex    → Codex 领取
- agent:openclaw → OpenClaw 领取
- 无 agent label → 任意执行者先到先得
-->
<agent:codex / agent:openclaw / 无>

## 任务清单
- [ ] ...

## 红线提醒
<本任务特别适用的红线条目, 无则写"全局红线">

## 验收标准
- [ ] ...

## blocked-by
<#N 或 无>

## 领取协议
<!--
执行者领取前必须确认:
1. 含 directive, 且不含 in-progress / stuck / blocked
2. 无 assignee, 且评论区无未撤销的 "Claimed" 评论
3. agent 路由允许本执行者

领取评论首行:
Claimed by <codex|openclaw> · branch: <agent>/YYYY-MM-DD-<slug>
-->
