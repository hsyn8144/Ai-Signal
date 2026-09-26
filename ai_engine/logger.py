"""
Futures AI Structured Logger & Error Code System
Adheres strictly to MASTER_PROMPT_TR requirements:
- Structured error codes (UI-1001, DATA-2001, NETWORK-3001, etc.)
- Strict categories: SYSTEM, UI, DATA, DOWNLOAD, SYNC, BINANCE, WEBSOCKET,
  DATABASE, PARQUET, FEATURE, INDICATOR, LABEL, TRAINING, VALIDATION,
  BACKTEST, MODEL, MODEL_REGISTRY, SIGNAL, RISK, API, ANDROID, NETWORK,
  PERFORMANCE, SECURITY, ERROR, CRITICAL.
- Severity levels: DEBUG, INFO, WARN, ERROR, CRITICAL.
- Bounded memory to prevent memory leaks.
- JSON, TXT, and CSV export.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import json
import csv
import io
from collections import deque
import threading

CATEGORIES = [
    "SYSTEM", "UI", "DATA", "DOWNLOAD", "SYNC", "BINANCE", "WEBSOCKET",
    "DATABASE", "PARQUET", "FEATURE", "INDICATOR", "LABEL", "TRAINING",
    "VALIDATION", "BACKTEST", "MODEL", "MODEL_REGISTRY", "SIGNAL", "RISK",
    "API", "ANDROID", "NETWORK", "PERFORMANCE", "SECURITY", "ERROR", "CRITICAL"
]

SEVERITIES = ["DEBUG", "INFO", "WARN", "ERROR", "CRITICAL"]

class StructuredLogger:
    def __init__(self, max_entries: int = 1500):
        self.max_entries = max_entries
        self._entries: deque = deque(maxlen=max_entries)
        self._lock = threading.Lock()
        self.log(
            category="SYSTEM",
            severity="INFO",
            message="Futures AI Structured Logger initialized",
            context={"maxEntries": max_entries}
        )

    def log(
        self,
        category: str,
        severity: str,
        message: str,
        code: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        stack_trace: Optional[str] = None,
        recovery: Optional[str] = None
    ) -> Dict[str, Any]:
        entry = {
            "id": f"LOG-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "category": category.upper() if category.upper() in CATEGORIES else "SYSTEM",
            "severity": severity.upper() if severity.upper() in SEVERITIES else "INFO",
            "code": code,
            "message": message,
            "context": context or {},
            "stackTrace": stack_trace,
            "recovery": recovery
        }

        with self._lock:
            self._entries.append(entry)

        # Console mirror for debugging
        code_str = f" [{code}]" if code else ""
        print(f"[{entry['timestamp']}] [{entry['severity']}] [{entry['category']}]{code_str} {message}")
        return entry

    def get_logs(
        self,
        category: Optional[str] = None,
        severity: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 200
    ) -> List[Dict[str, Any]]:
        with self._lock:
            logs = list(self._entries)

        filtered = []
        for log in reversed(logs):
            if category and category != "ALL" and log["category"] != category:
                continue
            if severity and severity != "ALL" and log["severity"] != severity:
                continue
            if search:
                q = search.lower()
                msg = log["message"].lower()
                cat = log["category"].lower()
                cd = (log["code"] or "").lower()
                ctx_str = json.dumps(log["context"]).lower()
                if q not in msg and q not in cat and q not in cd and q not in ctx_str:
                    continue
            filtered.append(log)
            if len(filtered) >= limit:
                break
        return filtered

    def export(self, fmt: str = "json") -> str:
        with self._lock:
            logs = list(self._entries)

        if fmt.lower() == "json":
            return json.dumps(logs, indent=2, ensure_ascii=False)
        elif fmt.lower() == "txt":
            lines = []
            for item in logs:
                code_str = f" [{item['code']}]" if item.get('code') else ""
                lines.append(f"[{item['timestamp']}] [{item['severity']}] [{item['category']}]{code_str} {item['message']}")
                if item.get("context"):
                    lines.append(f"  Context: {json.dumps(item['context'], ensure_ascii=False)}")
                if item.get("stackTrace"):
                    lines.append(f"  Trace: {item['stackTrace']}")
            return "\n".join(lines)
        elif fmt.lower() == "csv":
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(["id", "timestamp", "category", "severity", "code", "message", "context"])
            for item in logs:
                writer.writerow([
                    item["id"],
                    item["timestamp"],
                    item["category"],
                    item["severity"],
                    item.get("code", ""),
                    item["message"],
                    json.dumps(item.get("context", {}), ensure_ascii=False)
                ])
            return output.getvalue()
        return json.dumps(logs)

# Global singleton logger instance
logger = StructuredLogger()
