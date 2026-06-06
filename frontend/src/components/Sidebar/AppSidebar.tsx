import { Link, useNavigate, useRouterState } from "@tanstack/react-router"
import { ChevronDownIcon } from "lucide-react"

import { SidebarAppearance } from "@/components/Common/Appearance"
import { MediaSidebarItems } from "@/components/Media/MediaSidebarItems"
import { MissingSidebarItems } from "@/components/Media/MissingSidebarItems"
import { RelationsSidebarItems } from "@/components/Media/RelationsSidebarItems"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar"

const PAGES = [
  { to: "/", label: "Suggestions" },
  { to: "/relations", label: "Relations" },
  { to: "/missing", label: "Missing" },
] as const

export function AppSidebar() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isRelations = pathname.startsWith("/relations")
  const isMissing = pathname.startsWith("/missing")
  const currentPath = isMissing ? "/missing" : isRelations ? "/relations" : "/"
  const currentLabel =
    PAGES.find((page) => page.to === currentPath)?.label ?? "Suggestions"

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="p-4 pb-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {currentLabel}
                    <ChevronDownIcon className="size-4 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-40">
                  {PAGES.map((page) => (
                    <DropdownMenuItem key={page.to} asChild>
                      <Link to={page.to}>{page.label}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="min-h-0 flex-1">
          <SidebarGroupContent className="flex min-h-0 flex-1 flex-col">
            <ScrollArea className="h-full">
              {isMissing ? (
                <MissingSidebarItems />
              ) : isRelations ? (
                <RelationsSidebarItems />
              ) : (
                <MediaSidebarItems />
              )}
            </ScrollArea>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            navigate({
              to: currentPath,
              search: {
                ids: undefined,
                hideRelations: undefined,
                user: undefined,
                usePopularityCompensation: undefined,
                hideStatuses: undefined,
                hideNotOnList: undefined,
                useLinearScaling: undefined,
                minConnections: undefined,
                colorEdgesByTag: undefined,
                minStartYear: undefined,
                maxStartYear: undefined,
              },
            })
          }}
        >
          Reset
        </Button>
        <SidebarAppearance />
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar
