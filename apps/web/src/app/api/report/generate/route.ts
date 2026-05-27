import { NextResponse } from "next/server";

const REPORT_AGENT_URL =
  process.env.REPORT_AGENT_URL || "http://localhost:8000";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await fetch(
      `${REPORT_AGENT_URL}/api/generate_report_stream`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return NextResponse.json(
        { detail: errorData?.detail || `后端服务异常: ${response.status}` },
        { status: response.status },
      );
    }

    // 流式转发
    return new NextResponse(response.body, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json(
      { detail: "无法连接到报告生成服务，请确认 report-agent 已启动" },
      { status: 502 },
    );
  }
}
