import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 10,
  duration: "15s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1200"]
  }
};

const BASE = __ENV.PERF_BASE_URL || "http://localhost:3000";

export default function () {
  const res = http.get(`${BASE}/api/items`);
  check(res, { "status 200": (r) => r.status === 200 });
  sleep(1);
}
