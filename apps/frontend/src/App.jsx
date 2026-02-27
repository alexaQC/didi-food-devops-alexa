import { useEffect, useMemo, useState } from "react";
import {
  API_BASE,
  createUser,
  getRestaurantMenu,
  getRestaurants,
  getUsers,
  createOrder,
  createPayment,
  getOrders,
} from "./api";
import { useCart } from "./context/CartContext";

const SCREENS = {
  AUTH: "auth",
  HOME: "home",
  ORDERS: "orders",
};

export default function App() {
  const [screen, setScreen] = useState(SCREENS.AUTH);

  const [users, setUsers] = useState([]);
  const [restaurants, setRestaurants] = useState([]);

  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);

  const [currentUser, setCurrentUser] = useState(null);

  const [form, setForm] = useState({ name: "", email: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { items: cartItems, addItem, removeItem, clearCart, total } = useCart();

  const [checkoutResult, setCheckoutResult] = useState(null);
  const [paying, setPaying] = useState(false);

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const isLoggedIn = useMemo(() => !!currentUser?.id, [currentUser]);

  async function boot() {
    setError("");
    setLoading(true);
    try {
      const [u, r] = await Promise.all([getUsers(), getRestaurants()]);
      setUsers(Array.isArray(u) ? u : []);
      setRestaurants(Array.isArray(r) ? r : []);
    } catch (e) {
      setError(e.message || "Error cargando datos iniciales");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    boot();
  }, []);

  async function onCreateUser() {
    setError("");
    setLoading(true);
    try {
      const created = await createUser({
        name: form.name.trim(),
        email: form.email.trim(),
      });

      const u = await getUsers();
      setUsers(Array.isArray(u) ? u : []);

      setCurrentUser(created);
      setScreen(SCREENS.HOME);

      setForm({ name: "", email: "" });
    } catch (e) {
      setError(e.message || "Error creando usuario");
    } finally {
      setLoading(false);
    }
  }

  async function onSelectRestaurant(r) {
    setError("");
    setSelectedRestaurant(r);
    setMenu([]);

    try {
      const data = await getRestaurantMenu(r.id);
      const items = Array.isArray(data?.menu) ? data.menu : [];
      setMenu(items);
    } catch (e) {
      setError(e.message || "Error cargando menú");
    }
  }

  function logout() {
    setCurrentUser(null);
    setScreen(SCREENS.AUTH);
    setSelectedRestaurant(null);
    setMenu([]);
    setCheckoutResult(null);
    setOrders([]);
  }

  async function handleCheckout() {
    if (!currentUser?.id) {
      setError("Debes iniciar sesión para pagar");
      return;
    }

    if (!cartItems.length) {
      setError("El carrito está vacío");
      return;
    }

    setError("");
    setPaying(true);

    try {
      // 1) Crear orden
      const order = await createOrder({
        userId: currentUser.id,
        total,
      });

      const orderId = order.id;

      // 2) Crear pago
      await createPayment({
        orderId,
        amount: total,
      });

      // 3) Limpiar carrito
      clearCart();

      // 4) Resultado
      setCheckoutResult({
        orderId,
        total,
        status: "pagado",
      });
    } catch (e) {
      setError(e.message || "Error en el pago");
    } finally {
      setPaying(false);
    }
  }

  async function loadOrders() {
    if (!currentUser?.id) {
      setError("Debes iniciar sesión");
      setScreen(SCREENS.AUTH);
      return;
    }

    setError("");
    setLoadingOrders(true);

    try {
      const data = await getOrders();

      // orders-service devuelve user_id (snake_case)
      const myOrders = Array.isArray(data)
        ? data.filter((o) => Number(o.user_id) === Number(currentUser.id))
        : [];

      setOrders(myOrders);
      setScreen(SCREENS.ORDERS);
    } catch (e) {
      setError(e.message || "Error cargando órdenes");
    } finally {
      setLoadingOrders(false);
    }
  }

  return (
    <>
      {/* TOPBAR */}
      <div className="topbar">
        <div className="container topbar__inner">
          <div className="brand">
            <div className="brand__logo">🍜</div>
            <div>
              <div className="brand__name">FinLab Eats</div>
              <div className="brand__sub">Gateway: {API_BASE}</div>

              {currentUser && (
                <div className="brand__sub">
                  Usuario: {currentUser.name} ({currentUser.email})
                </div>
              )}
            </div>
          </div>

          <div className="nav">
            <button className="nav__btn" onClick={() => setScreen(SCREENS.AUTH)}>
              Auth
            </button>
            <button className="nav__btn" onClick={() => setScreen(SCREENS.HOME)}>
              Home
            </button>
            <button className="nav__btn" onClick={loadOrders}>
              Órdenes
            </button>

            {isLoggedIn && (
              <button className="nav__btn" onClick={logout}>
                Cerrar sesión
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container">
        <div className="card">
          <div className="card__body">
            {loading && <p className="muted">Cargando…</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}

            {/* AUTH */}
            {screen === SCREENS.AUTH && (
              <div className="grid grid--2">
                <div className="panel">
                  <h3>Crear usuario</h3>

                  <input
                    className="input"
                    placeholder="name"
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                  />

                  <input
                    className="input"
                    placeholder="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />

                  <button
                    className="btn btn--primary"
                    disabled={loading}
                    onClick={onCreateUser}
                  >
                    Crear y entrar
                  </button>

                  <p className="muted" style={{ marginTop: 10 }}>
                    *Esto manda <code>{`{ name, email }`}</code> a{" "}
                    <code>/api/users</code>
                  </p>
                </div>

                <div className="panel">
                  <h3>Iniciar sesión</h3>
                  <p className="muted">
                    Selecciona un usuario ya creado para “loguearte” (mock).
                  </p>

                  <ul>
                    {users.map((u) => (
                      <li key={u.id} style={{ marginBottom: 8 }}>
                        <b>{u.name}</b> ({u.email}){" "}
                        <button
                          className="btn"
                          onClick={() => {
                            setCurrentUser(u);
                            setCheckoutResult(null);
                            setScreen(SCREENS.HOME);
                          }}
                        >
                          Entrar
                        </button>
                      </li>
                    ))}
                  </ul>

                  {!users.length && (
                    <p className="muted">No hay usuarios todavía.</p>
                  )}
                </div>
              </div>
            )}

            {/* HOME */}
            {screen === SCREENS.HOME && (
              <div className="grid grid--3">
                {/* RESTAURANTES */}
                <div className="panel">
                  <h3>Restaurantes</h3>

                  <ul>
                    {restaurants.map((r) => (
                      <li key={r.id} style={{ marginBottom: 8 }}>
                        <b>{r.name}</b>{" "}
                        <span className="muted">({r.category})</span>{" "}
                        <button
                          className="btn"
                          onClick={() => onSelectRestaurant(r)}
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

                  {selectedRestaurant && (
                    <p className="muted">
                      Restaurante: <b>{selectedRestaurant.name}</b>
                    </p>
                  )}

                  {menu.map((item) => (
                    <div key={item.id} className="item">
                      <div>
                        <div>
                          <b>{item.name}</b>
                        </div>
                        <div className="muted">
                          ${Number(item.price).toFixed(2)}
                        </div>
                      </div>

                      <button className="btn" onClick={() => addItem(item)}>
                        Agregar
                      </button>
                    </div>
                  ))}

                  {selectedRestaurant && menu.length === 0 && (
                    <p className="muted">
                      Este restaurante no tiene menú (o no cargó).
                    </p>
                  )}
                </div>

                {/* CARRITO */}
                <div className="panel">
                  <h3>Carrito</h3>

                  {!cartItems.length && (
                    <p className="muted">El carrito está vacío</p>
                  )}

                  {cartItems.map((item) => (
                    <div key={item.id} className="item">
                      <div>
                        <b>{item.name}</b>
                        <div className="muted">
                          ${Number(item.price).toFixed(2)} x {item.quantity}
                        </div>
                      </div>

                      <div>
                        <button
                          className="btn"
                          onClick={() => removeItem(item.id)}
                        >
                          −
                        </button>
                      </div>
                    </div>
                  ))}

                  {cartItems.length > 0 && (
                    <>
                      <hr />
                      <p>
                        <b>Total:</b> ${total.toFixed(2)}
                      </p>

                      <button
                        className="btn btn--primary"
                        onClick={handleCheckout}
                        disabled={paying}
                      >
                        {paying ? "Procesando..." : "Confirmar pago"}
                      </button>
                    </>
                  )}

                  {checkoutResult && (
                    <div style={{ marginTop: 12 }}>
                      <hr />
                      <p>✅ Orden creada</p>
                      <p>
                        <b>Order ID:</b> {checkoutResult.orderId}
                      </p>
                      <p>
                        <b>Total:</b> ${checkoutResult.total.toFixed(2)}
                      </p>
                      <p>
                        <b>Estado:</b> {checkoutResult.status}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ORDERS */}
            {screen === SCREENS.ORDERS && (
              <div className="panel">
                <h3>Mis órdenes</h3>

                {loadingOrders && <p className="muted">Cargando órdenes...</p>}

                {!orders.length && !loadingOrders && (
                  <p className="muted">No tienes órdenes todavía.</p>
                )}

                {orders.map((o) => (
                  <div key={o.id} className="item">
                    <div>
                      <b>Orden #{o.id}</b>
                      <div className="muted">
                        Total: ${Number(o.total).toFixed(2)}
                      </div>
                      <div className="muted">
                        Estado: {o.status ? "pagado" : "pendiente"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}