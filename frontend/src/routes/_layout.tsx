import { createFileRoute, Outlet } from "@tanstack/react-router"

import { Footer } from "@/components/Common/Footer"
import AppSidebar from "@/components/Sidebar/AppSidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export const Route = createFileRoute("/_layout")({
  component: Layout,
})

function Layout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarTrigger className="fixed top-2 left-2 z-50 bg-background/80 backdrop-blur-sm shadow-sm transition-[left] duration-200 ease-linear peer-data-[state=expanded]:left-[calc(var(--sidebar-width)+0.5rem)]" />
      <SidebarInset>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Layout
