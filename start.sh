#!/bin/bash
# 一键启动所有服务

cd "$(dirname "$0")"

echo "🚀 启动 AI 商业分析报告系统..."

# 启动 FastAPI 后端
echo "📡 启动后端 API (端口 8000)..."
cd apps/report-agent
python3 server.py &
BACKEND_PID=$!
cd ../..

# 等后端启动
sleep 2

# 启动 Streamlit UI
echo "🎨 启动 Streamlit UI (端口 8501)..."
cd apps/report-agent
python3 -m streamlit run app.py --server.port 8501 --server.headless true &
UI_PID=$!
cd ../..

echo ""
echo "✅ 所有服务已启动！"
echo "   📡 后端 API: http://localhost:8000"
echo "   🎨 Streamlit UI: http://localhost:8501"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 捕获 Ctrl+C
trap "echo '🛑 停止所有服务...'; kill $BACKEND_PID $UI_PID 2>/dev/null; exit 0" INT

# 等待
wait
