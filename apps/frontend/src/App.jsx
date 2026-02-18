import { useEffect, useState } from "react";

const API = "http://localhost:3000/api";

function App() {
  const [restaurants, setRestaurants] = useState([]);
  const [menu, setMenu] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  async function fetchRestaurants() {
    const res = await fetch(`${API}/restaurants`);
    const data = await res.json();
    setRestaurants(data);
  }

  async function loadMenu(restaurant) {
    const res = await fetch(`${API}/restaurants/${restaurant.id}/menu`);
    const data = await res.json();
    setSelectedRestaurant(data.restaurant);
    setMenu(data.menu);
  }

  async function orderItem(itemName) {
    await fetch(`${API}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        item: itemName,
        restaurant: selectedRestaurant.name,
      }),
    });

    alert("Pedido enviado 🚀");
  }

  return (
    <div style={{ padding: "20px", fontFamily: "system-ui" }}>
      <h1>Didi Food (básico)</h1>

      <h2>Restaurantes</h2>
      <ul>
        {restaurants.map((r) => (
          <li key={r.id}>
            <button onClick={() => loadMenu(r)}>
              {r.name} ({r.category})
            </button>
          </li>
        ))}
      </ul>

      {selectedRestaurant && (
        <>
          <h2>Menú de {selectedRestaurant.name}</h2>
          <ul>
            {menu.map((item) => (
              <li key={item.id}>
                {item.name} - ${item.price}{" "}
                <button onClick={() => orderItem(item.name)}>Pedir</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default App;