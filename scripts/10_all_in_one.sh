# scripts/10_finlab_all.sh
#!/usr/bin/env bash
set -euo pipefail

fail() { echo "ERROR: $*" >&2; exit 1; }
warn() { echo "WARN: $*" >&2; }
ok()   { echo "OK: $*"; }

# Parámetros (Finlab standard)
CLUSTER="finlab"
NAMESPACE="finlab"
HOST_REG="localhost:5001"                 # push target desde WSL
K3D_REG_NAME="finlab-registry"
INTERNAL_REG="${K3D_REG_NAME}:5000"       # pull target desde nodos k3d
TAG="${TAG:-0.1.0}"                       # permite override: TAG=0.1.1 ./scripts/10_finlab_all.sh

echo "== Finlab: full lab run =="
echo "Cluster:      $CLUSTER"
echo "Namespace:    $NAMESPACE"
echo "Host registry (push):     $HOST_REG"
echo "Internal registry (pull): $INTERNAL_REG"
echo "Tag:          $TAG"
echo

# 0) Validación previa (rápida, sin destruir nada)
if [ -x "./scripts/06_validate_env.sh" ]; then
    bash ./scripts/06_validate_env.sh
else
  warn "No existe ./scripts/06_validate_env.sh o no es ejecutable. Continuaré, pero es recomendable validarlo."
fi

# Check docker again (hard requirement)
docker ps >/dev/null 2>&1 || fail "Docker no accesible sin sudo. Ejecuta ./scripts/07_fix_permissions.sh"

# 1) Reset cluster
echo
echo "== Reset cluster =="
k3d cluster delete "$CLUSTER" >/dev/null 2>&1 || true

# 2) Create cluster + registry
echo
echo "== Create cluster (k3d) =="
k3d cluster create "$CLUSTER" \
  --agents 2 \
  --registry-create "${K3D_REG_NAME}:0.0.0.0:5001"

kubectl create ns "$NAMESPACE" >/dev/null 2>&1 || true
ok "Cluster creado"

# 3) Build & push images (host registry)
echo
echo "== Build & push images to host registry =="
[ -d "./apps/backend" ] || fail "No existe ./apps/backend. Ejecuta desde la raíz del repo."
[ -d "./apps/frontend" ] || fail "No existe ./apps/frontend. Ejecuta desde la raíz del repo."

docker build -t "${HOST_REG}/${NAMESPACE}/backend:${TAG}" ./apps/backend
docker build -t "${HOST_REG}/${NAMESPACE}/frontend:${TAG}" ./apps/frontend
docker build -t "${HOST_REG}/${NAMESPACE}/users-service:${TAG}" ./apps/users-service
docker build -t "${HOST_REG}/${NAMESPACE}/orders-service:${TAG}" ./apps/orders-service

docker push "${HOST_REG}/${NAMESPACE}/users-service:${TAG}"
docker push "${HOST_REG}/${NAMESPACE}/orders-service:${TAG}"
docker push "${HOST_REG}/${NAMESPACE}/backend:${TAG}"
docker push "${HOST_REG}/${NAMESPACE}/frontend:${TAG}"
ok "Imágenes publicadas en ${HOST_REG}"

echo "== DNS check (registry must resolve inside cluster) =="
docker exec "k3d-${CLUSTER}-server-0" sh -c "nslookup ${K3D_REG_NAME} >/dev/null" \
  || { echo "ERROR: El nodo no puede resolver '${K3D_REG_NAME}'. Pull fallará."; exit 50; }

docker exec "k3d-${CLUSTER}-server-0" sh -c "wget -qO- http://${K3D_REG_NAME}:5000/v2/ >/dev/null" \
  || { echo "ERROR: El nodo no puede acceder a http://${K3D_REG_NAME}:5000/v2/. Pull fallará."; exit 51; }

# 4) Deploy with Helm (force internal registry for pulls)
echo
echo "== Deploy via Helm (force internal registry) =="
[ -d "./infra/helm/finlab" ] || fail "No existe ./infra/helm/finlab (chart)."

helm upgrade --install finlab ./infra/helm/finlab -n "$NAMESPACE" --create-namespace \
  --set registry="$INTERNAL_REG" \
  --set backend.image="${NAMESPACE}/backend" \
  --set backend.tag="$TAG" \
  --set frontend.image="${NAMESPACE}/frontend" \
  --set frontend.tag="$TAG" \
  --set ordersService.image="${NAMESPACE}/orders-service" \
  --set ordersService.tag="$TAG" 

echo
echo "== Wait rollout =="
kubectl -n "$NAMESPACE" rollout status deploy/backend --timeout=180s || {
  echo "Rollout backend falló. Diagnóstico:"
  kubectl -n "$NAMESPACE" get pods -o wide || true
  kubectl -n "$NAMESPACE" get events --sort-by=.lastTimestamp | tail -n 40 || true
  kubectl -n "$NAMESPACE" describe pod -l app=backend | egrep -i "Image:|Failed|pull|Back-off|Err" || true
  exit 60
}

kubectl -n "$NAMESPACE" rollout status deploy/frontend --timeout=180s

echo
echo "== Current state =="
kubectl -n "$NAMESPACE" get deploy,svc,pods -o wide

# 5) Quick self-healing check (non-destructive-ish)
echo
echo "== Self-healing check: delete one backend pod =="
BACKEND_POD="$(kubectl -n "$NAMESPACE" get pod -l app=backend -o jsonpath='{.items[0].metadata.name}')"
kubectl -n "$NAMESPACE" delete pod "$BACKEND_POD" >/dev/null
kubectl -n "$NAMESPACE" rollout status deploy/backend
ok "Self-healing validado"

echo
echo "== Done =="
echo "Siguiente:"
echo "  - Port-forward: ./scripts/05_port_forward.sh"
echo "  - HPA: habilitar metrics-server y hpa.enabled=true (si tu chart lo incluye)"
echo "  - E2E: tests/e2e"
echo "  - Perf: k6 run tests/perf/smoke.js"
