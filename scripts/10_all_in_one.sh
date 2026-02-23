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
TAG="${TAG:-$(date +%s)}"

echo "== Finlab: full lab run =="
echo "Cluster:      $CLUSTER"
echo "Namespace:    $NAMESPACE"
echo "Host registry (push):     $HOST_REG"
echo "Internal registry (pull): $INTERNAL_REG"
echo "Tag:          $TAG"
echo

# 0) Validación previa
if [ -x "./scripts/06_validate_env.sh" ]; then
    bash ./scripts/06_validate_env.sh
else
  warn "No existe ./scripts/06_validate_env.sh o no es ejecutable. Continuaré."
fi

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

# 3) Build & push images
echo
echo "== Build & push images to host registry =="

[ -d "./apps/backend" ] || fail "No existe ./apps/backend"
[ -d "./apps/frontend" ] || fail "No existe ./apps/frontend"
[ -d "./apps/users-service" ] || fail "No existe ./apps/users-service"
[ -d "./apps/orders-service" ] || fail "No existe ./apps/orders-service"
[ -d "./apps/payments-service" ] || fail "No existe ./apps/payments-service"

docker build -t "${HOST_REG}/${NAMESPACE}/backend:${TAG}" ./apps/backend
docker build -t "${HOST_REG}/${NAMESPACE}/frontend:${TAG}" ./apps/frontend
docker build -t "${HOST_REG}/${NAMESPACE}/users-service:${TAG}" ./apps/users-service
docker build -t "${HOST_REG}/${NAMESPACE}/orders-service:${TAG}" ./apps/orders-service
docker build -t "${HOST_REG}/${NAMESPACE}/payments-service:${TAG}" ./apps/payments-service

docker push "${HOST_REG}/${NAMESPACE}/backend:${TAG}"
docker push "${HOST_REG}/${NAMESPACE}/frontend:${TAG}"
docker push "${HOST_REG}/${NAMESPACE}/users-service:${TAG}"
docker push "${HOST_REG}/${NAMESPACE}/orders-service:${TAG}"
docker push "${HOST_REG}/${NAMESPACE}/payments-service:${TAG}"

ok "Imágenes publicadas en ${HOST_REG}"

# 3.1) Verificar registry desde nodo
echo "== DNS check (registry inside cluster) =="

docker exec "k3d-${CLUSTER}-server-0" sh -c "nslookup ${K3D_REG_NAME} >/dev/null" \
  || fail "El nodo no puede resolver '${K3D_REG_NAME}'"

docker exec "k3d-${CLUSTER}-server-0" sh -c "wget -qO- http://${K3D_REG_NAME}:5000/v2/ >/dev/null" \
  || fail "El nodo no puede acceder al registry interno"

# 4) Deploy con Helm
echo
echo "== Deploy via Helm (force internal registry) =="

[ -d "./infra/helm/finlab" ] || fail "No existe ./infra/helm/finlab (chart)"

helm upgrade --install finlab ./infra/helm/finlab -n "$NAMESPACE" --create-namespace \
  --set registry="$INTERNAL_REG" \
  --set backend.image="${NAMESPACE}/backend" \
  --set backend.tag="$TAG" \
  --set frontend.image="${NAMESPACE}/frontend" \
  --set frontend.tag="$TAG" \
  --set usersService.image="${NAMESPACE}/users-service" \
  --set usersService.tag="$TAG" \
  --set ordersService.image="${NAMESPACE}/orders-service" \
  --set ordersService.tag="$TAG" \
  --set paymentsService.image="${NAMESPACE}/payments-service" \
  --set paymentsService.tag="$TAG"

# 5) Esperar rollouts
echo
echo "== Wait rollout =="

kubectl -n "$NAMESPACE" rollout status deploy/backend --timeout=180s
kubectl -n "$NAMESPACE" rollout status deploy/frontend --timeout=180s
kubectl -n "$NAMESPACE" rollout status deploy/users-service --timeout=180s
kubectl -n "$NAMESPACE" rollout status deploy/orders-service --timeout=180s
kubectl -n "$NAMESPACE" rollout status deploy/payments-service --timeout=180s

echo
echo "== Current state =="
kubectl -n "$NAMESPACE" get deploy,svc,pods -o wide

# 6) Self-healing check
echo
echo "== Self-healing check: delete one backend pod =="
BACKEND_POD="$(kubectl -n "$NAMESPACE" get pod -l app=backend -o jsonpath='{.items[0].metadata.name}')"
kubectl -n "$NAMESPACE" delete pod "$BACKEND_POD" >/dev/null
kubectl -n "$NAMESPACE" rollout status deploy/backend
ok "Self-healing validado"

echo
echo "== Done =="
echo "Siguiente:"
echo "  ./scripts/05-1_backend_port_forward.sh"
echo "  ./scripts/05-0_frontend_port_forward.sh"
echo "  Abrir: http://localhost:8080"