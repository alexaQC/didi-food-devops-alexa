# Validación final EDT 5.1 — FinLab Eats

Fecha de ejecución: 2026-09-24 (America/Mexico_City)

Estado del documento: **validación técnica COMPLETADA**. La ejecución corregida de GitHub Actions fue verificada junto con sus logs y artefactos. La sincronización de la tarjeta en Trello queda pendiente por falta de una sesión o token autorizado en este entorno.

## Identificación y alcance

- Rama: `chore/static-iac-review`.
- Commit base validado: `356ebbe9069cd504146a9e9165e5a1c513d9d6ac`.
- Commit ejecutado por el pipeline corregido: `350e7b6fa75bb28ba7f58f0c3dafe530a58710d3`.
- Rúbrica revisada: `C:\Users\VladG\OneDrive\Desktop\Rubrica_Proyecto_Final.pdf` (3 páginas).
- Avance revisado: `C:\Users\VladG\OneDrive\Desktop\Avance_Proyecto_GAPS_NEW (1).pdf` (15 páginas). Es idéntico por SHA-256 a `Avance_Proyecto_GAPS_NEW.pdf`: `DCC71EEA7DC1B23E831C6000105CB0B33423AB77F67DF9EBDB6871496EDF2C33`.
- No se encontró el DOCX editable que originó el avance. Para actualizar ese entregable se necesita el archivo fuente correspondiente a ese PDF, idealmente `Avance_Proyecto_GAPS_NEW.docx`; no se reconstruyó a partir del PDF.

La ejecución local se realizó en el proyecto Compose aislado `finlab-edt51-356ebbe`, con frontend en `127.0.0.1:8081`, backend en `127.0.0.1:3100` y cuatro volúmenes de base de datos exclusivos. Los contenedores que ya estaban activos antes de esta validación no fueron recreados ni detenidos.

Versiones registradas:

| Herramienta | Versión |
|---|---|
| Docker cliente/servidor | 29.8.0 / 29.8.0 |
| Docker Compose | 5.5.1 |
| Node.js | v24.16.0 |
| npm | 11.13.0 |
| Playwright | 1.58.2 |
| Newman | 6.2.2 |
| k6 | 2.2.0 |
| Checkov | 3.3.19 |
| Helm usado en la revisión estática | 3.16.4 |
| actionlint | 1.7.7 |

## Matriz breve de validación por riesgo

| Riesgo del avance | Prueba | Resultado esperado | Evidencia |
|---|---|---|---|
| Indisponibilidad | Build/up aislado, estado Compose, `/healthz`, `/readyz` y `pg_isready` | Servicios levantados; endpoints 200; bases aceptando conexiones | `compose-build-up.txt`, `compose-ps.jsonl`, `health-flow-communication.txt`, `database-health.txt` |
| Comunicación entre servicios | Flujo gateway → users/orders/payments y consultas posteriores | 201 al crear; 200 al consultar; entidades persistidas | `health-flow-communication.txt`, `newman-full.txt` |
| Despliegue falsamente exitoso | Espera bloqueante de `/readyz`, estado/logs siempre publicados | El pipeline falla si readiness no se confirma y conserva diagnóstico | `.github/workflows/api-tests.yml`, `actionlint.txt`, [corrida 36050549447](https://github.com/alexaQC/didi-food-devops-alexa/actions/runs/36050549447) |
| Regresión | Playwright, colección Newman completa y k6 | UI 2/2; API sin ocultar fallos; k6 dentro de umbrales | `playwright.txt`, `newman-full.txt`, `newman-full-report.xml`, `k6.txt`, `k6-summary.json` |

Todos los nombres de evidencia de esta tabla se encuentran en `evidence/edt-5.1/2026-09-24/`.

## Estado del stack y flujo funcional

`docker compose up --build -d` terminó con código 0 para el proyecto aislado. Se levantaron nueve contenedores: frontend, backend, tres microservicios y cuatro PostgreSQL.

- Frontend, backend, users-service, orders-service y payments-service: `running` y `healthy`.
- users-db, orders-db y payments-db: `running` y `healthy`.
- db principal: `running`; no define healthcheck Docker, pero `pg_isready` aceptó conexiones y `/readyz` confirmó una consulta a esa base.
- `/healthz`: HTTP 200.
- `/readyz`: HTTP 200. Este endpoint verifica únicamente la base del gateway; no prueba readiness de los tres microservicios.
- `/`: HTTP 200 desde nginx.
- Los tres microservicios respondieron `ok` en su `/healthz` interno.
- Las cuatro bases respondieron `accepting connections` con código 0.

El flujo funcional ejecutado a través del gateway obtuvo:

- Restaurantes y menú: HTTP 200.
- Crear usuario: HTTP 201.
- Crear orden para ese usuario: HTTP 201.
- Crear pago para esa orden: HTTP 201.
- Consultar usuarios, órdenes y pagos: HTTP 200; las tres entidades creadas fueron encontradas.

Esto demuestra comunicación gateway → microservicio → base de datos para users, orders y payments. No demuestra tolerancia a caída de un downstream ni reemplaza una prueba en Kubernetes.

## Resultados finales y comparación

| Tipo | Resultado anterior | Resultado de esta ejecución | Código de salida | Interpretación |
|---|---:|---:|---:|---|
| Playwright `tests/e2e/app.spec.js` | 2/2 | 2/2 en 2.4 s | 0 | Sin regresión observada en los dos casos UI. |
| Newman, colección completa | 23/26 | 23/26; 14 requests, 26 assertions, 3 fallidas | 1 | **No aprobado**: reproduce el defecto 400→500. |
| Newman, grupo estable propuesto para CI | No separado | 22/22; 10 requests | 0 | Puede bloquear el pipeline. |
| Newman, negativos conocidos | No separado | 1/4; 3 fallidas | 1 tolerado solo en CI | Se ejecuta y reporta, pero no se considera aprobado. |
| k6 `tests/perf/smoke.js` | 150/150; p95 42 ms | 150/150; p95 62.42 ms; 0% errores; 150 requests | 0 | Cumple `p95 < 1200 ms` y error `<1%`; no prueba una mejora frente al valor anterior. |

El p95 aumentó de 42 ms a 62.42 ms. Ambas mediciones cumplen el umbral, pero no son suficientes para atribuir una mejora o degradación estable: solo hay una corrida anterior documentada y una corrida final en un entorno local.

## Defectos y riesgos abiertos

### DEF-API-001 — el gateway transforma validaciones 400 en 500

Estado: **FALLIDO / abierto**.

Los microservicios rechazan correctamente payloads incompletos con HTTP 400. Axios entrega esas respuestas al `catch` del gateway y este reemplaza tanto status como body por `500 { error: "*_service_unavailable" }`. Las tres assertions fallidas son:

1. usuario sin `name`/`email`: esperado 400, obtenido 500;
2. orden sin `userId`/`total`: esperado 400, obtenido 500;
3. pago sin `orderId`/`amount`: esperado 400, obtenido 500.

Impacto: el cliente no puede distinguir datos inválidos de una caída real, el monitoreo registra errores de infraestructura falsos y se pierde el detalle de validación. No se aplicó la corrección porque cambia el contrato de error del gateway y requiere analizar consumidores y añadir regresión para errores downstream, timeouts y conexiones rechazadas.

### SEC-API-001 — creación de órdenes sin autorización

Estado: **hallazgo reproducido / abierto**.

`POST /api/orders` acepta `userId=999999` y crea la orden con HTTP 201. Las dos assertions de esta prueba pasan porque documentan el comportamiento vulnerable; un test aprobado no significa que el control de acceso exista.

### Riesgo estático de infraestructura

- Helm: 651 checks pasados, 160 fallidos, 0 omitidos.
- Dockerfiles: 186 pasados, 0 fallidos, 0 omitidos.
- Terraform: 0 checks aplicables; es ausencia de cobertura, no aprobación.

Los 160 hallazgos Helm y su aceptación limitada al entorno local se detallan en `infra/checkov-reports/riesgo-aceptado.md`. No se extiende esa aceptación a staging o producción.

## Pipeline CI/CD

La corrección mínima aplicada al workflow:

- activa push para `chore/**` y agrega `workflow_dispatch`;
- hace fallar el job si `/readyz` no responde tras 30 intentos;
- mantiene 22 assertions estables como grupo bloqueante;
- ejecuta las cuatro assertions negativas en un grupo explícitamente no bloqueante, conservando sus tres fallos;
- genera dos JUnit separados, un resumen honesto y logs/estado de Compose como artefacto;
- fija Newman 6.2.2.

Validación local del cambio:

- `actionlint` 1.7.7: código 0.
- Comando equivalente estable: 22/22, código 0.
- Comando equivalente de defectos conocidos: 1/4, tres fallos, código 1.

La ejecución corregida [36050549447](https://github.com/alexaQC/didi-food-devops-alexa/actions/runs/36050549447), para el commit `350e7b6fa75bb28ba7f58f0c3dafe530a58710d3`, terminó `success` en 58 segundos. La revisión no se limitó al color del job:

- `/readyz` confirmó el backend antes de iniciar Newman;
- el grupo estable ejecutó 10 requests y **22/22 assertions**, sin fallos;
- el grupo no bloqueante ejecutó cuatro requests y **1/4 assertions**: conserva tres fallos 400→500 y terminó internamente con código 1;
- el resumen del workflow identifica ese grupo como `failure` y no aprobado;
- se publicaron cuatro archivos en el artefacto [`api-tests-and-compose-logs`](https://github.com/alexaQC/didi-food-devops-alexa/actions/runs/36050549447/artifacts/10830142527): dos JUnit, `compose-ps.txt` y `compose.log`;
- artefacto ID `10830142527`, 5,495 bytes, SHA-256 del ZIP `e9a4252a6f644d4a52ea4023f84b817001e8c7064a8a86c681aefa1178ced2d8`.

Los archivos descargados están preservados en `evidence/edt-5.1/2026-09-24/github-run-36050549447-verified/`. El JUnit estable contiene 22 casos sin `failure`; el JUnit de defectos conocidos contiene cuatro casos y tres nodos `failure`, uno por cada defecto documentado.

La corrida pre-corrección [36038380971](https://github.com/alexaQC/didi-food-devops-alexa/actions/runs/36038380971), commit `b286c11`, también estaba marcada `success`, aunque su JUnit contenía las tres assertions fallidas. Su evidencia se conserva para demostrar por qué el color verde por sí solo era insuficiente.

## Tabla de validación EDT 5.1

| Criterio | Prueba | Resultado | Evidencia | Estado | Pendiente |
|---|---|---|---|---|---|
| Build reproducible local y CI | Compose aislado con `--build` local y en runner | Código 0; nueve contenedores locales; stack remoto levantado | `compose-build-up.txt`, corrida 36050549447 y `compose-ps.txt` remoto | APROBADO | No sustituye un despliegue Kubernetes. |
| Disponibilidad del gateway | `/healthz` y `/readyz` | 200/200 | `health-flow-communication.txt` | APROBADO | Ampliar readiness para downstreams. |
| Disponibilidad de datos | Cuatro `pg_isready` | Cuatro códigos 0 | `database-health.txt` | APROBADO | Añadir healthcheck al db principal en Compose. |
| Comunicación entre servicios | Usuario → orden → pago y consultas | 201/201/201; consultas 200 y entidades encontradas | `health-flow-communication.txt` | APROBADO | Probar fallos y timeouts downstream. |
| UI funcional | Playwright | 2/2 | `playwright.txt` | APROBADO | La cobertura sigue limitada a dos escenarios. |
| API estable | Newman estable local y remoto | 22/22 en ambas ejecuciones | `newman-stable.txt`, JUnit remoto, corrida 36050549447 | APROBADO | Ampliar cobertura funcional. |
| Contrato de errores API | Newman completo/negativos | 23/26; tres 400 esperados reciben 500 | `newman-full.txt`, `newman-known-defects.txt` | FALLIDO | Analizar y corregir DEF-API-001 con pruebas de regresión. |
| Rendimiento smoke | k6, 10 VUs/15 s | 150/150; 0% error; p95 62.42 ms | `k6.txt`, `k6-summary.json` | APROBADO | No inferir tendencia con dos mediciones no controladas. |
| Revisión estática ejecutada | Checkov Helm/Dockerfiles | 651/160 y 186/0 | `infra/checkov-reports/` | APROBADO | Mantener aceptación limitada y remediar antes de producción. |
| Ausencia de hallazgos Helm | Checkov Helm | Permanecen 160 | `checkov-helm-report-after.txt` | FALLIDO | Priorizar security contexts, probes, recursos y NetworkPolicies. |
| Cobertura Terraform | Checkov Terraform | 0 checks aplicables | `checkov-terraform-report.txt` | NO VERIFICADO | Incorporar herramienta/policies que cubran estos recursos. |
| Sintaxis del pipeline | actionlint + ejecución local y remota | Código 0; grupos 22/22 y 1/4 | `actionlint.txt`, salidas Newman y corrida 36050549447 | APROBADO | Actualizar acciones antes de que finalice la transición de Node.js 20. |
| Pipeline corregido en GitHub | Push a `chore/**`, logs y artefactos | `success`; commit y contenido de ambos JUnit verificados | [Corrida 36050549447](https://github.com/alexaQC/didi-food-devops-alexa/actions/runs/36050549447), artefacto 10830142527 | APROBADO | Los tres defectos conocidos permanecen abiertos y no bloquean este workflow. |
| Sincronización de seguimiento | Tarjeta Trello `[EDT 5.1] Ejecutar validación final` | API respondió HTTP 401 al intentar moverla de `To Do` a `Done` | [Tarjeta EDT 5.1](https://trello.com/c/hhMPzT2P/20-edt-51-ejecutar-validaci%C3%B3n-final) | NO VERIFICADO | Requiere que un miembro autenticado del tablero la mueva a `Done`. |
| Integración en PDF del avance | Localización de fuente | Solo se encontraron dos PDFs idénticos | Hash documentado arriba | NO VERIFICADO | Proporcionar DOCX fuente; no reconstruir evidencia. |

## Relación con la hipótesis original

La evidencia apoya parcialmente la hipótesis en su parte cualitativa: las pruebas tempranas y continuas detectaron configuraciones estáticas, un defecto real de propagación de errores y una ausencia de autorización sin esperar una entrega final. El stack aislado también demuestra que los caminos principales pueden validarse automáticamente.

No se confirma la parte cuantitativa de la hipótesis. No existen mediciones comparables de tiempo de diagnóstico, número de despliegues fallidos ni tasa de reejecución antes/después. Los conteos Playwright, Newman y k6 se repitieron, y el p95 de k6 fue mayor en esta corrida. Por ello no se afirma que la estrategia haya reducido tiempo, esfuerzo o defectos.

## Reflexión final

1. **Aprendizaje principal:** un servicio `running` o un workflow verde no equivale a un sistema aprobado; se necesitan readiness bloqueante, assertions y artefactos inspeccionables.
2. **Herramientas más útiles:** Newman expuso el contrato 400→500; Playwright probó el flujo visible; k6 cuantificó el smoke; Checkov permitió enumerar riesgo residual; la combinación fue más útil que una sola herramienta.
3. **Problemas y respuesta:** se aisló el entorno para no tocar datos existentes, se corrigió el arranque no root de nginx en la revisión previa y se hizo honesta la semántica del pipeline. El defecto del gateway y el control de acceso permanecen abiertos porque requieren cambio funcional y análisis, no una excepción silenciosa.

## Conclusión de entrega

La **validación técnica EDT 5.1 queda COMPLETADA**: existe evidencia local y una corrida real del workflow corregido cuyo commit, logs y dos JUnit fueron comprobados. El prototipo está listo para entrega académica con reservas explícitas, no para producción. Permanecen abiertos DEF-API-001, SEC-API-001, 160 hallazgos Helm aceptados solo para el entorno local, la falta de cobertura aplicable de Terraform y la integración del reporte en el PDF/DOCX final. Las tres assertions 400→500 continúan fallidas y no se presentan como aprobadas. La tarjeta Trello aún requiere actualización manual autenticada.
