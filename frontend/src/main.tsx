import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import ReactDOM from "react-dom/client"
import { OpenAPI } from "./client"
import { ThemeProvider } from "./components/theme-provider"
import { Toaster } from "./components/ui/sonner"
import "./index.css"
import { routeTree } from "./routeTree.gen"

// Extract AniList token from URL fragment (implicit grant OAuth)
const hash = window.location.hash
if (hash.includes("access_token")) {
  const params = new URLSearchParams(hash.substring(1))
  const anilistToken = params.get("access_token")
  if (anilistToken) {
    localStorage.setItem("anilist_token", anilistToken)
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    )
  }
}

OpenAPI.BASE = import.meta.env.VITE_API_URL
OpenAPI.HEADERS = async () => {
  const anilistToken = localStorage.getItem("anilist_token")
  return anilistToken ? { "X-Anilist-Token": anilistToken } : {}
}

const queryClient = new QueryClient()

const router = createRouter({ routeTree })
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster richColors closeButton />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
