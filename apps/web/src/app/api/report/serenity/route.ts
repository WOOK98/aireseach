import { NextResponse } from "next/server";

const REPORT_AGENT_URL =
  process.env.REPORT_AGENT_URL || "http://localhost:8000";

const getErrorDetail = (data: unknown) => {
  if (typeof data === "object" && data !== null && "detail" in data) {
    const detail = (data as { detail?: unknown }).detail;
    if (typeof detail === "string") {
      return detail;
    }
  }
  return null;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await fetch(`${REPORT_AGENT_URL}/api/analyze_serenity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return NextResponse.json(
        {
          detail:
            getErrorDetail(errorData) ||
            `Serenity analysis error: ${response.status}`,
        },
        { status: response.status },
      );
    }

    return new NextResponse(response.body, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Serenity analysis error:", error);
    return NextResponse.json(
      {
        detail:
          "Unable to connect to the report agent. Check that the report-agent service is running.",
      },
      { status: 502 },
    );
  }
}
