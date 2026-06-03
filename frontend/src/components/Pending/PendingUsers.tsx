import { ChevronsUpDown } from "lucide-react"

import {
  TABLE_FILTER_INPUT_CLASS,
  TABLE_HEADER_CELL_CLASS,
} from "@/components/Common/tableStyles"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

const SortLabel = ({ label }: { label: string }) => (
  <div className="flex items-center gap-1">
    {label}
    <ChevronsUpDown className="size-3.5 opacity-50" />
  </div>
)

const TextHeader = ({ label }: { label: string }) => (
  <div className={TABLE_HEADER_CELL_CLASS}>
    <SortLabel label={label} />
    <Input
      disabled
      placeholder="Search..."
      className={cn(TABLE_FILTER_INPUT_CLASS, "w-36")}
    />
    <div className="h-1" />
  </div>
)

const SelectHeader = ({ label }: { label: string }) => (
  <div className={TABLE_HEADER_CELL_CLASS}>
    <SortLabel label={label} />
    <select
      disabled
      className={cn(TABLE_FILTER_INPUT_CLASS, "rounded border px-1")}
    >
      <option>All</option>
    </select>
  </div>
)

const PendingUsers = () => (
  <Table>
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="align-top">
          <TextHeader label="Full Name" />
        </TableHead>
        <TableHead className="align-top">
          <TextHeader label="Email" />
        </TableHead>
        <TableHead className="align-top">
          <SelectHeader label="Role" />
        </TableHead>
        <TableHead className="align-top">
          <SelectHeader label="Status" />
        </TableHead>
        <TableHead className="align-top">
          <div className={TABLE_HEADER_CELL_CLASS}>
            <span className="sr-only">Actions</span>
          </div>
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {Array.from({ length: 5 }).map((_, index) => (
        <TableRow key={index}>
          <TableCell>
            <Skeleton className="h-4 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-40" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-20 rounded-full" />
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <Skeleton className="size-2 rounded-full" />
              <Skeleton className="h-4 w-12" />
            </div>
          </TableCell>
          <TableCell>
            <div className="flex justify-end">
              <Skeleton className="size-8 rounded-md" />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
)

export default PendingUsers
