# Aireseach Landing Page Overhaul Checklist

> 基于代码审查 + 竞品调研（Perplexity / AlphaSense / Similarweb / Tavily），整理 airesearchs.com 从"模板站"升级为专业 AI Business Research SaaS 的改动清单。

---

## 一、当前问题诊断

### 🔴 模板痕迹（必须改）

| #   | 页面    | 问题                                                                                                                                                 | 类型        |
| --- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | 首页    | **Testimonials 区块** — 假评论（Jack/Jill/John/Sarah/Mike），"We launched our MVP in two weeks" 完全是 SaaS starter 模板文案                         | ✅ 已删除   |
| 2   | 首页    | **Features 区块** — 含 Google Play / App Store / Chrome Web Store / Firefox / Edge 按钮，Aireseach 没有移动端和浏览器插件                            | ✅ 已删除   |
| 3   | 首页    | **FAQ 区块** — 7 个通用问题，答案还是 TurboStarter 模板："clear docs, TypeScript-first patterns"、"Every module is designed for quick customization" | 🔧 文案     |
| 4   | 首页    | **Hero preview** — 指标卡显示 "Needs verification"、"High variance" 等 placeholder 文字                                                              | 🔧 文案     |
| 5   | 首页    | **CTA 按钮** — "Generate a report" 跳转到 /report（需要登录），缺乏引导                                                                              | 🔧 UI       |
| 6   | /report | **中文标题** — "AI 商业分析报告系统"、"先搭建指标骨架…" 对英文站不一致                                                                               | 🔧 文案     |
| 7   | 首页    | **i18n key 残留** — features.feature.mobile / features.feature.extension 引用不存在的功能                                                            | 🔧 代码清理 |
| 8   | 首页    | **announcement** — "Bring your own model key. Aireseach provides search." 太技术化，不像产品卖点                                                     | 🔧 文案     |
| 9   | 全局    | **Blog tags** — learning/skills/progress/prototype 等标签与 AI research 无关                                                                         | 🔧 文案     |

### 🟡 竞品差距（应该改）

| #   | 竞品观察                                                    | Aireseach 现状                                           | 建议                          |
| --- | ----------------------------------------------------------- | -------------------------------------------------------- | ----------------------------- |
| 1   | Perplexity: 极简搜索框 + "Ask anything"                     | Hero 区块信息密度过高                                    | 简化 Hero，突出搜索/输入框    |
| 2   | AlphaSense: 明确目标用户 "analysts, investors, researchers" | 无明确用户画像                                           | Hero 副标题锁定用户群         |
| 3   | Tavily: API-first，按 credit 计费透明                       | 定价页 "Configure pricing based on your use-case" 是模板 | 重新设计定价方案              |
| 4   | Similarweb: 清晰的功能对比表                                | 无功能对比                                               | 添加功能对比表                |
| 5   | 所有竞品都有 **social proof**（客户 logo / 数字）           | Testimonials 已删，无替代                                | 添加 "Built for" 用户类型标签 |

---

## 二、改动清单

### A. 文案改动（i18n JSON）

**文件：** `packages/i18n/src/translations/en/marketing.json`

#### A1. Hero 文案重写

```json
{
  "product": {
    "title": "Business research reports, powered by AI",
    "description": "Turn any company, market, or industry into a structured analysis — with live sources, your own model key, and exportable reports in minutes.",
    "preview": {
      "badge": "Live research",
      "title": "Search-grounded report workflow",
      "provider": "Model provider",
      "sources": "Verified sources",
      "report": "Generated report",
      "reportTitle": "Tesla market landscape and competitive analysis"
    }
  },
  "announcement": "No lock-in. Bring your own API key."
}
```

#### A2. FAQ 重写（针对 AI research SaaS）

```json
{
  "faq": {
    "label": "FAQ",
    "title": "Frequently asked questions",
    "description": "Everything you need to know about Aireseach.",
    "cta": "Contact us",
    "question": {
      "whatDoesOurPlatformDo": {
        "question": "What is Aireseach?",
        "answer": "Aireseach generates structured business research reports from live web sources. It uses Jina search to gather public data and your preferred LLM to produce market, competitor, risk, and investment analyses."
      },
      "howWillThisBenefitMyBusiness": {
        "question": "Who is Aireseach for?",
        "answer": "Founders validating markets, analysts doing due diligence, consultants preparing client deliverables, and investors sizing opportunities. Anyone who needs credible business analysis without starting from scratch."
      },
      "isMyDataSafe": {
        "question": "Is my API key safe?",
        "answer": "Yes. Your model API key is used only for the current request and is never stored on our servers. Search is handled by Aireseach; inference goes directly to your chosen provider."
      },
      "whatKindOfIntegrationsAreAvailable": {
        "question": "Which model providers are supported?",
        "answer": "OpenAI, DeepSeek, OpenRouter, Perplexity (deep research), and any OpenAI-compatible endpoint. You can also use Aireseach's hosted search with your own model."
      },
      "howEasyIsItToOnboardMyTeam": {
        "question": "How do I get started?",
        "answer": "Enter a research target, paste your API key, and hit Generate. No signup required for your first report. Create an account to save history and access premium features."
      },
      "whatTypesOfBusinessesCanUseThis": {
        "question": "What kind of reports can I generate?",
        "answer": "Market share analysis, competitive landscape, financial quality, antifragility assessment, growth model review, and comprehensive multi-lens reports. Each includes sourced evidence and structured metrics."
      },
      "canICustomizeThisToFitMyBusinessNeeds": {
        "question": "Can I export and share reports?",
        "answer": "Yes. Every report can be downloaded as Markdown for use in memos, pitch decks, client notes, or internal strategy documents."
      }
    }
  }
}
```

#### A3. 定价文案重写

```json
{
  "pricing": {
    "label": "Pricing",
    "title": "Simple, transparent pricing",
    "description": "Start free. Upgrade when you need more reports and premium features."
  },
  "plan": {
    "free": {
      "name": "Free",
      "description": "Explore Aireseach with limited reports"
    },
    "pro": {
      "name": "Pro",
      "description": "Unlimited reports for individual researchers",
      "badge": "Most popular"
    },
    "business": {
      "name": "Business",
      "description": "Team collaboration and advanced analytics"
    }
  }
}
```

#### A4. /report 页面英文化

**文件：** `apps/web/src/app/[locale]/(marketing)/report/page.tsx`

```tsx
export const generateMetadata = getMetadata({
  title: "AI Business Research Report",
  description: "Generate search-grounded business analysis reports with AI",
});

export default function ReportPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">
          AI Business Research Report
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Generate structured market, competitor, and investment analysis from
          live sources.
        </p>
      </div>
      <ReportGenerator />
    </div>
  );
}
```

#### A5. Banner CTA 文案

```json
{
  "cta": {
    "question": "Ready to research smarter?",
    "button": "Generate your first report",
    "pricing": "View pricing"
  }
}
```

#### A6. Blog tags 更新

```json
{
  "blog": {
    "tag": {
      "market-research": "market research",
      "competitive-analysis": "competitive analysis",
      "due-diligence": "due diligence",
      "investment": "investment",
      "ai-tools": "AI tools",
      "product-updates": "product updates",
      "guides": "guides"
    }
  }
}
```

---

### B. UI 改动

| #   | 改动                                                                               | 涉及文件                                              | 说明                                                               |
| --- | ---------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------ |
| B1  | **Hero 区简化** — 去掉复杂的 preview mock，改为简洁的搜索框样式（参考 Perplexity） | `hero.tsx` + `marketing.json`                         | 保留 badge + title + description + CTA，preview 改为静态截图或简化 |
| B2  | **添加 "Who uses Aireseach" 区块** — 替代 Testimonials，展示用户类型标签           | 新建 `use-cases.tsx` 或复用 Section 组件              | "For founders · For analysts · For consultants · For investors"    |
| B3  | **定价区块重做** — 从 Free/Premium/Enterprise 改为 Free/Pro/Business               | `billing/shared/src/config/index.ts` + `billing.json` | 见下方定价方案                                                     |
| B4  | **添加功能对比表** — 在定价区块下方                                                | 新建 `comparison.tsx`                                 | Free vs Pro vs Business 功能对比                                   |
| B5  | **导航栏清理** — 去掉 extension/mobile 相关入口                                    | `header/navigation/navigation.tsx`                    | 只保留 Product / Pricing / Blog / Dashboard                        |
| B6  | **/report 页面英文化**                                                             | `report/page.tsx`                                     | 标题和描述改为英文                                                 |
| B7  | **Hero preview 指标卡** — "Needs verification" 改为真实示例数据                    | `hero.tsx` + `marketing.json`                         | 如 "34.2%" / "Strong" / "Moderate" / "High"                        |

---

### C. 功能改动（定价方案重新设计）

#### 当前结构 → 目标结构

| 当前                 | 目标         | 价格             |
| -------------------- | ------------ | ---------------- |
| Free ($0)            | **Free**     | $0/月            |
| Premium ($19/mo)     | **Pro**      | $19/月 ($190/年) |
| Enterprise (Contact) | **Business** | $49/月 ($490/年) |

#### Free — $0/月

- 3 reports per month
- Jina search + your own model key
- 1 analysis lens (Comprehensive)
- Markdown download
- No signup required for first report

#### Pro — $19/月 ($190/年)

- **Unlimited** reports
- All 6 analysis lenses
- Perplexity Deep Research mode
- Report history & saved reports
- Priority search (faster Jina results)
- Custom model endpoints
- Email support

#### Business — $49/月 ($490/年)

- Everything in Pro
- Team workspace (up to 5 seats)
- Shared report library
- API access (generate reports programmatically)
- Custom report templates
- Branded PDF export
- Priority support

#### 实现路径

1. **修改 `BillingPlan` enum** — `packages/billing/shared/src/types.ts`
   - `FREE` → `FREE`（不变）
   - `PREMIUM` → `PRO`
   - `ENTERPRISE` → `BUSINESS`

2. **修改 billing config** — `packages/billing/shared/src/config/index.ts`
   - 更新 plan names、features、variants
   - Pro: $19/mo flat, $190/year flat
   - Business: $49/mo flat, $490/year flat

3. **修改 features config** — `packages/billing/shared/src/config/features.ts`
   - 按 Free/Pro/Business 重新定义 feature 列表

4. **修改 i18n** — `packages/i18n/src/translations/en/billing.json`
   - 更新 plan names 和 descriptions

---

### D. 代码清理

| #   | 改动                                                                                                                            | 涉及文件                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| D1  | 删除 `features.tsx` 中的 GooglePlayButton / AppStoreButton / ChromeWebStoreButton / FirefoxAddOnsButton / EdgeAddOnsButton 组件 | `features.tsx`（已从 page.tsx 移除引用，但文件仍存在） |
| D2  | 删除 `testimonials.tsx`（已从 page.tsx 移除引用）                                                                               | `testimonials.tsx`                                     |
| D3  | 清理 i18n 中 `features.feature.mobile.*` 和 `features.feature.extension.*`                                                      | `marketing.json`                                       |
| D4  | 清理 `product.mobile.*` 和 `product.extension.*`                                                                                | `marketing.json`                                       |

---

## 三、执行优先级

### P0（立即做）

- [x] ~~删除 Features 和 Testimonials 区块~~ ✅ 已完成
- [ ] A1: Hero 文案重写
- [ ] A4: /report 页面英文化
- [ ] D1-D4: 代码清理

### P1（本周）

- [ ] A2: FAQ 重写
- [ ] A3: 定价文案重写
- [ ] A5: Banner CTA 文案
- [ ] B1: Hero 区简化
- [ ] B5: 导航栏清理
- [ ] B7: Hero preview 指标卡

### P2（下周）

- [ ] B2: 添加 "Who uses Aireseach" 区块
- [ ] B3: 定价区块重做（Free/Pro/Business）
- [ ] B4: 功能对比表
- [ ] C: 定价方案后端实现
- [ ] A6: Blog tags 更新

---

## 四、竞品参考文案

### Perplexity

- Hero: "Where knowledge begins"
- Sub: "Ask anything. Get trusted, sourced answers."
- CTA: Search bar input

### AlphaSense

- Hero: "The leading AI-powered market intelligence and search platform"
- Sub: "Transform how you research with AI that understands business language"
- CTA: "Request a demo"

### Tavily

- Hero: "Real-time search for AI agents"
- Sub: "The search engine built for AI. Fast, accurate, and ready for production."
- CTA: "Get started for free"

### Similarweb

- Hero: "Analyze any website or app"
- Sub: "Get insights on traffic, engagement, and competitive benchmarks"
- CTA: "Try for free"

### Aireseach 建议定位

- Hero: **"Business research reports, powered by AI"**
- Sub: **"Turn any company, market, or industry into a structured analysis — with live sources, your own model key, and exportable reports in minutes."**
- CTA: **"Generate your first report"** → /report

---

_Generated 2026-05-28 by 报告_
