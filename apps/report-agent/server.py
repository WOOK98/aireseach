import os
import urllib.parse
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from openai import OpenAI
from pydantic import BaseModel, Field
import requests


app = FastAPI(title="AI Agent 商业报告生成器")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ALLOW_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

REPORT_MODE = os.getenv("REPORT_MODE", "deep_research")

DEEP_RESEARCH_API_KEY = os.getenv("PERPLEXITY_API_KEY") or os.getenv("OPENAI_API_KEY")
DEEP_RESEARCH_BASE_URL = os.getenv("AGENT_BASE_URL", "https://api.perplexity.ai")
DEEP_RESEARCH_MODEL = os.getenv("AGENT_MODEL", "sonar-deep-research")

LLM_API_KEY = os.getenv("LLM_API_KEY") or os.getenv("DEEPSEEK_API_KEY")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.deepseek.com/v1")
LLM_MODEL = os.getenv("LLM_MODEL", "deepseek-chat")

JINA_API_KEY = os.getenv("JINA_API_KEY", "")
JINA_SEARCH_BASE_URL = os.getenv("JINA_SEARCH_BASE_URL", "https://s.jina.ai/")
SEARCH_TIMEOUT_SECONDS = int(os.getenv("SEARCH_TIMEOUT_SECONDS", "20"))
SEARCH_CONTEXT_CHARS = int(os.getenv("SEARCH_CONTEXT_CHARS", "12000"))


class ReportRequest(BaseModel):
    target: str = Field(..., min_length=1, description="企业或行业分析目标")
    analysis_years: int = Field(5, ge=1, le=10, description="分析回看年限")
    analysis_lens: str = Field("综合", description="分析视角")
    report_mode: Optional[str] = Field(None, description="deep_research 或 jina_llm")
    api_key: Optional[str] = Field(None, description="本次请求使用的 API Key")
    base_url: Optional[str] = Field(None, description="OpenAI-compatible API 地址")
    model: Optional[str] = Field(None, description="模型名称")
    jina_api_key: Optional[str] = Field(None, description="可选的 Jina AI API Key")


SYSTEM_PROMPT = """
你是一个资深的商业分析师（Business Intelligence Agent），精通企业架构、金融投资、市场竞争策略以及塔勒布的“抗脆弱性（Antifragility）”理论。

请针对用户指定的目标，通过检索最新（2026年）的真实市场数据、财报、新闻和行业白皮书，生成一份具备高商业价值的 Markdown 分析报告。

借鉴专业投研工具的产品逻辑：先搭建“数据骨架”，再做观点推演。报告开头必须先给出：
- 核心指标仪表盘：用表格列出市场份额、收入/利润增长、估值或融资指标、现金流/资产质量、竞争强度、数据置信度；没有可靠数据时写“待核验”，不要编造。
- 证据清单：列出 5-8 条最关键来源、日期、链接、对应结论。
- 阅读路线：用 3-5 条 bullet 告诉读者应该先看哪些风险/机会。

随后报告必须严格包含以下四个板块：

1. 市场份额与行业格局 (Market Share & Landscape)
- 提供该企业在所属行业/细分领域的最新市场份额百分比，必须引用可考证的最新数据或权威第三方调研机构预测。
- 梳理行业前三至前五的核心玩家，对比其优劣势，以表格形式呈现。

2. 竞争分析 (Competitive Analysis - Porter's Five Forces Extended)
- 深入分析直接竞品、潜在进入者和替代品的威胁。
- 提炼该企业的核心壁垒（护城河），如技术壁垒、网络效应、供应链优势或高转换成本。

3. 抗脆弱性评估 (Antifragility Assessment)
- 严禁将“抗脆弱”等同于“抗压/强韧”。强韧（Robust）是指在冲击中保持不变；抗脆弱（Antifragile）是指能从不确定性、波动性和外部冲击中获益并变得更强。
- 评估企业在面对宏观经济下行、供应链断裂、技术突变、法律合规风险时的表现。
- 寻找其商业模式中的“杠铃策略（Barbell Strategy）”：是否在核心业务上极度保守（确保生存），同时在边际业务上进行高风险、高回报的非对称性创新尝试？

4. 投资建议与潜在风险 (Investment Advice & Risks)
- 给出明确的投资评级，如：强烈推荐买入 / 观望持有 / 风险警示。
- 基于上述分析，列出 3 个企业未来 12-24 个月内可能面临的黑天鹅事件（Black Swan Risks）或核心灰犀牛风险。
- 提供具体的资金配置或战略切入建议。

写作风格：专业、理性、批判性。多用数据说话，避免宽泛赞美。请保留关键引用来源、日期和链接。
"""


def validate_target(target: str) -> str:
    cleaned_target = target.strip()
    if not cleaned_target:
        raise HTTPException(status_code=400, detail="请输入分析目标")
    return cleaned_target


def clean_optional_text(value: Optional[str]) -> str:
    return value.strip() if value else ""


def validate_header_value(value: str, label: str) -> str:
    if not value:
        return value
    try:
        value.encode("ascii")
    except UnicodeEncodeError as exc:
        raise HTTPException(
            status_code=400,
            detail=(
                f"{label} 含有非 ASCII 字符，请只粘贴真实 Key，"
                "不要包含中文、emoji、引号或说明文字。"
            ),
        ) from exc
    return value


def get_llm_config(request: ReportRequest):
    report_mode = request.report_mode or REPORT_MODE
    request_api_key = validate_header_value(clean_optional_text(request.api_key), "API Key")
    request_base_url = clean_optional_text(request.base_url)
    request_model = clean_optional_text(request.model)

    if report_mode == "jina_llm":
        api_key = validate_header_value(request_api_key or LLM_API_KEY, "API Key")
        if not api_key:
            raise HTTPException(
                status_code=500,
                detail="请先设置 LLM_API_KEY 或 DEEPSEEK_API_KEY 环境变量",
            )
        return api_key, request_base_url or LLM_BASE_URL, request_model or LLM_MODEL, report_mode

    api_key = validate_header_value(request_api_key or DEEP_RESEARCH_API_KEY, "API Key")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="请先设置 PERPLEXITY_API_KEY 或 OPENAI_API_KEY 环境变量",
        )
    return (
        api_key,
        request_base_url or DEEP_RESEARCH_BASE_URL,
        request_model or DEEP_RESEARCH_MODEL,
        report_mode,
    )


def fetch_search_context(target: str, analysis_years: int, analysis_lens: str, jina_api_key: str = ""):
    query = (
        f"{target} 市场份额 竞争分析 财报 行业报告 2026 "
        f"近{analysis_years}年 {analysis_lens}"
    )
    encoded_query = urllib.parse.quote(query)
    jina_url = f"{JINA_SEARCH_BASE_URL}{encoded_query}"
    headers = {}
    if jina_api_key:
        headers["Authorization"] = f"Bearer {jina_api_key}"

    try:
        response = requests.get(
            jina_url,
            headers=headers,
            timeout=SEARCH_TIMEOUT_SECONDS,
        )
        if response.status_code == 401:
            return (
                "",
                "Jina 搜索接口返回 401 未授权。可以在左侧填写 Jina API Key，"
                "或切换到 Perplexity 深度研究模式。",
            )
        if response.status_code >= 400:
            return "", f"Jina 搜索接口返回 HTTP {response.status_code}：{response.text[:300]}"
        return response.text[:SEARCH_CONTEXT_CHARS], ""
    except requests.exceptions.RequestException as exc:
        return "", f"Jina 搜索请求失败：{exc}"


def build_messages(
    target: str,
    analysis_years: int,
    analysis_lens: str,
    search_context: str = "",
    search_warning: str = "",
):
    report_brief = (
        f"分析目标：{target}\n"
        f"分析回看年限：近 {analysis_years} 年\n"
        f"优先分析视角：{analysis_lens}\n\n"
        "请像专业投研产品一样组织输出：先给结构化指标和证据，再给解释和判断。"
    )

    if search_context:
        user_content = (
            f"{report_brief}\n\n"
            "以下是 Jina AI 实时搜索接口返回的公开资料片段。请优先基于这些资料做分析，"
            "并在报告中保留可核验来源、日期和链接；如果资料不足，请明确标注为推断或待核验。\n\n"
            f"{search_context}\n\n"
            f"请针对目标【{target}】生成深度商业报告。"
        )
    elif search_warning:
        user_content = (
            f"{report_brief}\n\n"
            f"实时搜索资料获取失败，原因：{search_warning}\n\n"
            "请在不虚构最新市场数据的前提下，基于你已有知识生成一份框架完整的商业分析报告；"
            "涉及 2026 最新数据、市场份额、新闻或财报时，必须明确标注“待实时检索核验”。\n\n"
            f"请针对目标【{target}】生成深度商业报告。"
        )
    else:
        user_content = f"{report_brief}\n\n请针对以下目标生成深度分析报告：{target}"

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]


def build_report_request(request: ReportRequest):
    target = validate_target(request.target)
    analysis_years = max(1, min(10, request.analysis_years))
    analysis_lens = request.analysis_lens.strip() if request.analysis_lens else "综合"
    api_key, base_url, model, report_mode = get_llm_config(request)
    search_context = ""
    search_warning = ""
    if report_mode == "jina_llm":
        request_jina_key = validate_header_value(
            clean_optional_text(request.jina_api_key),
            "Jina API Key",
        )
        search_context, search_warning = fetch_search_context(
            target,
            analysis_years,
            analysis_lens,
            validate_header_value(request_jina_key or JINA_API_KEY, "Jina API Key"),
        )
    return (
        api_key,
        base_url,
        model,
        build_messages(target, analysis_years, analysis_lens, search_context, search_warning),
        search_warning,
    )


@app.post("/api/generate_report")
async def generate_report(request: ReportRequest):
    validate_target(request.target)

    try:
        api_key, base_url, model, messages, search_warning = build_report_request(request)
        client = OpenAI(api_key=api_key, base_url=base_url)
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            stream=False,
        )
        report_content = response.choices[0].message.content
        if search_warning:
            report_content = f"> 搜索提示：{search_warning}\n\n{report_content}"
        return {"status": "success", "data": report_content}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/generate_report_stream")
async def generate_report_stream(request: ReportRequest):
    validate_target(request.target)
    try:
        api_key, base_url, model, messages, search_warning = build_report_request(request)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    def stream_report():
        try:
            if search_warning:
                yield f"> 搜索提示：{search_warning}\n\n"
            client = OpenAI(api_key=api_key, base_url=base_url)
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True,
            )
            for chunk in response:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta
        except Exception as exc:
            yield f"\n\n生成报告时发生错误：{exc}"

    return StreamingResponse(stream_report(), media_type="text/markdown; charset=utf-8")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
