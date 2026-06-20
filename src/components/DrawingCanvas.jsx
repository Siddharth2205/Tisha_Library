import { useRef, useState } from 'react'
import { ReactSketchCanvas } from 'react-sketch-canvas'
import './DrawingCanvas.css'

const COLORS = ['#2c1810', '#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#e67e22']

export default function DrawingCanvas({ onSave, onCancel }) {
  const canvasRef = useRef()
  const [color, setColor] = useState(COLORS[0])
  const [brushSize, setBrushSize] = useState(4)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const dataUrl = await canvasRef.current.exportImage('png')
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      await onSave(blob)
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className="drawing-page">
      <div className="drawing-toolbar">
        <button className="drawing-cancel" onClick={onCancel}>
          Cancel
        </button>
        <div className="drawing-colors">
          {COLORS.map((c) => (
            <button
              key={c}
              className={`drawing-color ${color === c ? 'active' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={c}
            />
          ))}
        </div>
        <button
          className="drawing-save"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="drawing-brush-row">
        <label className="drawing-brush-label">
          Size: {brushSize}
          <input
            type="range"
            min="1"
            max="20"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="drawing-brush-slider"
          />
        </label>
        <button
          className="drawing-undo"
          onClick={() => canvasRef.current?.undo()}
        >
          Undo
        </button>
        <button
          className="drawing-clear"
          onClick={() => canvasRef.current?.clearCanvas()}
        >
          Clear
        </button>
      </div>

      <div className="drawing-canvas-wrapper">
        <ReactSketchCanvas
          ref={canvasRef}
          strokeColor={color}
          strokeWidth={brushSize}
          canvasColor="#ffffff"
          style={{ border: 'none', borderRadius: '8px' }}
        />
      </div>
    </div>
  )
}
