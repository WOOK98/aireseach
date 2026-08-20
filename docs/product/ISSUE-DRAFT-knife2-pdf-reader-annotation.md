# Issue 草稿：Research PDF Reader + 画笔标注（#152 刀2）

> 状态：草稿，待 Wook 确认后提交到 GitHub
> 建议标题：`[P1] Research PDF Reader + 画笔标注 — 上传/阅读/批注财报 PDF，标注一键转 evidence`
> 建议标签：`directive` `P1` `agent:openclaw`（web 层可拆 agent:codex 并行）
> 前置依赖：**#154（Research Notes MVP）merge 后开工**

## 目标

用户上传本地财报/研报 PDF，在站内阅读并用画笔/高亮/文字批注；标注结构化落库，**一键转为研报 evidence 引用**（自动带文件名/页码/报告期来源），接入 #117 evidence linkage 体系。

这是 #152「金融 Notion」的第二刀，把 evidence inbox 从「creator 内容」扩展到「用户自己的一手材料」。

## 为什么依赖 #154

刀1 的 `research_notes` 表已确立本产品的文档基元语义（见 `packages/db/src/schema/research-notes.ts`）：

- `artifact` 不可变（as_of 快照），仅 title/summary/note/tags 可编辑
- user-scoped，无默认公开
- `evidenceIds` + `asOf` 原样保留，旧研究可复现

PDF 与标注必须复用同一套语义，不起第二套 evidence schema（#152 红线）。

## 范围（分两切，本 issue 只做切 1）

### 切 1：上传 + 阅读 + 标注落库

1. **Schema**（新增两表，复用 user-scoped 约定）：
   - `research_pdfs`：`id / userId / fileName / blobKey / fileSizeBytes / pageCount / ticker? / reportPeriod? / sourceLabel? / createdAt`
   - `pdf_annotations`：`id / pdfId(fk cascade) / userId / page / kind(highlight|pen|text) / payload jsonb / createdAt / updatedAt`
   - `payload` 结构：highlight=选中区域坐标组；pen=路径点数组；text=坐标+文本。坐标相对页面尺寸归一化（0-1），前端缩放自适应
2. **上传**：Vercel Blob，user-scoped 私有路径；单文件上限（建议 50MB）；MIME 白名单 `application/pdf`
3. **阅读器**：react-pdf（PDF.js）渲染，分页/缩放；文本层与动态数据全部 `notranslate`
4. **标注层**：canvas overlay 与 PDF 页面对齐；画笔/高亮/文字三种工具；标注增删改，删除可恢复（软删或 undo 栈）
5. **入口**：research notes 工作台新增「PDF」区；PDF 详情页 = 阅读器 + 标注

### 切 2（后续独立 issue，本 issue 不含）

- 标注一键转 evidence 引用：生成 `{ source: fileName, page, reportPeriod, excerpt }`，写入 #117 evidence linkage
- PDF 文本提取 → 可检索元数据
- 标注在研报编辑器内的嵌入展示

## 红线（继承 #152 + 新增）

- PDF 提取文本、页码、动态坐标渲染全部 `notranslate`（Chrome 自动翻译教训）
- 上传文件 user-scoped 隔离；Blob URL 签名过期，不生成公开直链
- 标注 `payload` 只增不篡改语义：编辑=新版本的 payload + updatedAt；不静默改写历史
- 不做自动发布；本刀无任何外发路径
- react-pdf worker 走独立 chunk，不阻塞首屏；超大 PDF（>200 页）流式分页渲染

## 技术选型备忘

- **react-pdf / PDF.js**：成熟、文本层可选中（highlight 依赖文本层坐标）；风险是 bundle 体积，用 dynamic import
- **Vercel Blob**：私有 store + signed URL；成本按 GB 计，需在上传处做大小限制与总量配额（billing 表可复用？）
- **标注渲染**：SVG overlay 优于 canvas 位图——坐标即数据，选中/删除单个标注容易，DPR 缩放无锯齿

## 验收标准

- [ ] 两表 migration + zod schema + 单测（user 隔离、级联删除）
- [ ] 上传 API：MIME/大小白名单、user-scoped blob key、fail-closed
- [ ] 阅读器页：PDF 渲染、缩放、分页、notranslate
- [ ] 标注 API + UI：三种 kind 的增删改查，坐标归一化 round-trip 测试
- [ ] 无痕窗口新账号验证：A 用户看不到 B 用户的 PDF 与标注
- [ ] 全量测试通过；oxlint/oxfmt 0 issue
