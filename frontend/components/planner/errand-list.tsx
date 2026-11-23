"use client"

import { ErrandItem } from "@/components/planner/errand-item"
import type { Errand } from "@/lib/types"

interface ErrandListProps {
  errands: Errand[]
  onUpdate: (errand: Errand) => void
  onRemove: (id: string) => void
  onEdit: (errand: Errand) => void
  onReorder: (errands: Errand[]) => void
}

export function ErrandList({
  errands,
  onUpdate,
  onRemove,
  onEdit,
  onReorder,
}: ErrandListProps) {
  const handleReorder = (newList: Errand[]) => {
    const reindexed = newList.map((e, i) => ({ ...e, order: i + 1 }))
    onReorder(reindexed)
  }

  if (errands.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <p>No errands yet. Add one above.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {errands.map((errand, index) => (
        <ErrandItem
          key={errand.id}
          errand={errand}
          index={index}
          onUpdate={onUpdate}
          onRemove={onRemove}
          onEdit={onEdit}
        />
      ))}
    </div>
  )
}
