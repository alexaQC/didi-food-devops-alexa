import { useEffect, useState } from "react";

const API = "http://localhost:3000/api";

const SCREENS = {
  REGISTER: "register",
  HOME: "home",
  CREATE_ORDER: "create-order",
  ORDERS: "orders",
};

export default function App() {
  const [screen, setScreen] = useState(SCREENS.HOME);

  const [users, setUsers] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  const [newUser, setNewUser] = useState({ username: "", email: "" });

  const [newOrder, setNewOrder] = useState({
    userId: "",
    restaurantId: "",
    items: [],
  });

  // ---------------- SAFE FETCH ----------------
  async function safeFetch(url, setter) {
    try {
      const res = await fetch(url);
      const data = await res.json();
      setter(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(`Error loading ${url}`);
      setter([]);
    }
  }

  // ---------------- USERS ----------------
  async function fetchUsers() {
    safeFetch(`${API}/users`, setUsers);
  }

  async function createUser() {
    try {
      await fetch(`${API}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });

      setNewUser({ username: "", email: "" });
      fetchUsers();
    } catch (err) {
      console.error(err);
      setError("Error creating user");
    }
  }

  // ---------------- RESTAURANTS ----------------
  async function fetchRestaurants() {
    safeFetch(`${API}/restaurants`, setRestaurants);
  }

  async function loadMenu(restaurantId) {
    if (!restaurantId) return;
    safeFetch(`${API}/restaurants/${restaurantId}/menu`, setMenu);
  }

  // ---------------- ORDERS ----------------
  async function fetchOrders() {
    safeFetch(`${API}/orders`, setOrders);
  }

  async function createOrder() {
    try {
      const payload = {
        ...newOrder,
        items: newOrder.items,
      };

      await fetch(`${API}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setNewOrder({ userId: "", restaurantId: "", items: [] });
      fetchOrders();
      setScreen(SCREENS.ORDERS);
    } catch (err) {
      console.error(err);
      setError("Error creating order");
    }
  }

  function toggleItem(item) {
    setNewOrder((prev) => ({
      ...prev,
      items: prev.items.includes(item)
        ? prev.items.filter((i) => i !== item)
        : [...prev.items, item],
    }));
  }

  useEffect(() => {
    fetchUsers();
    fetchRestaurants();
    fetchOrders();
  }, []);

  // ================= UI =================
  return (
    <>
      {/* NAVBAR */}
      <div className="topbar">
        <div className="container topbar__inner">
          <div className="brand">
            <div className="brand__logo">🍜</div>
            <div>
              <div className="brand__name">FinLab Eats</div>
              <div className="brand__sub">Gateway: {API}</div>
            </div>
          </div>

          <div className="nav">
            <button className="nav__btn" onClick={() => setScreen(SCREENS.REGISTER)}>Registro</button>
            <button className="nav__btn" onClick={() => setScreen(SCREENS.HOME)}>Home</button>
            <button className="nav__btn" onClick={() => setScreen(SCREENS.CREATE_ORDER)}>Crear pedido</button>
            <button className="nav__btn" onClick={() => setScreen(SCREENS.ORDERS)}>Órdenes</button>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="card">
          <div className="card__body">

            {error && <p style={{ color: "red" }}>{error}</p>}

            {/* ================= REGISTRO ================= */}
            {screen === SCREENS.REGISTER && (
              <div className="grid grid--2">
                <div className="panel">
                  <h3>Crear usuario</h3>

                  <input
                    className="input"
                    placeholder="username"
                    value={newUser.username}
                    onChange={(e) =>
                      setNewUser({ ...newUser, username: e.target.value })
                    }
                  />

                  <input
                    className="input"
                    placeholder="email"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                  />

                  <button className="btn btn--primary" onClick={createUser}>
                    Crear usuario
                  </button>
                </div>

                <div className="panel">
                  <h3>Usuarios</h3>
                  <ul>
                    {users.map((u) => (
                      <li key={u.id}>
                        {u.username} ({u.email})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* ================= HOME ================= */}
            {screen === SCREENS.HOME && (
              <div className="grid grid--2">
                <div className="panel">
                  <h3>Restaurantes</h3>
                  <ul>
                    {restaurants.map((r) => (
                      <li key={r.id}>
                        {r.name}
                        <button
                          className="btn"
                          onClick={() => loadMenu(r.id)}
                        >
                          Ver menú
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="panel">
                  <h3>Menú</h3>
                  <ul>
                    {menu.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* ================= CREATE ORDER ================= */}
            {screen === SCREENS.CREATE_ORDER && (
              <div className="grid grid--2">
                <div className="panel">
                  <h3>Crear pedido</h3>

                  <label>Usuario</label>
                  <select
                    className="input"
                    value={newOrder.userId}
                    onChange={(e) =>
                      setNewOrder({ ...newOrder, userId: e.target.value })
                    }
                  >
                    <option value="">Selecciona usuario</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username}
                      </option>
                    ))}
                  </select>

                  <label>Restaurante</label>
                  <select
                    className="input"
                    value={newOrder.restaurantId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setNewOrder({ ...newOrder, restaurantId: id, items: [] });
                      loadMenu(id);
                    }}
                  >
                    <option value="">Selecciona restaurante</option>
                    {restaurants.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>

                  <label>Items</label>
                  <div className="panel">
                    {menu.map((item, i) => (
                      <div key={i}>
                        <input
                          type="checkbox"
                          checked={newOrder.items.includes(item)}
                          onChange={() => toggleItem(item)}
                        />
                        {item}
                      </div>
                    ))}
                  </div>

                  <button className="btn btn--primary" onClick={createOrder}>
                    Crear pedido
                  </button>
                </div>

                <div className="panel">
                  <h3>Resumen</h3>
                  <pre>{JSON.stringify(newOrder, null, 2)}</pre>
                </div>
              </div>
            )}

            {/* ================= ORDERS ================= */}
            {screen === SCREENS.ORDERS && (
              <div className="panel">
                <h3>Órdenes</h3>
                <ul>
                  {orders.map((o) => (
                    <li key={o.id}>
                      #{o.id} → user {o.userId} → restaurant {o.restaurantId} →{" "}
                      <span className="badge">{o.status || "created"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}