import { useState } from 'react'
import type { DragEvent, ReactNode } from 'react'

/** Drag-and-drop stage board used by the leads and deals pipelines. */
export function Kanban<T extends { id: string; stage: string }>({
  stages,
  items,
  onMove,
  onOpen,
  renderCard,
}: {
  stages: string[]
  items: T[]
  onMove: (item: T, stage: string) => void
  onOpen: (item: T) => void
  renderCard: (item: T) => ReactNode
}) {
  const [over, setOver] = useState<string | null>(null)
  const onDrop = (e: DragEvent, stage: string) => {
    e.preventDefault()
    setOver(null)
    const id = e.dataTransfer.getData('text/plain')
    const item = items.find((i) => i.id === id)
    if (item && item.stage !== stage) onMove(item, stage)
  }
  return (
    <div className="pipeline">
      {stages.map((stage) => {
        const col = items.filter((i) => i.stage === stage)
        return (
          <div
            key={stage}
            className={`pcol ${over === stage ? 'dragover' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setOver(stage)
            }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => onDrop(e, stage)}
          >
            <div className="pcol-head">
              <span>{stage}</span>
              <span className="count">{col.length}</span>
            </div>
            {col.map((item) => (
              <div
                key={item.id}
                className="pcard"
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/plain', item.id)}
                onClick={() => onOpen(item)}
              >
                {renderCard(item)}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
