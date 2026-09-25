# Verificación de GitHub Actions 36050549447

- Workflow: `API Tests (Newman)`.
- Evento: `push` a `chore/static-iac-review`.
- Commit: `350e7b6fa75bb28ba7f58f0c3dafe530a58710d3`.
- Inicio: `2026-09-24T19:47:44Z`.
- Finalización: `2026-09-24T19:48:46Z`.
- Resultado del job: `success`.
- Ejecución: https://github.com/alexaQC/didi-food-devops-alexa/actions/runs/36050549447

## Resultados comprobados

| Grupo | Requests | Assertions | Aprobadas | Fallidas | Bloqueante |
|---|---:|---:|---:|---:|---|
| Estable | 10 | 22 | 22 | 0 | Sí |
| Defectos conocidos | 4 | 4 | 1 | 3 | No |

El segundo grupo terminó Newman con código 1. GitHub lo registró como `failure`, pero el workflow lo conserva como no bloqueante mediante `continue-on-error`. Las tres fallas son respuestas HTTP 500 donde se esperaba 400 para usuario, orden y pago sin datos. No se consideran aprobadas.

## Artefacto

- Nombre: `api-tests-and-compose-logs`.
- ID: `10830142527`.
- URL: https://github.com/alexaQC/didi-food-devops-alexa/actions/runs/36050549447/artifacts/10830142527
- Tamaño reportado: 5,495 bytes.
- SHA-256 del ZIP reportado por GitHub: `e9a4252a6f644d4a52ea4023f84b817001e8c7064a8a86c681aefa1178ced2d8`.
- Archivos descargados: `newman-stable-report.xml`, `newman-known-defects-report.xml`, `compose-ps.txt` y `compose.log`.

Los XML y logs se revisaron después de la descarga. No se detectaron tokens, claves privadas, credenciales en URL ni encabezados de autorización sin enmascarar.

## Advertencias no bloqueantes

GitHub indicó que `actions/checkout@v4` y `actions/upload-artifact@v4` todavía apuntan a Node.js 20 y fueron forzadas a ejecutarse con Node.js 24. También anunció una futura migración de `ubuntu-latest`. Ninguna advertencia invalidó esta ejecución, pero las acciones deberán actualizarse cuando exista una versión estable compatible.
