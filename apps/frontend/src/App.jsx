import { useEffect, useState } from "react";

const API = "http://localhost:3000/api";

const SCREENS = {
  REGISTER: "register",
  HOME: "home",
  ORDERS: "orders",
};

export default function App() {
  const [screen, setScreen] = useState(SCREENS.HOME);

  const [users, setUsers] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);

  const [currentUser, setCurrentUser] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);

  const [newUser, setNewUser] = useState({ username: "", email: "" });
  const [error, setError] = useState("");

  // ---------------- SAFE FETCH ----------------
  async function safeFetch(url, setter) {
    try {
      const res = await fetch(url);
      const data = await res.json();

      if (Array.isArray(data)) {
        setter(data);
      } else if (Array.isArray(data.menu)) {
        setter(data.menu);
      } else {
        setter([]);
      }
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

      const res = await fetch(`${API}/users`);
      const list = await res.json();

      setUsers(list);

      const lastUser = list[list.length - 1];
      setCurrentUser(lastUser);

      setNewUser({ username: "", email: "" });
      setScreen(SCREENS.HOME);
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

    try {
      const res = await fetch(`${API}/restaurants/${restaurantId}/menu`);
      const data = await res.json();

      if (Array.isArray(data)) {
        setMenu(data);
      } else if (Array.isArray(data.menu)) {
        setMenu(data.menu);
      } else {
        setMenu([]);
      }
    } catch (err) {
      console.error(err);
      setMenu([]);
    }
  }

  // ---------------- ORDERS ----------------
  async function fetchOrders() {
    safeFetch(`${API}/orders`, setOrders);
  }

  async function createOrderFromMenu(item) {
    if (!currentUser || !selectedRestaurant) return;

    try {
      const payload = {
        userId: currentUser.id,
        restaurantId: selectedRestaurant.id,
        items: [item],
      };

      await fetch(`${API}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      fetchOrders();
      setScreen(SCREENS.ORDERS);
    } catch (err) {
      console.error(err);
      setError("Error creating order");
    }
  }

  useEffect(() => {
    fetchUsers();
    fetchRestaurants();
    fetchOrders();
  }, []);

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
              {currentUser && (
                <div className="brand__sub">
                  Usuario: {currentUser.username}
                </div>
              )}
            </div>
          </div>

          <div className="nav">
            <button className="nav__btn" onClick={() => setScreen(SCREENS.REGISTER)}>
              Registro
            </button>
            <button className="nav__btn" onClick={() => setScreen(SCREENS.HOME)}>
              Home
            </button>
            <button className="nav__btn" onClick={() => setScreen(SCREENS.ORDERS)}>
              Órdenes
            </button>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="card">
          <div className="card__body">

            {error && <p style={{ color: "red" }}>{error}</p>}

            {/* REGISTRO */}
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

            {/* HOME */}
            {screen === SCREENS.HOME && (
              <div className="grid grid--2">

                {/* RESTAURANTES */}
                <div className="panel">
                  <h3>Restaurantes</h3>

                  {!currentUser && (
                    <p className="muted">Crea un usuario para poder pedir</p>
                  )}

                  <ul>
                    {restaurants.map((r) => (
                      <li key={r.id}>
                        {r.name}
                        <button
                          className="btn"
                          onClick={() => {
                            setSelectedRestaurant(r);
                            loadMenu(r.id);
                          }}
                        >
                          Ver menú
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* MENÚ */}
                <div className="panel">
                  <h3>Menú</h3>

                  {!selectedRestaurant && (
                    <p className="muted">Selecciona un restaurante</p>
                  )}

                  {menu.map((item, i) => (
                    <div key={i} className="item">
                      <span>{item.name || item}</span>

                      <button
                        className="btn btn--primary"
                        disabled={!currentUser}
                        onClick={() => createOrderFromMenu(item)}
                      >
                        Agregar
                      </button>
                    </div>
                  ))}
                </div>

              </div>
            )}

            {/* ORDERS */}
            {screen === SCREENS.ORDERS && (
              <div className="panel">
                <h3>Órdenes</h3>

                <ul>
                  {orders.map((o) => {
                    const user = users.find(
                      (u) => u.id === (o.userId ?? o.user_id)
                    );

                    const restaurant = restaurants.find(
                      (r) => r.id === (o.restaurantId ?? o.restaurant_id)
                    );

                    return (
                      <li key={o.id}>
                        #{o.id} → {user?.username || o.userId || o.user_id} →{" "}
                        {restaurant?.name || o.restaurantId || o.restaurant_id}{" "}
                        <span className="badge">
                          {o.status || `Total: $${o.total ?? "?"}`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}