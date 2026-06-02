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

const SortableHeader = ({ label }: { label: string }) => (
  <div className={TABLE_HEADER_CELL_CLASS}>
    <div className="flex items-center gap-1">
      {label}
      <ChevronsUpDown className="size-3.5 opacity-50" />
    </div>
    <Input
      disabled
      placeholder="Search..."
      className={cn(TABLE_FILTER_INPUT_CLASS, "w-36")}
    />
    <div className="h-1" />
  </div>
)

const PendingItems = () => (
  <Table>
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="align-top">
          <SortableHeader label="ID" />
        </TableHead>
        <TableHead className="align-top">
          <SortableHeader label="Title" />
        </TableHead>
        <TableHead className="align-top">
          <SortableHeader label="Description" />
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
            <Skeleton className="h-4 w-64 font-mono" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-48" />
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

export default PendingItems
