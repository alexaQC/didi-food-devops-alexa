#!/usr/bin/env bash

URL="http://localhost:3000/api/orders"

PAYLOAD='{
  "user_id": 1,
  "restaurant_id": 1,
  "items": [
    { "name": "Pizza", "price": 100, "quantity": 1 }
  ],
  "total": 100
}'

CONCURRENCY=20   # requests paralelas
DURATION=60      # segundos de carga continua

echo "Iniciando prueba de carga contra /api/orders"
echo "Concurrency: $CONCURRENCY"
echo "Duración: $DURATION segundos"
echo

end=$((SECONDS + DURATION))

while [ $SECONDS -lt $end ]; do
  for i in $(seq 1 $CONCURRENCY); do
    curl -s -X POST "$URL" \
      -H "Content-Type: application/json" \
      -d "$PAYLOAD" >/dev/null &
  done
  wait
done

echo
echo "Prueba de carga finalizada"