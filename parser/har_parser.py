import json

def parse_har_file(har_json_str):
    har_data = json.loads(har_json_str)
    entries = har_data.get("log", {}).get("entries", [])
    api_calls = []

    for entry in entries:
        request = entry.get("request", {})
        response = entry.get("response", {})
        url = request.get("url", "")
        method = request.get("method", "")
        status = response.get("status", 0)
        content_type = ""
        for header in response.get("headers", []):
            if header.get("name", "").lower() == "content-type":
                content_type = header.get("value", "")
                break

        # Attempt to parse response content if JSON
        text = ""
        try:
            content = entry.get("response", {}).get("content", {}).get("text", "")
            if content and "application/json" in content_type:
                json_content = json.loads(content)
                # Summarize top-level keys and sample values (as strings)
                summary = {}
                for k, v in json_content.items():
                    val_str = str(v)
                    if len(val_str) > 100:
                        val_str = val_str[:100] + "..."
                    summary[k] = val_str
                text = summary
        except Exception:
            text = {}

        api_calls.append({
            "url": url,
            "method": method,
            "status": status,
            "content_type": content_type,
            "response_summary": text,
        })
    return api_calls
