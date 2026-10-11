import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

/** Vrai quand l'écran qui contient la liste est affiché. Un écran masqué mesure 0 : il faut remesurer à l'affichage. */
export const ScreenVisible = createContext(true)

interface Props {
  count: number
  rowHeight: number
  /** Rend la ligne `index` ; doit porter une `key`. */
  children: (index: number) => ReactNode
  /** Change quand la liste change de contenu : le défilement revient en haut. */
  resetKey?: unknown
  onWidth?: (width: number) => void
}

const OVERSCAN = 6

/** Liste à défilement virtuel : le catalogue compte plus de 100 000 entrées, seules les lignes visibles existent. */
export function VirtualList({ count, rowHeight, children, resetKey, onWidth }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [height, setHeight] = useState(0)
  const visible = useContext(ScreenVisible)

  useLayoutEffect(() => {
    const element = ref.current!
    const measure = () => {
      setHeight(element.clientHeight)
      onWidth?.(element.clientWidth)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    measure()
    return () => observer.disconnect()
  }, [onWidth, visible])

  useLayoutEffect(() => {
    ref.current!.scrollTop = 0
    setScrollTop(0)
  }, [resetKey])

  const first = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN)
  const last = Math.min(count, Math.ceil((scrollTop + height) / rowHeight) + OVERSCAN)
  const rows: ReactNode[] = []
  for (let index = first; index < last; index++) rows.push(children(index))

  return (
    <div ref={ref} className="vlist" onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
      <div style={{ height: count * rowHeight }}>
        <div style={{ transform: `translateY(${first * rowHeight}px)` }}>{rows}</div>
      </div>
    </div>
  )
}
