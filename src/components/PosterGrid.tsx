import { useState, type ReactNode } from 'react'
import { VirtualList } from './VirtualList'

const GAP = 12
const SIDE = 16
const MIN_CARD = 104
const CAPTION = 62

interface Props<T> {
  items: T[]
  resetKey: unknown
  itemKey: (item: T) => string | number
  children: (item: T) => ReactNode
}

/** Grille d'affiches à défilement virtuel : trois colonnes sur iPhone, davantage sur grand écran. */
export function PosterGrid<T>({ items, resetKey, itemKey, children }: Props<T>) {
  const [width, setWidth] = useState(0)
  const columns = Math.max(3, Math.floor((width - SIDE * 2 + GAP) / (MIN_CARD + GAP)))
  const cardWidth = (width - SIDE * 2 - GAP * (columns - 1)) / columns
  const rowHeight = Math.round(cardWidth * 1.5 + CAPTION)

  return (
    <VirtualList count={width ? Math.ceil(items.length / columns) : 0} rowHeight={rowHeight} resetKey={resetKey} onWidth={setWidth}>
      {(index) => (
        <div key={index} className="grid-row" style={{ height: rowHeight, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {items.slice(index * columns, index * columns + columns).map((item) => (
            <div key={itemKey(item)} className="grid-cell">{children(item)}</div>
          ))}
        </div>
      )}
    </VirtualList>
  )
}
