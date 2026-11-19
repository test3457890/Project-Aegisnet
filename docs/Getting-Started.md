# Getting started

## AegisNet web and API

Use Node.js 24 LTS and npm. From the repository root, install the locked dependencies.

```text
npm ci
npm ci --prefix services/api
```

Start the API in one terminal. Start the web UI in a second terminal.

```text
npm start --prefix services/api
npm run dev -- --host 127.0.0.1
```

Open [the web app](http://localhost:5173). Its dashboard displays Shared data connected after it loads the API data. The [health endpoint](http://localhost:8000/health) reports the API, SQLite, upload directory, and WebSocket status.

SQLite and normal uploads live under `services/api` by default. A clean API launch creates the database and inserts sample data. The frontend also stores local prototype state and Vault files in the browser. Keep backups of any local files you want to preserve before clearing browser storage or changing databases.

| Symptom | What to check |
| --- | --- |
| Browser-local fallback | Check API health and inspect the API terminal. |
| Port already in use | Stop the conflicting process. For the API, set `API_PORT` and point `VITE_AEGIS_API_URL` and `VITE_AEGIS_WS_URL` at the same port before restarting Vite. |
| Native SQLite install fails | Reinstall from the lockfile using Node.js 24. Read the npm error for native build requirements on your platform. |
| Vault upload or local PIN behaves differently | Use a current browser on a loopback address. The browser uses Web Crypto for the local Vault and PIN workflows. |

## SkyMesh Scout

Use Python 3 and run the dashboard from the repository root.

```text
python3 components/skymesh-scout/server.py
```

Open [SkyMesh Scout](http://127.0.0.1:8080) or [the setup wizard](http://127.0.0.1:8080/setup). This starts a loopback-only demonstration. Without a compatible receiver, the dashboard shows simulated traffic. Radio output through the dashboard is disabled by default. Pilot use, emergency response, hardware installation, and live data feeds require independent validation outside this demo.

Restart the dashboard after saving node settings. The setup wizard writes `components/skymesh-scout/config.json`. To keep local configuration outside the working tree, copy the example configuration and set `SKYMESH_CONFIG` to the absolute path of the copy before starting.

## CAP-inspired Mission Board

From the repository root, serve the component locally.

```text
python3 -m http.server 8090 --bind 127.0.0.1 --directory components/cap
```

Open [the training demo](http://127.0.0.1:8090/demo/cap-mission-board-demo.html). Its data and operators are fictional. The training board is a companion prototype and runs independently of the web app.
