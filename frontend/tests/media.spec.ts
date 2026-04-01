import { expect, test } from "@playwright/test"

test("Dashboard shows empty state message", async ({ page }) => {
  await page.goto("/")
  await expect(
    page.getByText("Use the sidebar to search for anime or add by ID"),
  ).toBeVisible()
})

test("Sidebar contains media graph controls", async ({ page }) => {
  await page.goto("/")

  // Check that the Media Graph section exists in the sidebar
  await expect(page.getByText("Media Graph")).toBeVisible()

  // Check AniList Username input
  await expect(page.getByLabel("AniList Username")).toBeVisible()

  // Check Fetch User List button
  await expect(
    page.getByRole("button", { name: "Fetch User List" }),
  ).toBeVisible()

  // Check search input
  await expect(page.getByLabel("Search Anime/Manga")).toBeVisible()

  // Check Search button
  await expect(page.getByRole("button", { name: "Search" })).toBeVisible()
})

test("Sidebar shows graph filter checkboxes", async ({ page }) => {
  await page.goto("/")

  await expect(page.getByLabel("Popularity Compensation")).toBeVisible()
  await expect(page.getByLabel("Linear Node Scaling")).toBeVisible()
  await expect(page.getByLabel("Color Edges by Tag")).toBeVisible()
})

test("Sidebar shows status filter checkboxes", async ({ page }) => {
  await page.goto("/")

  await expect(page.getByText("Hide Status:")).toBeVisible()
  await expect(page.getByLabel("Not on List")).toBeVisible()
  await expect(page.getByLabel("Current")).toBeVisible()
  await expect(page.getByLabel("Planning")).toBeVisible()
  await expect(page.getByLabel("Completed")).toBeVisible()
  await expect(page.getByLabel("Paused")).toBeVisible()
  await expect(page.getByLabel("Dropped")).toBeVisible()
  await expect(page.getByLabel("Repeating")).toBeVisible()
})

test("Can toggle between search and ID mode", async ({ page }) => {
  await page.goto("/")

  // Should start in search mode
  await expect(page.getByLabel("Search Anime/Manga")).toBeVisible()

  // Click "Use ID" to switch
  await page.getByRole("button", { name: "Use ID" }).click()

  // Should now show ID input
  await expect(page.getByLabel("Add by ID")).toBeVisible()

  // Click "Use Search" to switch back
  await page.getByRole("button", { name: "Use Search" }).click()

  // Should be back to search mode
  await expect(page.getByLabel("Search Anime/Manga")).toBeVisible()
})

test("Reset button clears URL parameters", async ({ page }) => {
  // Navigate with some params
  await page.goto("/?usePopularityCompensation=true&minConnections=3")

  // Click reset
  await page.getByRole("button", { name: "Reset" }).click()

  // URL should be clean
  await expect(page).toHaveURL("/")
})

test("Minimum Connections input updates URL", async ({ page }) => {
  await page.goto("/")

  const input = page.getByLabel("Minimum Connections")
  await input.fill("5")

  // URL should contain the parameter
  await expect(page).toHaveURL(/minConnections=5/)
})

test("Min Release Year input updates URL", async ({ page }) => {
  await page.goto("/")

  const input = page.getByLabel("Min Release Year")
  await input.fill("2020")

  await expect(page).toHaveURL(/minStartYear=2020/)
})

test("Max Release Year input updates URL", async ({ page }) => {
  await page.goto("/")

  const input = page.getByLabel("Max Release Year")
  await input.fill("2024")

  await expect(page).toHaveURL(/maxStartYear=2024/)
})

test("Checking Popularity Compensation updates URL", async ({ page }) => {
  await page.goto("/")

  await page.getByLabel("Popularity Compensation").click()

  await expect(page).toHaveURL(/usePopularityCompensation=true/)
})

test("Checking Linear Node Scaling updates URL", async ({ page }) => {
  await page.goto("/")

  await page.getByLabel("Linear Node Scaling").click()

  await expect(page).toHaveURL(/useLinearScaling=true/)
})
