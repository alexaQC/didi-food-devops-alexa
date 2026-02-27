const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000/api";

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  // Intenta parsear JSON aunque venga vacío
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      (data && (data.error || data.message)) ||
      `Request failed (${res.status}) ${url}`;
    throw new Error(msg);
  }

  return data;
}

/** USERS **/
export async function getUsers() {
  return request("/users", { method: "GET" });
}

export async function createUser({ name, email }) {
  return request("/users", {
    method: "POST",
    body: JSON.stringify({ name, email }),
  });
}

/** RESTAURANTS (viven en el gateway) **/
export async function getRestaurants() {
  return request("/restaurants", { method: "GET" });
}

export async function getRestaurantMenu(restaurantId) {
  return request(`/restaurants/${restaurantId}/menu`, { method: "GET" });
}

/** ORDERS **/
export async function getOrders() {
  return request("/orders", { method: "GET" });
}

export async function createOrder({ userId, total }) {
  return request("/orders", {
    method: "POST",
    body: JSON.stringify({ userId, total }),
  });
}

/** PAYMENTS **/
export async function createPayment({ orderId, amount }) {
  // payments-service espera: { orderId, amount }
  return request("/payments", {
    method: "POST",
    body: JSON.stringify({ orderId, amount }),
  });
}

export { API_BASE };