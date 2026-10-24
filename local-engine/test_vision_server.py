"""Synthetic adapter/HTTP checks. No real model or project drawing is used."""
import base64
import copy
import json
import threading
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, build_opener, ProxyHandler
from vision_server import Ollama, VisionError, VisionServer, validate_output, validate_request

PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII="
RESULT = {"drawingType":"floor_plan", "summary":"Synthetic fixture", "warnings":[], "proposals":[{
    "kind":"wall", "label":"Possible wall", "bbox":[10,20,30,40], "evidenceText":"", "uncertainties":["Thickness unknown"]}]}


class FakeEngine:
    model = "qwen3-vl:4b-instruct"
    def __init__(self):
        self.calls = []
    def status(self):
        return {"ready":True,"model":self.model,"localOnly":True}
    def analyze(self,image,context):
        self.calls.append((image,context))
        return copy.deepcopy(RESULT)


class ValidationTests(unittest.TestCase):
    def test_bad_images_and_non_image_urls_never_reach_inference(self):
        validate_request({"image":PNG,"ocrContext":""})
        for image in ["https://example.com/drawing.png", "bad", base64.b64encode(b"not png").decode()]:
            with self.assertRaises(VisionError):
                validate_request({"image":image,"ocrContext":""})
        with self.assertRaises(VisionError):
            validate_request({"image":PNG,"ocrContext":"","endpoint":"https://example.com"})

    def test_invalid_generated_locations_and_extra_fields_rejected(self):
        for box in [[0,0,1001,10],[20,20,10,40],[0,0,True,40]]:
            result = copy.deepcopy(RESULT)
            result["proposals"][0]["bbox"] = box
            with self.assertRaises(VisionError):
                validate_output(result)
        result = copy.deepcopy(RESULT)
        result["proposals"][0]["verified"] = True
        with self.assertRaises(VisionError):
            validate_output(result)

    def test_missing_model_does_not_download_or_attempt_chat(self):
        engine = Ollama("qwen3-vl:4b-instruct")
        with patch.object(engine,"call",return_value={"models":[]}) as call:
            with self.assertRaises(VisionError):
                engine.analyze(PNG,"")
            call.assert_called_once_with("/api/tags")

    def test_image_and_json_schema_reach_fixed_local_adapter(self):
        engine = Ollama("qwen3-vl:4b-instruct")
        with patch.object(engine,"call",side_effect=[{"models":[{"name":engine.model}]},{"message":{"content":json.dumps(RESULT)}}]) as call:
            self.assertEqual(engine.analyze(PNG,"unverified OCR"),RESULT)
            payload = call.call_args.args[1]
            self.assertEqual(payload["messages"][1]["images"],[PNG])
            self.assertIsInstance(payload["format"],dict)
            self.assertFalse(payload["stream"])
        with self.assertRaises(ValueError):
            Ollama("qwen3-vl:235b-cloud")


class HTTPTests(unittest.TestCase):
    def setUp(self):
        self.engine = FakeEngine()
        self.server = VisionServer(("127.0.0.1",0),self.engine)
        self.thread = threading.Thread(target=self.server.serve_forever,daemon=True)
        self.thread.start()
        self.origin = f"http://127.0.0.1:{self.server.server_address[1]}"
        self.opener = build_opener(ProxyHandler({}))

    def tearDown(self):
        self.server.shutdown(); self.server.server_close(); self.thread.join()

    def request(self,path,body=None,origin=None,extra=None):
        headers = {"Content-Type":"application/json"}
        if origin is not None:
            headers["Origin"] = origin
        headers.update(extra or {})
        req = Request(self.origin+path,data=None if body is None else json.dumps(body).encode(),headers=headers)
        try:
            with self.opener.open(req,timeout=3) as response:
                return response.status, response.headers, response.read()
        except HTTPError as error:
            return error.code,error.headers,error.read()

    def test_http_analysis_and_status_no_cors_or_cache(self):
        code,headers,body = self.request('/api/vision/status')
        self.assertEqual(code,200)
        self.assertEqual(headers['Cache-Control'],'no-store')
        self.assertIsNone(headers.get('Access-Control-Allow-Origin'))
        code,_,body = self.request('/api/vision/analyze',{"image":PNG,"ocrContext":"fixture"},self.origin)
        self.assertEqual(code,200)
        self.assertEqual(json.loads(body)["result"],RESULT)
        self.assertEqual(len(self.engine.calls),1)

    def test_remote_origin_host_and_missing_origin_cannot_invoke_model(self):
        for origin,headers in [("https://example.com",{}),(None,{}),(self.origin,{"Host":"attacker.invalid"})]:
            code,_,_=self.request('/api/vision/analyze',{"image":PNG,"ocrContext":""},origin,headers)
            self.assertEqual(code,403)
        self.assertEqual(self.engine.calls,[])

    def test_busy_model_rejects_without_second_inference(self):
        self.server.inference_lock.acquire()
        try:
            code,_,_=self.request('/api/vision/analyze',{"image":PNG,"ocrContext":""},self.origin)
            self.assertEqual(code,503)
            self.assertEqual(self.engine.calls,[])
        finally:
            self.server.inference_lock.release()

    def test_only_static_app_assets_are_served(self):
        for path in ['/.git/config','/local-engine/vision_server.py','/local-engine/','/../local-engine/vision_server.py']:
            self.assertEqual(self.request(path)[0],404)
        self.assertEqual(self.request('/index.html')[0],200)


if __name__ == '__main__':
    unittest.main()
