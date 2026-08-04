"""
Tests for Kimi K3 integration.

Verifies:
1. KIMI_MODEL alias normalization (k3 → kimi-k3)
2. KIMI_REASONING_EFFORT default
3. report_mode routing for earnings/serenity endpoints
"""

import os
import importlib
import pytest


# ── Helpers ──────────────────────────────────────────────────────────────────

def _reload_server_with_env(**env_overrides):
    """Reload server.py module with specific env vars set."""
    import sys
    # Save original env
    saved = {}
    for k, v in env_overrides.items():
        saved[k] = os.environ.get(k)
        os.environ[k] = v

    # Remove cached module to force re-import
    mod_name = "server"
    if mod_name in sys.modules:
        del sys.modules[mod_name]

    try:
        import server
        importlib.reload(server)
        return server
    finally:
        # Restore original env
        for k, v in saved.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v


# ── KIMI_MODEL alias normalization ───────────────────────────────────────────

class TestKimiModelNormalization:
    """KIMI_MODEL env var normalization: legacy 'k3' → canonical 'kimi-k3'."""

    def test_default_is_kimi_k3(self):
        """When KIMI_MODEL is unset, default should be kimi-k3."""
        os.environ.pop("KIMI_MODEL", None)
        srv = _reload_server_with_env()
        assert srv.KIMI_MODEL == "kimi-k3"

    def test_env_k3_normalizes_to_kimi_k3(self):
        """Legacy 'k3' env value should normalize to 'kimi-k3'."""
        srv = _reload_server_with_env(KIMI_MODEL="k3")
        assert srv.KIMI_MODEL == "kimi-k3"

    def test_env_kimi_k3_stays_kimi_k3(self):
        """Canonical 'kimi-k3' env value should stay as-is."""
        srv = _reload_server_with_env(KIMI_MODEL="kimi-k3")
        assert srv.KIMI_MODEL == "kimi-k3"

    def test_env_other_model_passes_through(self):
        """Non-K3 model values should pass through unchanged."""
        srv = _reload_server_with_env(KIMI_MODEL="kimi-k2.7-code")
        assert srv.KIMI_MODEL == "kimi-k2.7-code"

    def test_env_k3_with_whitespace(self):
        """'k3' with whitespace should still normalize."""
        srv = _reload_server_with_env(KIMI_MODEL="  k3  ")
        assert srv.KIMI_MODEL == "kimi-k3"


# ── KIMI_REASONING_EFFORT ────────────────────────────────────────────────────

class TestKimiReasoningEffort:
    """KIMI_REASONING_EFFORT defaults and overrides."""

    def test_default_is_high(self):
        """Default reasoning_effort should be 'high' (not 'max')."""
        os.environ.pop("KIMI_REASONING_EFFORT", None)
        srv = _reload_server_with_env()
        assert srv.KIMI_REASONING_EFFORT == "high"

    def test_env_override_max(self):
        """Env can override to 'max' for deep-dive mode."""
        srv = _reload_server_with_env(KIMI_REASONING_EFFORT="max")
        assert srv.KIMI_REASONING_EFFORT == "max"

    def test_env_override_low(self):
        """Env can override to 'low' for cost-sensitive mode."""
        srv = _reload_server_with_env(KIMI_REASONING_EFFORT="low")
        assert srv.KIMI_REASONING_EFFORT == "low"


# ── report_mode routing ──────────────────────────────────────────────────────

class TestReportModeRouting:
    """Verify get_llm_config routes kimi_llm and kimi_k3 correctly."""

    def test_kimi_llm_uses_normalized_model(self, monkeypatch):
        """kimi_llm mode should use KIMI_MODEL (normalized)."""
        monkeypatch.setenv("KIMI_MODEL", "k3")
        monkeypatch.setenv("KIMI_API_KEY", "***")
        srv = _reload_server_with_env(KIMI_MODEL="k3", KIMI_API_KEY="***")

        from server import ReportRequest
        req = ReportRequest(target="NVDA", report_mode="kimi_llm")
        api_key, base_url, model, mode = srv.get_llm_config(req)
        assert model == "kimi-k3"
        assert base_url == "https://api.moonshot.ai/v1"
        assert mode == "kimi_llm"

    def test_kimi_k3_forces_model(self, monkeypatch):
        """kimi_k3 mode should force 'kimi-k3' regardless of env."""
        monkeypatch.setenv("KIMI_MODEL", "kimi-k2.7-code")
        monkeypatch.setenv("KIMI_API_KEY", "***")
        srv = _reload_server_with_env(KIMI_MODEL="kimi-k2.7-code", KIMI_API_KEY="***")

        from server import ReportRequest
        req = ReportRequest(target="NVDA", report_mode="kimi_k3")
        api_key, base_url, model, mode = srv.get_llm_config(req)
        assert model == "kimi-k3"
        assert mode == "kimi_k3"

    def test_jina_llm_uses_deepseek(self, monkeypatch):
        """jina_llm mode should use DeepSeek, not Kimi."""
        monkeypatch.setenv("LLM_API_KEY", "***")
        srv = _reload_server_with_env(LLM_API_KEY="***")

        from server import ReportRequest
        req = ReportRequest(target="NVDA", report_mode="jina_llm")
        api_key, base_url, model, mode = srv.get_llm_config(req)
        assert base_url == "https://api.deepseek.com/v1"
        assert model == "deepseek-chat"

    def test_kimi_mode_requires_api_key(self, monkeypatch):
        """kimi_llm without API key should raise 400."""
        monkeypatch.delenv("KIMI_API_KEY", raising=False)
        srv = _reload_server_with_env(KIMI_API_KEY="")

        from server import ReportRequest
        req = ReportRequest(target="NVDA", report_mode="kimi_llm")
        with pytest.raises(Exception) as exc_info:
            srv.get_llm_config(req)
        assert "400" in str(exc_info.value.status_code) or "Kimi API key" in str(exc_info.value.detail)


# ── Earnings request model ───────────────────────────────────────────────────

class TestEarningsRequestModel:
    """Verify EarningsRequest and PostEarningsMoveRequest accept report_mode."""

    def test_earnings_request_has_report_mode(self):
        from server import EarningsRequest
        req = EarningsRequest(ticker="NVDA", report_mode="kimi_llm")
        assert req.report_mode == "kimi_llm"

    def test_earnings_request_report_mode_optional(self):
        from server import EarningsRequest
        req = EarningsRequest(ticker="NVDA")
        assert req.report_mode is None

    def test_post_earnings_move_has_report_mode(self):
        from server import PostEarningsMoveRequest
        req = PostEarningsMoveRequest(ticker="NVDA", report_mode="kimi_k3")
        assert req.report_mode == "kimi_k3"

    def test_serenity_request_has_report_mode(self):
        from server import SerenityRequest
        req = SerenityRequest(ticker="NVDA", report_mode="kimi_llm")
        assert req.report_mode == "kimi_llm"
