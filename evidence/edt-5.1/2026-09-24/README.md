# Evidencia EDT 5.1 — 2026-09-24

Commit base: `356ebbe9069cd504146a9e9165e5a1c513d9d6ac`

| Evidencia | Contenido |
|---|---|
| `environment.txt` | Fecha, commit, rama y versiones. |
| `compose-build-up.txt` | Comando y salida completa de build/up; exit 0. |
| `compose-ps.jsonl`, `compose-ps-final.jsonl` | Estado inicial y posterior a pruebas de los nueve contenedores. |
| `compose.txt`, `compose-final.txt` | Logs antes y después de las pruebas automatizadas. |
| `health-flow-communication.txt` | HTTP, bodies y aserciones del flujo usuario→orden→pago. |
| `database-health.txt` | Cuatro ejecuciones `pg_isready`, todas con exit 0. |
| `post-test-health.txt` | `/healthz`, `/readyz` y frontend en 200 después de las pruebas. |
| `playwright-setup.txt`, `playwright.txt` | Instalación bloqueada y ejecución 2/2, exit 0. |
| `newman-full.txt`, `newman-full-report.xml` | Colección completa: 23/26, exit 1. |
| `newman-stable.txt`, `newman-stable-report.xml` | Grupo bloqueante propuesto: 22/22, exit 0. |
| `newman-known-defects.txt`, `newman-known-defects-report.xml` | Grupo no bloqueante: 1/4, tres fallos, exit 1. |
| `k6.txt`, `k6-summary.json` | 150/150, 0% error, p95 62.42 ms, exit 0. |
| `actionlint.txt` | Validación del workflow, exit 0. |
| `github-actions-before-push.json` | Corridas remotas disponibles antes de publicar la corrección. |
| `github-run-36038380971-pre-correction/` | Logs y JUnit de la última corrida real anterior; estaba verde con tres fallos tolerados. |
| `github-run-36050549447-verified/` | Artefacto y resumen de verificación del workflow corregido: estable 22/22; defectos conocidos 1/4. |

La ejecución corregida verificada es la [36050549447](https://github.com/alexaQC/didi-food-devops-alexa/actions/runs/36050549447), sobre el commit `350e7b6fa75bb28ba7f58f0c3dafe530a58710d3`. El artefacto remoto [`api-tests-and-compose-logs`](https://github.com/alexaQC/didi-food-devops-alexa/actions/runs/36050549447/artifacts/10830142527) contiene ambos JUnit, estado y logs de Compose. El resultado verde corresponde al grupo estable; las tres assertions 400→500 permanecen fallidas en el grupo no bloqueante.
