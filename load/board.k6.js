/**
 * k6 baseline for the board's hot path: task list + batch reorder.
 *
 *   k6 run load/board.k6.js                      # against http://localhost:5000
 *   k6 run -e API_URL=https://api.example.com/api/v1 load/board.k6.js
 *
 * Self-contained: setup() registers a throwaway org/user/project and seeds
 * tasks, so no credentials or fixtures are needed. Point it at a DISPOSABLE
 * database (e.g. the docker-compose stack), never production.
 *
 * NOTE: run the server with NODE_ENV=test (or raise the limits) — the global
 * 100 req/min per-IP rate limiter otherwise throttles any single-machine
 * load test into a wall of 429s and the numbers measure the limiter, not
 * the app.
 */
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.API_URL || "http://localhost:5000/api/v1";
const JSON_HEADERS = { "Content-Type": "application/json" };

export const options = {
  scenarios: {
    board: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 10 }, // ramp up
        { duration: "1m", target: 10 }, // hold
        { duration: "15s", target: 0 }, // ramp down
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"], // baseline target; tighten once measured
  },
};

export function setup() {
  const stamp = Date.now();
  const register = http.post(
    `${BASE}/auth/register`,
    JSON.stringify({
      orgName: `k6 Org ${stamp}`,
      name: "k6 User",
      email: `k6-${stamp}@test.local`,
      password: "Password1",
    }),
    { headers: JSON_HEADERS },
  );
  check(register, { "setup: registered": (r) => r.status === 201 });

  const token = register.json("data.accessToken");
  const auth = { headers: { ...JSON_HEADERS, Authorization: `Bearer ${token}` } };

  const project = http.post(`${BASE}/projects`, JSON.stringify({ name: "k6 Load" }), auth);
  check(project, { "setup: project created": (r) => r.status === 201 });
  const projectId = project.json("data.id");

  const taskIds = [];
  for (let i = 0; i < 10; i++) {
    const task = http.post(
      `${BASE}/projects/${projectId}/tasks`,
      JSON.stringify({ title: `k6 task ${i}`, status: "TODO" }),
      auth,
    );
    taskIds.push(task.json("data.id"));
  }

  return { token, projectId, taskIds };
}

export default function (data) {
  const auth = {
    headers: { ...JSON_HEADERS, Authorization: `Bearer ${data.token}` },
  };

  const list = http.get(`${BASE}/projects/${data.projectId}/tasks`, auth);
  check(list, { "list tasks 200": (r) => r.status === 200 });

  // Rotate every task's order — the same batch write a drag & drop produces.
  const n = data.taskIds.length;
  const updates = data.taskIds.map((id, i) => ({
    id,
    order: (i + __ITER + 1) % n,
  }));
  const reorder = http.patch(
    `${BASE}/projects/${data.projectId}/tasks/reorder`,
    JSON.stringify({ updates }),
    auth,
  );
  check(reorder, { "batch reorder 200": (r) => r.status === 200 });

  sleep(1);
}
