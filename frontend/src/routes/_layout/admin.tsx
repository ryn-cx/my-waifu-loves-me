import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { Suspense } from "react"

import { UsersService } from "@/client"
import AddUser from "@/components/Admin/AddUser"
import { columns } from "@/components/Admin/columns"
import type {
  UserPublicWithPending,
  UsersPublicWithPending,
  UserTableData,
} from "@/components/Admin/types"
import { DataTable } from "@/components/Common/DataTable"
import { PageHeader } from "@/components/Common/PageHeader"
import PendingUsers from "@/components/Pending/PendingUsers"
import useAuth from "@/hooks/useAuth"

function getUsersQueryOptions() {
  return {
    queryFn: async (): Promise<UsersPublicWithPending> =>
      UsersService.readUsers({ skip: 0, limit: 100_000 }),
    queryKey: ["users"],
  }
}

export const Route = createFileRoute("/_layout/admin")({
  component: Admin,
  beforeLoad: async () => {
    const user = await UsersService.readUserMe()
    if (!user.is_superuser) {
      throw redirect({
        to: "/",
      })
    }
  },
  head: () => ({
    meta: [
      {
        title: "Admin - FastAPI Template",
      },
    ],
  }),
})

function UsersTableContent() {
  const { user: currentUser } = useAuth()
  const { data: users } = useSuspenseQuery(getUsersQueryOptions())

  const tableData: UserTableData[] = users.data.map(
    (user: UserPublicWithPending) => ({
      ...user,
      isCurrentUser: currentUser?.id === user.id,
    }),
  )

  return (
    <DataTable
      columns={columns}
      data={tableData}
      rowClassName={(row) => (row.pending ? "opacity-50" : undefined)}
      storageKey="users-table"
    />
  )
}

function UsersTable() {
  return (
    <Suspense fallback={<PendingUsers />}>
      <UsersTableContent />
    </Suspense>
  )
}

function Admin() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users"
        description="Manage user accounts and permissions"
      >
        <AddUser />
      </PageHeader>
      <UsersTable />
    </div>
  )
}
