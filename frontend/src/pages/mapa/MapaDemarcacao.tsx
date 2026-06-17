import { useState, useRef, useEffect } from 'react'

const IMG_MAPA = '/terra_Santa.png'

export default function MapaDemarcacao() {
  const mapRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragOrigin = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null)

  useEffect(() => {
    const el = mapRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setScale(s => Math.min(8, Math.max(1, s + (e.deltaY < 0 ? 0.2 : -0.2))))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  function onMouseDown(e: any) {
    if (scale <= 1) return
    e.preventDefault()
    setDragging(true)
    dragOrigin.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y }
  }

  function onMouseMove(e: any) {
    if (!dragging || !dragOrigin.current) return
    setOffset({ x: dragOrigin.current.ox + e.clientX - dragOrigin.current.mx, y: dragOrigin.current.oy + e.clientY - dragOrigin.current.my })
  }

  function onMouseUp() { setDragging(false) }

  function resetZoom() { setScale(1); setOffset({ x: 0, y: 0 }) }

  return (
    <div
      ref={mapRef}
      className="rounded-xl overflow-hidden border border-gray-200 shadow-sm relative select-none bg-gray-50"
      style={{ height: 'calc(100vh - 72px)', cursor: scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'default' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <img
        src={IMG_MAPA}
        alt="Mapa do Loteamento"
        draggable={false}
        className="w-full h-full object-contain"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: 'center center',
          transition: dragging ? 'none' : 'transform 0.15s ease',
        }}
      />

      <div className="absolute bottom-3 right-3 flex items-center gap-1">
        {scale > 1 && (
          <span className="text-[11px] bg-black/50 text-white px-2 py-0.5 rounded-full mr-1">
            {Math.round(scale * 100)}%
          </span>
        )}
        <button onClick={() => setScale(s => Math.min(8, s + 0.5))} className="w-8 h-8 bg-white border border-gray-200 rounded-lg shadow text-gray-700 hover:bg-gray-50 text-lg font-bold flex items-center justify-center">+</button>
        <button onClick={resetZoom} className="h-8 px-2 bg-white border border-gray-200 rounded-lg shadow text-gray-500 hover:bg-gray-50 text-xs font-medium">1:1</button>
        <button onClick={() => setScale(s => { const n = Math.max(1, s - 0.5); if (n === 1) setOffset({ x: 0, y: 0 }); return n })} className="w-8 h-8 bg-white border border-gray-200 rounded-lg shadow text-gray-700 hover:bg-gray-50 text-lg font-bold flex items-center justify-center">−</button>
      </div>
    </div>
  )
}
