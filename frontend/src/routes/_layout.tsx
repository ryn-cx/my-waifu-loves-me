// TODO: Validate File
import { Flex } from "@chakra-ui/react"
import { createFileRoute, Outlet } from "@tanstack/react-router"

import Sidebar from "@/components/Common/Sidebar"

export const Route = createFileRoute("/_layout")({
  component: Layout,
})

function Layout() {
  return (
    <Flex direction="column" h="100vh">
      <Flex flex="1" overflow="hidden">
        <Sidebar />
        <Flex flex="1" direction="column" p={4} overflowY="auto">
          <Outlet />
        </Flex>
      </Flex>
    </Flex>
  )
}

export default Layout
