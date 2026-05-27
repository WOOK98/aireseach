import base64
import re
from datetime import datetime
from pathlib import Path

import requests
import streamlit as st


st.set_page_config(
    page_title="Agent 商业研究中心",
    layout="wide",
    page_icon="📊",
    initial_sidebar_state="expanded",
)

ASSET_DIR = Path(__file__).parent / "assets"
HERO_IMAGE = ASSET_DIR / "research-dashboard-bg.png"


def image_data_uri(path: Path) -> str:
    if not path.exists():
        return ""
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


HERO_BG = image_data_uri(HERO_IMAGE)

if "report_history" not in st.session_state:
    st.session_state.report_history = []

st.markdown(
    f"""
    <style>
    :root {{
        --paper: #fff8ef;
        --paper-2: #fbf1e4;
        --ink: #33281f;
        --muted: #8f806f;
        --hairline: #e4d5bb;
        --gold: #c5a35f;
        --gold-soft: rgba(197, 163, 95, .16);
        --jade: #55775f;
    }}
    .stApp {{
        background:
            linear-gradient(180deg, rgba(255,248,239,.92), rgba(246,239,228,.98)),
            #f6efe4;
        color: var(--ink);
    }}
    [data-testid="stHeader"] {{
        background: rgba(255, 248, 239, .72);
        backdrop-filter: blur(16px);
        border-bottom: 1px solid rgba(228, 213, 187, .8);
    }}
    [data-testid="stSidebar"] {{
        background: #f1e7d7;
        border-right: 1px solid var(--hairline);
    }}
    [data-testid="stSidebar"] * {{
        letter-spacing: 0;
    }}
    .block-container {{
        max-width: 1320px;
        padding-top: 2rem;
        padding-bottom: 4rem;
    }}
    .od-hero {{
        min-height: 286px;
        padding: 30px 32px;
        border: 1px solid var(--hairline);
        border-radius: 8px;
        background-image:
            linear-gradient(90deg, rgba(255,248,239,.96) 0%, rgba(255,248,239,.88) 42%, rgba(255,248,239,.38) 100%),
            url("{HERO_BG}");
        background-size: cover;
        background-position: center;
        box-shadow: 0 18px 48px rgba(61, 47, 34, .10);
        margin-bottom: 22px;
    }}
    .od-topbar {{
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 18px;
        padding: 13px 16px;
        border: 1px solid var(--hairline);
        border-radius: 8px;
        background: rgba(255,250,243,.84);
        margin-bottom: 16px;
        box-shadow: 0 8px 24px rgba(61, 47, 34, .06);
    }}
    .od-brand {{
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 800;
        color: var(--ink);
    }}
    .od-logo {{
        width: 34px;
        height: 34px;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: white;
        background: linear-gradient(135deg, #c5a35f, #55775f);
        box-shadow: 0 8px 18px rgba(91, 70, 41, .18);
        font-size: 13px;
    }}
    .od-nav {{
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }}
    .od-nav span {{
        border: 1px solid transparent;
        border-radius: 8px;
        padding: 8px 10px;
        color: #7f705f;
        font-size: 13px;
    }}
    .od-nav span:first-child {{
        border-color: rgba(197,163,95,.32);
        background: var(--gold-soft);
        color: #8a6b2d;
        font-weight: 700;
    }}
    .od-kicker {{
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: var(--jade);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: .08em;
        text-transform: uppercase;
        margin-bottom: 18px;
    }}
    .od-kicker::before {{
        content: "";
        width: 7px;
        height: 18px;
        border-radius: 2px;
        background: var(--gold);
    }}
    .od-hero h1 {{
        max-width: 680px;
        color: var(--ink);
        font-size: 46px;
        line-height: 1.05;
        letter-spacing: 0;
        margin: 0 0 14px;
    }}
    .od-hero p {{
        max-width: 660px;
        color: var(--muted);
        font-size: 16px;
        line-height: 1.7;
        margin: 0;
    }}
    .od-hero-strip {{
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 24px;
    }}
    .od-chip {{
        border: 1px solid rgba(197,163,95,.34);
        background: rgba(255,250,243,.72);
        color: #6f5d49;
        border-radius: 999px;
        padding: 7px 11px;
        font-size: 12px;
    }}
    .od-panel {{
        border: 1px solid var(--hairline);
        background: rgba(255,250,243,.84);
        border-radius: 8px;
        padding: 18px;
        box-shadow: 0 10px 28px rgba(61, 47, 34, .07);
    }}
    .od-mini-grid {{
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin: 14px 0 0;
    }}
    .od-mini-card {{
        border: 1px solid #e4d5bb;
        border-radius: 8px;
        padding: 12px;
        background: rgba(255,250,243,.72);
        min-height: 82px;
    }}
    .od-mini-card b {{
        color: var(--ink);
        font-size: 18px;
    }}
    .od-mini-card span {{
        display: block;
        color: var(--muted);
        font-size: 12px;
        margin-top: 5px;
        line-height: 1.45;
    }}
    .od-pipeline {{
        display: grid;
        gap: 10px;
        margin-top: 8px;
    }}
    .od-step {{
        display: grid;
        grid-template-columns: 26px 1fr;
        gap: 10px;
        align-items: start;
        padding: 10px;
        border: 1px solid #e7d9c0;
        border-radius: 8px;
        background: rgba(255, 248, 239, .78);
    }}
    .od-step-num {{
        width: 24px;
        height: 24px;
        border-radius: 999px;
        background: #55775f;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 800;
    }}
    .od-step-title {{
        color: var(--ink);
        font-weight: 760;
        font-size: 13px;
        line-height: 1.35;
    }}
    .od-step-desc {{
        color: var(--muted);
        font-size: 12px;
        line-height: 1.5;
        margin-top: 3px;
    }}
    .od-report-frame {{
        border: 1px solid var(--hairline);
        border-radius: 8px;
        background: rgba(255,253,249,.88);
        padding: 16px 18px;
        box-shadow: 0 10px 28px rgba(61,47,34,.06);
    }}
    .od-history-item {{
        border-bottom: 1px solid #eadcc7;
        padding: 10px 0;
    }}
    .od-history-item:last-child {{
        border-bottom: none;
    }}
    .od-history-title {{
        color: var(--ink);
        font-weight: 760;
        font-size: 13px;
    }}
    .od-history-meta {{
        color: var(--muted);
        font-size: 11px;
        margin-top: 3px;
    }}
    .od-section-title {{
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--ink);
        font-weight: 760;
        margin: 2px 0 14px;
    }}
    .od-section-title::before {{
        content: "";
        width: 4px;
        height: 18px;
        border-radius: 2px;
        background: var(--gold);
    }}
    div[data-testid="stForm"] {{
        border: 1px solid var(--hairline);
        background: rgba(255,250,243,.92);
        border-radius: 8px;
        padding: 18px;
        box-shadow: 0 10px 28px rgba(61,47,34,.07);
    }}
    .stTextInput input, .stSelectbox div[data-baseweb="select"] > div {{
        border-radius: 8px !important;
    }}
    .stButton button, .stDownloadButton button, .stFormSubmitButton button {{
        border-radius: 8px !important;
        border: 1px solid rgba(197,163,95,.35) !important;
        background: #c5a35f !important;
        color: white !important;
        font-weight: 700 !important;
    }}
    .stButton button:hover, .stDownloadButton button:hover, .stFormSubmitButton button:hover {{
        border-color: #a9853d !important;
        background: #ad8b46 !important;
    }}
    div[data-testid="stExpander"] {{
        border: 1px solid var(--hairline);
        border-radius: 8px;
        background: rgba(255,250,243,.72);
    }}
    h1, h2, h3, h4 {{
        letter-spacing: 0 !important;
    }}
    @media (max-width: 900px) {{
        .od-hero h1 {{
            font-size: 34px;
        }}
        .od-topbar {{
            align-items: flex-start;
            flex-direction: column;
        }}
        .od-mini-grid {{
            grid-template-columns: 1fr;
        }}
    }}
    </style>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    """
    <nav class="od-topbar">
        <div class="od-brand"><span class="od-logo">AI</span><span>Business Intelligence Agent</span></div>
        <div class="od-nav">
            <span>研究工作台</span>
            <span>报告库</span>
            <span>来源审计</span>
            <span>系统设置</span>
        </div>
    </nav>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    """
    <section class="od-hero">
        <div class="od-kicker">Agent Research Workbench</div>
        <h1>智能商业分析报告系统</h1>
        <p>先搭建指标骨架，再生成市场份额、竞争格局、抗脆弱性和投资建议。左侧做投研仪表盘，右侧保留 AI 深度解读，让长报告变得可审计、可追踪、可快速阅读。</p>
        <div class="od-hero-strip">
            <span class="od-chip">Market Share</span>
            <span class="od-chip">Competitive Forces</span>
            <span class="od-chip">Antifragility</span>
            <span class="od-chip">Evidence-first Report</span>
        </div>
        <div class="od-mini-grid">
            <div class="od-mini-card"><b>01</b><span>先形成指标骨架，避免长报告只剩文字判断。</span></div>
            <div class="od-mini-card"><b>02</b><span>报告正文与证据清单并排，便于核验来源。</span></div>
            <div class="od-mini-card"><b>03</b><span>按任务流沉淀结果，后续可升级为账户、数据库和报告库。</span></div>
        </div>
    </section>
    """,
    unsafe_allow_html=True,
)

st.sidebar.header("模型配置")
mode_label = st.sidebar.selectbox(
    "生成模式",
    ["Jina 免费搜索 + 便宜 LLM", "Perplexity 深度研究"],
)
report_mode = "jina_llm" if mode_label.startswith("Jina") else "deep_research"

default_base_url = (
    "https://api.deepseek.com/v1"
    if report_mode == "jina_llm"
    else "https://api.perplexity.ai"
)
default_model = "deepseek-chat" if report_mode == "jina_llm" else "sonar-deep-research"

api_key_input = st.sidebar.text_input(
    "API Key（可选，留空则使用后端环境变量）",
    type="password",
    placeholder="sk-...",
)
jina_api_key_input = st.sidebar.text_input(
    "Jina API Key（可选）",
    type="password",
    help="Jina 搜索接口返回 401 时填写；留空则后端会降级继续生成报告。",
)
base_url_input = st.sidebar.text_input("API Base URL", value=default_base_url)
model_input = st.sidebar.text_input("模型名称", value=default_model)

st.markdown('<div class="od-section-title">研究参数</div>', unsafe_allow_html=True)
with st.form("report_form"):
    target_input = st.text_input(
        "分析目标（公司或行业）",
        placeholder="例如: 瑞幸咖啡 / Tesla 2026 / 北美储能电池市场",
    )
    col_years, col_lens = st.columns([1, 2])
    with col_years:
        analysis_years = st.slider("分析回看年限", min_value=1, max_value=10, value=5)
    with col_lens:
        analysis_lens = st.selectbox(
            "优先分析视角",
            ["综合", "估值与财务质量", "市场份额与竞争格局", "现金流与资产质量", "抗脆弱性与风险", "增长与商业模式"],
        )
    generate_btn = st.form_submit_button("启动 Agent 深度调研", type="primary")

with st.expander("输出结构", expanded=False):
    st.markdown(
        """
        - 核心指标仪表盘：先列关键数据、置信度和待核验项
        - 证据清单：来源、日期、链接、支撑结论
        - 阅读路线：先看机会、风险和关键判断
        - 四大正文：市场格局、竞争分析、抗脆弱性、投资建议
        """
    )

with st.expander("从 core_starter-main 借鉴的产品结构", expanded=False):
    st.markdown(
        """
        - `apps/web` 的主应用思路：把生成入口、结果展示、系统配置拆成稳定区域。
        - `packages/api` 的分层思路：前端只关心任务参数，后端封装模型、搜索和错误处理。
        - `packages/shared` 的通用能力思路：把指标、来源、报告状态做成可复用的数据结构。
        - `packages/auth/db/storage` 的扩展方向：后续支持登录、保存报告、导出 PDF、团队共享。
        """
    )

STREAM_API_URL = "http://127.0.0.1:8000/api/generate_report_stream"


def parse_error(response: requests.Response) -> str:
    try:
        detail = response.json().get("detail", response.text)
    except ValueError:
        detail = response.text
    return f"后端服务异常：{detail}"


def stream_report(payload: dict):
    with requests.post(
        STREAM_API_URL,
        json=payload,
        timeout=300,
        stream=True,
    ) as response:
        if response.status_code != 200:
            raise RuntimeError(parse_error(response))

        for chunk in response.iter_content(chunk_size=None, decode_unicode=True):
            if chunk:
                yield chunk


def default_metrics(target: str, years: int, lens: str):
    return [
        {"label": "分析标的", "value": target, "sub": f"近 {years} 年 | {lens}"},
        {"label": "市场份额", "value": "待核验", "sub": "需引用权威来源"},
        {"label": "增长质量", "value": "待核验", "sub": "收入/利润/用户"},
        {"label": "竞争强度", "value": "待核验", "sub": "直接竞品与替代品"},
        {"label": "现金流/资产", "value": "待核验", "sub": "经营现金流与负债"},
        {"label": "抗脆弱性", "value": "待判断", "sub": "冲击中是否受益"},
    ]


def extract_metric_cards(markdown: str, fallback_cards: list[dict]):
    cards = [card.copy() for card in fallback_cards]
    patterns = {
        "市场份额": r"(市场份额|份额)[^|\n]*\|[^|\n]*?([0-9]+(?:\.[0-9]+)?%)",
        "增长质量": r"(收入|利润|营收|增长)[^|\n]*\|[^|\n]*?([+-]?[0-9]+(?:\.[0-9]+)?%)",
        "竞争强度": r"(竞争强度|竞争格局|竞争)[^|\n]*\|[^|\n]*?([^|\n]{2,20})",
        "现金流/资产": r"(现金流|资产质量|负债)[^|\n]*\|[^|\n]*?([^|\n]{2,20})",
        "抗脆弱性": r"(抗脆弱性|抗脆弱)[^|\n]*\|[^|\n]*?([^|\n]{2,20})",
    }
    for card in cards:
        pattern = patterns.get(card["label"])
        if not pattern:
            continue
        match = re.search(pattern, markdown)
        if match:
            card["value"] = match.group(2).strip()
            card["sub"] = "来自报告自动抽取"
    return cards


def render_metric_card(card: dict):
    st.markdown(
        f"""
        <div style="
            border:1px solid #e4d5bb;
            border-radius:8px;
            padding:15px 14px 13px;
            background:linear-gradient(180deg, #fffaf3 0%, #fff6ea 100%);
            box-shadow:0 8px 22px rgba(61,47,34,.06);
            min-height:104px;
        ">
            <div style="font-size:12px;color:#8d7b68;margin-bottom:8px;">{card["label"]}</div>
            <div style="font-size:24px;font-weight:700;color:#3d2f22;line-height:1.1;">{card["value"]}</div>
            <div style="font-size:11px;color:#a89880;margin-top:8px;">{card["sub"]}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_dashboard(cards: list[dict], search_status: str = "等待生成"):
    st.markdown('<div class="od-panel">', unsafe_allow_html=True)
    st.markdown('<div class="od-section-title">指标仪表盘</div>', unsafe_allow_html=True)
    first, second = st.columns(2)
    for index, card in enumerate(cards):
        with first if index % 2 == 0 else second:
            render_metric_card(card)
            st.write("")
    st.caption(f"资料状态：{search_status}")
    st.markdown("</div>", unsafe_allow_html=True)


def render_pipeline(report_mode_label: str, years: int, lens: str):
    st.markdown('<div class="od-panel">', unsafe_allow_html=True)
    st.markdown('<div class="od-section-title">Research Pipeline</div>', unsafe_allow_html=True)
    steps = [
        ("参数入队", f"{report_mode_label} | 近 {years} 年 | {lens}"),
        ("资料检索", "搜索市场份额、财报、行业报告和新闻线索"),
        ("指标抽取", "优先抽取份额、增长、现金流、估值和竞争强度"),
        ("观点生成", "输出四段式商业报告与投资建议"),
    ]
    step_html = "".join(
        (
            f'<div class="od-step">'
            f'<div class="od-step-num">{index}</div>'
            f"<div>"
            f'<div class="od-step-title">{title}</div>'
            f'<div class="od-step-desc">{desc}</div>'
            f"</div>"
            f"</div>"
        )
        for index, (title, desc) in enumerate(steps, start=1)
    )
    st.markdown(f'<div class="od-pipeline">{step_html}</div>', unsafe_allow_html=True)
    st.markdown("</div>", unsafe_allow_html=True)


def render_workflow(years: int, lens: str):
    st.markdown('<div class="od-panel">', unsafe_allow_html=True)
    st.markdown('<div class="od-section-title">阅读路线</div>', unsafe_allow_html=True)
    st.markdown(
        f"""
        1. 先看近 `{years}` 年关键指标是否有真实来源。
        2. 再看 `{lens}` 是否支持投资结论。
        3. 最后检查黑天鹅/灰犀牛风险是否改变仓位建议。
        """
    )
    st.markdown("</div>", unsafe_allow_html=True)


def save_report(target: str, lens: str, report_markdown: str):
    st.session_state.report_history.insert(
        0,
        {
            "target": target,
            "lens": lens,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "chars": len(report_markdown),
            "markdown": report_markdown,
        },
    )
    st.session_state.report_history = st.session_state.report_history[:6]


def render_report_history():
    st.markdown('<div class="od-panel">', unsafe_allow_html=True)
    st.markdown('<div class="od-section-title">报告库</div>', unsafe_allow_html=True)
    if not st.session_state.report_history:
        st.caption("还没有生成报告。生成后会在本次会话中保留最近 6 份，方便对比和下载。")
    else:
        for item in st.session_state.report_history:
            st.markdown(
                f"""
                <div class="od-history-item">
                    <div class="od-history-title">{item["target"]}</div>
                    <div class="od-history-meta">{item["created_at"]} | {item["lens"]} | {item["chars"]:,} 字符</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
    st.markdown("</div>", unsafe_allow_html=True)


def render_quality_panel(mode_label: str):
    st.markdown('<div class="od-panel">', unsafe_allow_html=True)
    st.markdown('<div class="od-section-title">来源审计</div>', unsafe_allow_html=True)
    st.markdown(
        f"""
        - 当前模式：`{mode_label}`
        - 最新数据：2026 口径优先，缺来源时标注待核验
        - 关键约束：市场份额、投资评级和风险必须能回溯到证据
        - 体验优化：流式输出，长报告生成时右侧实时显示
        """
    )
    st.markdown("</div>", unsafe_allow_html=True)


if generate_btn:
    if not target_input.strip():
        st.warning("⚠️ 请先在左侧输入分析目标！")
    else:
        spinner_text = (
            f"🕵️‍♂️ Agent 正在检索关于 '{target_input}' 的最新数据并进行抗脆弱性建模，"
            "这通常需要 1-2 分钟，请稍候..."
        )
        with st.spinner(spinner_text):
            try:
                st.markdown("---")
                target = target_input.strip()
                payload = {
                    "target": target,
                    "analysis_years": analysis_years,
                    "analysis_lens": analysis_lens,
                    "report_mode": report_mode,
                    "api_key": api_key_input.strip() or None,
                    "base_url": base_url_input.strip() or None,
                    "model": model_input.strip() or None,
                    "jina_api_key": jina_api_key_input.strip() or None,
                }
                chunks = []
                dashboard_col, report_col = st.columns([0.9, 1.7], gap="large")
                base_cards = default_metrics(target, analysis_years, analysis_lens)

                def capture_stream():
                    for chunk in stream_report(payload):
                        chunks.append(chunk)
                        yield chunk

                with dashboard_col:
                    render_dashboard(base_cards)
                    render_pipeline(mode_label, analysis_years, analysis_lens)
                    render_workflow(analysis_years, analysis_lens)
                    render_quality_panel(mode_label)
                    render_report_history()
                    with st.expander("证据与来源", expanded=True):
                        st.caption("报告生成后，请优先查看右侧“证据清单”。仪表盘中的数值会尽量从报告表格自动抽取。")

                with report_col:
                    st.markdown('<div class="od-section-title">AI 解读</div>', unsafe_allow_html=True)
                    st.markdown('<div class="od-report-frame">', unsafe_allow_html=True)
                    st.write_stream(capture_stream)
                    st.markdown("</div>", unsafe_allow_html=True)

                report_markdown = "".join(chunks)
                save_report(target, analysis_lens, report_markdown)
                updated_cards = extract_metric_cards(report_markdown, base_cards)
                if updated_cards != base_cards:
                    with dashboard_col:
                        st.markdown("---")
                        render_dashboard(updated_cards, "已从报告中抽取部分指标")

                st.success("✅ 报告生成成功！")
                st.download_button(
                    label="📥 下载 Markdown 报告",
                    data=report_markdown,
                    file_name=f"{target}_AI商业分析报告.md",
                    mime="text/markdown",
                )
            except RuntimeError as exc:
                st.error(f"❌ {exc}")
            except requests.exceptions.RequestException as exc:
                st.error(f"❌ 无法连接到后端服务器: {exc}")
else:
    preview_left, preview_right = st.columns([0.9, 1.7], gap="large")
    with preview_left:
        render_dashboard(default_metrics("等待输入标的", 5, "综合"))
        render_pipeline(mode_label, 5, "综合")
        render_quality_panel(mode_label)
        render_report_history()
    with preview_right:
        st.info(
            "💡 请在左侧侧边栏输入你想研究的企业或细分行业名称"
            "（例如：'Tesla 2026' 或 '北美储能电池市场'），然后点击启动。"
        )
        st.markdown('<div class="od-report-frame">', unsafe_allow_html=True)
        st.markdown(
            """
            ### AI 解读预览

            报告生成后会直接显示在这里，并与左侧指标仪表盘保持并排。建议优先检查三件事：

            1. 市场份额是否有明确来源与日期。
            2. 竞争分析是否区分直接竞品、潜在进入者和替代品。
            3. 抗脆弱性是否证明“从冲击中获益”，而不是只证明“抗压”。
            """
        )
        st.markdown("</div>", unsafe_allow_html=True)
