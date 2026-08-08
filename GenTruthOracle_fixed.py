# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
import genlayer as gl
from genlayer import *


class GenTruthOracle(gl.Contract):
    requests_str: str

    def __init__(self):
        self.requests_str = "{}"

    @gl.public.write
    def request_truth(self, request_id: str, statement: str, source_urls_json: str) -> None:
        request_id = request_id.strip()
        requests = json.loads(self.requests_str)

        if request_id in requests:
            raise gl.vm.UserError("Request ID already exists")

        # source_urls_json = '["https://...", "https://..."]'
        try:
            source_urls = json.loads(source_urls_json)
            if not isinstance(source_urls, list):
                source_urls = []
        except Exception:
            source_urls = []

        requests[request_id] = {
            "statement": statement,
            "sources": source_urls,
            "status": "PENDING",
            "requester": str(gl.message.sender_address)
        }

        self.requests_str = json.dumps(requests)

    @gl.public.view
    def get_truth(self, request_id: str) -> str:
        request_id = request_id.strip()
        requests = json.loads(self.requests_str)
        req = requests.get(request_id)
        if not req:
            return "NOT_FOUND"
        return json.dumps(req)

    @gl.public.write
    def resolve_truth(self, request_id: str) -> None:
        request_id = request_id.strip()
        requests = json.loads(self.requests_str)

        if request_id not in requests:
            raise gl.vm.UserError("Request ID does not exist")

        req = requests[request_id]
        if req["status"] != "PENDING":
            raise gl.vm.UserError("Request is already resolved")

        statement = req["statement"]
        sources = req["sources"]

        # Callable that returns INPUT/CONTEXT for the AI
        def build_input() -> str:
            web_data = ""
            for url in sources[:3]:
                try:
                    content = gl.nondet.web.render(url, mode="text")[:1500]
                    web_data += "\n--- Source: " + url + " ---\n" + content + "\n"
                except Exception:
                    web_data += "\n--- Source: " + url + " ---\nFailed to load.\n"

            return (
                "STATEMENT TO VERIFY: " + statement + "\n\n"
                "WEB EVIDENCE:\n" + (web_data if web_data else "No evidence provided.")
            )

        task_prompt = (
            "You are GenTruth, a highly objective fact-checking AI Oracle. "
            "Verify the STATEMENT based ONLY on the provided WEB EVIDENCE.\n\n"
            "RULES:\n"
            "1. If evidence clearly proves the statement is true, verdict = TRUE.\n"
            "2. If evidence clearly proves the statement is false, verdict = FALSE.\n"
            "3. Otherwise, verdict = UNVERIFIABLE.\n\n"
            "Return ONLY a raw JSON object with one key:\n"
            '{"verdict": "TRUE" or "FALSE" or "UNVERIFIABLE"}\n'
            "No markdown, no backticks, only valid JSON."
        )

        validation_criteria = (
            "The output MUST be a valid JSON object. "
            "It MUST contain a 'verdict' key which is exactly one of 'TRUE', 'FALSE', or 'UNVERIFIABLE'. "
            "No other text outside the JSON is allowed."
        )

        raw_result = gl.eq_principle.prompt_non_comparative(
            build_input,
            task=task_prompt,
            criteria=validation_criteria
        )

        result_str = str(raw_result)

        try:
            first = result_str.find("{")
            last = result_str.rfind("}")
            if first != -1 and last != -1:
                body = result_str[first:last + 1]
                body = body.replace(",}", "}").replace(",\n}", "\n}")
                parsed = json.loads(body)
            else:
                parsed = {"verdict": "ERROR"}
        except Exception:
            parsed = {"verdict": "ERROR"}

        verdict = str(parsed.get("verdict", "ERROR")).upper()
        if verdict not in ["TRUE", "FALSE", "UNVERIFIABLE"]:
            verdict = "ERROR"

        req["status"] = verdict
        self.requests_str = json.dumps(requests)
