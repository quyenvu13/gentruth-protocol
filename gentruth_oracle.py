# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
from genlayer import *

class GenTruthOracle(gl.Contract):
    requests_str: str

    def __init__(self):
        # State: Dictionary storing all truth requests
        # Format: { request_id: { "statement": str, "sources": list, "status": "PENDING" | "TRUE" | "FALSE" | "UNVERIFIABLE" | "ERROR", "requester": str } }
        self.requests_str = "{}"

    @gl.public.write
    def request_truth(self, request_id: str, statement: str, source_urls: list) -> None:
        """
        Allows anyone (user or another contract) to request the verification of a statement.
        """
        request_id = request_id.strip()
        requests = json.loads(self.requests_str)
        
        if request_id in requests:
            raise gl.vm.UserError("Request ID already exists")
            
        requests[request_id] = {
            "statement": statement,
            "sources": source_urls,
            "status": "PENDING",
            "requester": str(gl.message.sender_address)
        }
        
        self.requests_str = json.dumps(requests)

    @gl.public.view
    def get_truth(self, request_id: str) -> str:
        """
        View function for other contracts to read the verified status.
        """
        request_id = request_id.strip()
        requests = json.loads(self.requests_str)
        req = requests.get(request_id)
        if not req:
            return "NOT_FOUND"
        return json.dumps(req)

    @gl.public.write
    def resolve_truth(self, request_id: str) -> None:
        """
        Triggers the AI Oracle to resolve a pending truth request via GenVM Semantic Consensus.
        """
        request_id = request_id.strip()
        requests = json.loads(self.requests_str)
        
        if request_id not in requests:
            raise gl.vm.UserError("Request ID does not exist")
        
        req = requests[request_id]
        if req["status"] != "PENDING":
            raise gl.vm.UserError("Request is already resolved")

        statement = req["statement"]
        sources = req["sources"]

        def leader_fn() -> str:
            web_data = ""
            
            # 1. Fetch data from sources (Fail-safe)
            for url in sources[:3]: # Limit to 3 sources to avoid context limit
                try:
                    content = gl.nondet.web.render(url, mode="text")[:1500]
                    web_data += f"\n--- Source: {url} ---\n{content}\n"
                except Exception as e:
                    web_data += f"\n--- Source: {url} ---\nFailed to load.\n"
            
            # 2. Prompt LLM
            prompt = f"""
            You are GenTruth, a highly objective fact-checking AI Oracle.
            Verify the following STATEMENT based ONLY on the provided WEB EVIDENCE.
            
            STATEMENT TO VERIFY: "{statement}"
            
            WEB EVIDENCE:
            {web_data if web_data else "No evidence provided."}
            
            RULES:
            1. If evidence clearly proves statement is true, output "TRUE".
            2. If evidence clearly proves statement is false, output "FALSE".
            3. Otherwise, output "UNVERIFIABLE".
            
            Output ONLY a JSON object: {{"verdict": "TRUE" | "FALSE" | "UNVERIFIABLE"}}
            """
            
            try:
                llm_response = gl.nondet.exec_prompt(prompt)
                
                # Robust Markdown stripping
                clean_resp = llm_response.strip()
                if clean_resp.startswith("```json"):
                    clean_resp = clean_resp[7:]
                elif clean_resp.startswith("```"):
                    clean_resp = clean_resp[3:]
                if clean_resp.endswith("```"):
                    clean_resp = clean_resp[:-3]
                    
                parsed = json.loads(clean_resp.strip())
                verdict = parsed.get("verdict", "UNVERIFIABLE")
                if verdict not in ["TRUE", "FALSE"]:
                    verdict = "UNVERIFIABLE"
                    
                return json.dumps({"verdict": verdict})
            except Exception:
                return json.dumps({"verdict": "ERROR"})

        def validator_fn(leader_res) -> bool:
            try:
                leader_str = ""
                if type(leader_res) is str:
                    leader_str = leader_res
                elif hasattr(leader_res, "value"):
                    leader_str = leader_res.value
                elif hasattr(leader_res, "calldata"):
                    leader_str = leader_res.calldata
                else:
                    return False
                    
                l_data = json.loads(leader_str)
                v_data = json.loads(leader_fn())
                
                return l_data.get("verdict") == v_data.get("verdict")
            except Exception:
                return False

        # Run Semantic Consensus
        result_json_str = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        try:
            # result_json_str could be an object if GenVM automatically parses it in this version,
            # or it could be a string. We handle both like in validator_fn.
            final_str = ""
            if type(result_json_str) is str:
                final_str = result_json_str
            else:
                final_str = getattr(result_json_str, "value", "{}")
                
            result_data = json.loads(final_str)
            final_status = result_data.get("verdict", "ERROR")
        except:
            final_status = "ERROR"

        # Update State
        req["status"] = final_status
        self.requests_str = json.dumps(requests)
