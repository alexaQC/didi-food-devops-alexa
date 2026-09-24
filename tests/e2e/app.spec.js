import { test, expect } from "@playwright/test";

test("loads home and shows FinLab Eats branding", async ({ page }) => {
  await page.goto("/");

  // "FinLab Eats" vive en un <div class="brand__name">, no es un heading
  await expect(page.getByText("FinLab Eats")).toBeVisible();

  // La pantalla inicial (AUTH) sí trae headings reales (<h3>)
  await expect(
    page.getByRole("heading", { name: "Iniciar sesión" })
  ).toBeVisible();
});

test("register, browse a restaurant menu and add a product to the cart", async ({
  page,
}) => {
  await page.goto("/");

  // No hay usuario sembrado en users-db: nos registramos desde la UI.
  // "Crear y entrar" hace POST /api/users y loguea automáticamente.
  const unique = Date.now();
  await page.getByPlaceholder("name").fill(`E2E Tester ${unique}`);
  await page.getByPlaceholder("email").fill(`e2e-${unique}@example.com`);
  await page.getByRole("button", { name: "Crear y entrar" }).click();

  // Home > panel Restaurantes (datos fijos en memoria del gateway)
  const restaurantsPanel = page
    .locator(".panel")
    .filter({ has: page.getByRole("heading", { name: "Restaurantes" }) });

  await expect(restaurantsPanel.getByText("Taquería Don Pepe")).toBeVisible();

  await restaurantsPanel
    .locator("li")
    .filter({ hasText: "Taquería Don Pepe" })
    .getByRole("button", { name: "Ver menú" })
    .click();

  // Menú del restaurante seleccionado
  const menuPanel = page
    .locator(".panel")
    .filter({ has: page.getByRole("heading", { name: "Menú" }) });

  const menuItem = menuPanel
    .locator(".item")
    .filter({ hasText: "Tacos al pastor" });

  await expect(menuItem).toBeVisible();
  await menuItem.getByRole("button", { name: "Agregar" }).click();

  // El carrito debe reflejar el producto recién agregado
  const cartPanel = page
    .locator(".panel")
    .filter({ has: page.getByRole("heading", { name: "Carrito" }) });

  await expect(cartPanel.getByText("Tacos al pastor")).toBeVisible();
  await expect(cartPanel.getByText(/x 1/)).toBeVisible();
});
