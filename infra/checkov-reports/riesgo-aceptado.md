# Riesgos aceptados de la revisión estática de IaC

Fecha de revisión: 2026-09-24
Alcance: rama `chore/static-iac-review`, chart Helm renderizado para el namespace real `finlab`, cinco Dockerfiles y configuración Terraform existente.

## Criterio de aceptación

Esta aceptación es temporal y se limita al entorno local/de desarrollo de FinLab. Significa que los hallazgos indicados no se corrigen dentro de esta revisión acotada; no constituye autorización para desplegar la misma configuración en producción. Los controles deben reevaluarse antes de promover el sistema a un entorno con datos, credenciales o tráfico reales.

Esta revisión tampoco completa la validación final EDT 5.1. Esa validación es la actividad siguiente.

## Resultados reproducidos

- Helm inicial, renderizado sin `--namespace`: 632 checks pasados, 179 fallidos y 0 omitidos. Incluía 19 fallos `CKV_K8S_21` reportados como recursos de `default`.
- Helm posterior, renderizado con `helm template finlab infra/helm/finlab --namespace finlab`: 651 checks pasados, 160 fallidos y 0 omitidos. No permanece ningún fallo `CKV_K8S_21`.
- El render posterior contiene 26 recursos y los 26 declaran `metadata.namespace: finlab`. `helm lint` terminó con 0 charts fallidos.
- Dockerfiles iniciales: 154 checks pasados, 10 fallidos y 0 omitidos. Los fallos eran cinco `CKV_DOCKER_2` (sin `HEALTHCHECK`) y cinco `CKV_DOCKER_3` (sin usuario no root).
- Dockerfiles posteriores: 186 checks pasados, 0 fallidos y 0 omitidos. El total de checks evaluados aumentó porque las instrucciones nuevas, incluido el `RUN` de permisos de nginx, activan comprobaciones adicionales.
- Terraform: Checkov 3.3.19 devuelve código 0 y únicamente imprime el banner, sin resumen de checks ni recursos evaluados. Para esta revisión se registra como **0 checks aplicables**. Esto significa ausencia de cobertura aplicable para estos recursos/proveedores en este escaneo; no significa que Terraform esté aprobado o sea seguro.

Reportes posteriores:

- `checkov-helm-report-after.txt`
- `checkov-dockerfile-report-after.txt`

## Conjuntos exactos de recursos

Para mantener legible la tabla, se usan las siguientes referencias cerradas; cada una enumera explícitamente todos sus recursos:

- **W9**: `backend`, `orders-service`, `payments-service`, `users-service`, `frontend`, `orders-postgres`, `payments-postgres`, `postgres` y `users-postgres` (Deployments).
- **R6**: `payments-service`, `users-service`, `orders-postgres`, `payments-postgres`, `postgres` y `users-postgres`. En los dos servicios, Checkov también considera los init containers sin recursos.
- **A5**: `backend`, `orders-service`, `payments-service`, `users-service` y `frontend`.
- **P6**: `users-service`, `frontend`, `orders-postgres`, `payments-postgres`, `postgres` y `users-postgres`.
- **S2**: `backend` y `postgres`.
- **N9**: los pods generados por cada Deployment de W9.

## Hallazgos de Helm aceptados temporalmente

Los conteos siguientes provienen del reporte posterior; suman los 160 fallos observados, no una cifra estimada.

| Check | Clase | Ocurrencias | Recursos | Decisión y justificación |
|---|---|---:|---|---|
| `CKV_K8S_10` | Capacidad | 6 | R6 | Aceptado temporalmente. Faltan solicitudes de CPU en cuatro bases y en los init containers de dos servicios; en el clúster local no hay garantía de capacidad ni SLO, pero permanece el riesgo de scheduling y contención. |
| `CKV_K8S_11` | Capacidad | 6 | R6 | Aceptado temporalmente. Faltan límites de CPU en R6; el alcance local tolera consumo no acotado, pero producción debe fijarlos a partir de mediciones para evitar noisy neighbors. |
| `CKV_K8S_12` | Capacidad | 6 | R6 | Aceptado temporalmente. Faltan solicitudes de memoria en R6; el riesgo aceptado es una colocación deficiente bajo presión de memoria. |
| `CKV_K8S_13` | Capacidad | 6 | R6 | Aceptado temporalmente. Faltan límites de memoria en R6; existe riesgo de agotar memoria del nodo y debe dimensionarse antes de promoción. |
| `CKV_K8S_14` | Cadena de suministro | 5 | A5 | Aceptado temporalmente. Las imágenes de aplicación usan `latest` para el ciclo local de build/carga; esto sacrifica reproducibilidad y debe sustituirse por una etiqueta inmutable antes de producción. |
| `CKV_K8S_15` | Cadena de suministro | 9 | W9 | Aceptado temporalmente. `IfNotPresent` permite usar imágenes precargadas en el registro/clúster local; se acepta el riesgo de reutilizar una imagen obsoleta. La política de promoción debe definir pull policy coherente con tags inmutables. |
| `CKV_K8S_20` | Aislamiento de runtime | 9 | W9 | Aceptado temporalmente. No se declara `allowPrivilegeEscalation: false`; aunque no se solicitan privilegios, falta la prohibición explícita y debe añadirse antes de un entorno compartido. |
| `CKV_K8S_22` | Aislamiento de runtime | 9 | W9 | Aceptado temporalmente. No se activa un root filesystem de solo lectura. nginx necesita caché/PID escribibles y PostgreSQL necesita datos temporales/persistentes; el endurecimiento posterior debe separar esas rutas en volúmenes escribibles. |
| `CKV_K8S_23` | Identidad de proceso | 9 | W9 | Aceptado temporalmente. Los cinco Dockerfiles de aplicación ya declaran usuario no root y fueron probados así, pero Helm no impone `runAsNonRoot`; las imágenes PostgreSQL tampoco quedan verificadas por el manifiesto. Falta enforcement en Kubernetes. |
| `CKV_K8S_28` | Capacidades Linux | 9 | W9 | Aceptado temporalmente. No se elimina explícitamente `NET_RAW`; no es requerido por la aplicación y debe eliminarse junto con el resto de capacidades antes de producción. |
| `CKV_K8S_29` | Aislamiento de pod | 9 | W9 | Aceptado temporalmente. Falta `securityContext` a nivel pod; el entorno local no aplica todavía una política común de UID/GID/FSGroup. |
| `CKV_K8S_30` | Aislamiento de contenedor | 9 | W9 | Aceptado temporalmente. Falta `securityContext` por contenedor; la mitigación del usuario en la imagen no reemplaza los controles de admisión del manifiesto. |
| `CKV_K8S_31` | Seccomp | 9 | W9 | Aceptado temporalmente. No se declara `RuntimeDefault`; depender del valor implícito del runtime no es suficiente para producción y deja menor defensa frente a syscalls peligrosas. |
| `CKV_K8S_35` | Secretos | 2 | S2 | Aceptado temporalmente. Los secretos llegan como variables de entorno, lo que facilita su exposición mediante inspección del proceso; las credenciales actuales son de desarrollo, pero deben montarse como archivos o integrarse con un gestor de secretos. |
| `CKV_K8S_37` | Capacidades Linux | 9 | W9 | Aceptado temporalmente. No se configura `capabilities.drop: ["ALL"]`; se acepta la superficie adicional únicamente en el clúster local y se requiere una lista mínima explícita para promoción. |
| `CKV_K8S_38` | Identidad Kubernetes | 9 | W9 | Aceptado temporalmente. Los workloads no necesitan llamar a la API de Kubernetes, pero todavía reciben el token de ServiceAccount por defecto; debe añadirse `automountServiceAccountToken: false`. |
| `CKV_K8S_40` | Identidad de proceso | 9 | W9 | Aceptado temporalmente. Los usuarios no root de las imágenes estándar usan UIDs bajos (`node` 1000, `nginx` 101 y el UID propio de PostgreSQL), no UIDs altos definidos por el despliegue; persiste el riesgo de colisión con UIDs del host. |
| `CKV_K8S_43` | Cadena de suministro | 9 | W9 | Aceptado temporalmente. Las imágenes no están fijadas por digest porque el flujo local todavía produce y carga tags; esto no garantiza identidad ni procedencia y debe cambiar a digests publicados en promoción. |
| `CKV_K8S_8` | Disponibilidad | 6 | P6 | Aceptado temporalmente. Falta liveness probe en P6; un proceso bloqueado puede permanecer levantado. Las rutas y umbrales deben definirse y probarse antes de EDT 5.1/producción. |
| `CKV_K8S_9` | Disponibilidad | 6 | P6 | Aceptado temporalmente. Falta readiness probe en P6; Kubernetes podría enviar tráfico antes de que el proceso o la base estén listos. Debe corregirse con una señal funcional real. |
| `CKV2_K8S_6` | Segmentación de red | 9 | N9 | Aceptado temporalmente. No existen NetworkPolicies en el namespace; el clúster local de un solo equipo tolera conectividad abierta, pero existe riesgo de movimiento lateral y producción requiere políticas default-deny con aperturas mínimas. |

## Límites de esta aceptación

- No se ejecutó un despliegue real del chart contra un clúster como parte de esta revisión estática.
- `terraform validate` sí fue satisfactorio en una copia temporal limpia con Terraform 1.9.8 y los providers fijados por el lockfile. El `terraform fmt -check` del árbol original detectó alineación preexistente en `terraform.tfvars`; no se modificó porque está fuera del cambio revisado.
- Checkov es análisis estático: no valida comportamiento de red, políticas de admisión, permisos efectivos del clúster ni la seguridad de las imágenes base.
- La aceptación caduca al cambiar el entorno de local/desarrollo a compartido, staging o producción, o al incorporar datos/secretos reales.
