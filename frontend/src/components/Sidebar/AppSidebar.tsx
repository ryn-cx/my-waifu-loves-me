import { useNavigate } from "@tanstack/react-router"

import { SidebarAppearance } from "@/components/Common/Appearance"
import { MediaSidebarItems } from "@/components/Media/MediaSidebarItems"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar"

export function AppSidebar() {
  const navigate = useNavigate()

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarContent>
        <SidebarGroup className="min-h-0 flex-1">
          <SidebarGroupContent className="flex min-h-0 flex-1 flex-col">
            <ScrollArea className="h-full">
              <MediaSidebarItems />
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
              to: "/",
              search: {
                ids: undefined,
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
