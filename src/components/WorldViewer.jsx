import { useRef, useEffect, useState, Suspense, useCallback, useMemo } from 'react'
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber'
import { Html, useProgress } from '@react-three/drei'
import { SplatMesh } from '@sparkjsdev/spark'
import * as THREE from 'three'
import WaypointPanel from './WaypointPanel'

extend({ SplatMesh })

// pos = camera viewpoint position, lookAngle/pitchAngle = where camera faces
// worldPos = actual location of the content in the world (used for compass + proximity)
// If worldPos is omitted, pos is used for both
const WAYPOINTS = [
  { id: 'origin', label: 'About Me', pos: [0, 0.8, 0], lookAngle: 0, worldPos: [0, 0] },
  { id: 'resume', label: 'Resume', pos: [0, 0.8, 1.5], lookAngle: Math.PI, worldPos: [0, 7] },
  { id: 'skiing', label: 'Skiing', pos: [-1, 0.8, -1], lookAngle: Math.PI / 3, worldPos: [-4, -3] },
  { id: 'projects', label: 'Projects', pos: [1.5, 0.8, 3], lookAngle: Math.PI / 2, pitchAngle: 0.15, worldPos: [-4, 3] },
  { id: 'cars', label: 'Cars', pos: [1, 0.8, -1], lookAngle: -Math.PI / 3, worldPos: [4, -3] },
  { id: 'karate', label: 'Karate', pos: [1.2, 0.8, 0], lookAngle: -0.55 * Math.PI, worldPos: [4, 2] },
  { id: 'golf', label: 'Golf', pos: [0, 0.8, 6], lookAngle: -0.55 * Math.PI, worldPos: [4, 7] },
]

const PROXIMITY_THRESHOLD = 4

function Loader() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div className="world-loader">
        <p className="world-loader-title">Loading world...</p>
        <div className="world-loader-bar">
          <div className="world-loader-fill" style={{ width: `${progress}%` }} />
        </div>
        <p>{progress.toFixed(0)}% loaded</p>
      </div>
    </Html>
  )
}

function SplatWorld({ path }) {
  const meshRef = useRef()
  const args = useMemo(() => ({ url: path }), [path])
  return <splatMesh ref={meshRef} args={[args]} />
}

function CameraController({ keysRef, navigateRef, onPositionChange, expanded }) {
  const { camera, gl } = useThree()
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
  const isDragging = useRef(false)
  const moveSpeed = 0.15
  const lookSpeed = 0.003
  const scrollLookSpeed = 0.002

  const navigateTo = useCallback((pos, lookAngle, pitchAngle = 0) => {
    camera.position.set(pos[0], pos[1], pos[2])
    euler.current.set(pitchAngle, lookAngle, 0)
    camera.rotation.copy(euler.current)
  }, [camera])

  useEffect(() => {
    if (navigateRef) navigateRef.current = navigateTo
  }, [navigateRef, navigateTo])

  useEffect(() => {
    camera.position.set(0, 0.8, 0)
    euler.current.set(0, 0, 0)
    camera.rotation.copy(euler.current)
  }, [camera])

  useEffect(() => {
    const canvas = gl.domElement

    const onMouseDown = (e) => {
      if (e.button === 0 || e.button === 2) {
        isDragging.current = true
      }
    }

    const onMouseUp = () => {
      isDragging.current = false
    }

    const onMouseMove = (e) => {
      if (!isDragging.current) return
      euler.current.y -= e.movementX * lookSpeed
      euler.current.x -= e.movementY * lookSpeed
      euler.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.current.x))
    }

    const onWheel = (e) => {
      e.preventDefault()
      euler.current.y -= e.deltaX * scrollLookSpeed
      euler.current.x -= e.deltaY * scrollLookSpeed
      euler.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.current.x))
    }

    const onContextMenu = (e) => e.preventDefault()

    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('contextmenu', onContextMenu)

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('contextmenu', onContextMenu)
    }
  }, [gl, camera])

  useFrame(() => {
    // Slow auto-rotate when in PiP, unless user is using keys
    const keys = keysRef.current
    const userMoving = keys.forward || keys.backward || keys.left || keys.right

    // Always auto-rotate in PiP (on top of any user movement)
    if (!expanded) {
      euler.current.y += 0.002
    }

    const direction = new THREE.Vector3()

    const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, euler.current.y, 0))
    const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, euler.current.y, 0))

    if (keys.forward) direction.add(forward)
    if (keys.backward) direction.sub(forward)
    if (keys.left) direction.sub(right)
    if (keys.right) direction.add(right)

    if (direction.length() > 0) {
      direction.normalize().multiplyScalar(moveSpeed)
      camera.position.add(direction)
    }

    camera.rotation.copy(euler.current)

    if (onPositionChange) {
      onPositionChange([camera.position.x, camera.position.y, camera.position.z])
    }
  })

  return null
}

function CompassNav({ onNavigate, playerPos, activePanel }) {
  const size = 200
  const cx = size / 2
  const cy = size / 2
  const outerR = size / 2 - 8

  // Scale worldPos into the circle
  const maxExtent = Math.max(
    ...WAYPOINTS.map(wp => Math.sqrt(wp.worldPos[0] ** 2 + wp.worldPos[1] ** 2))
  ) || 1
  const mapScale = (outerR - 16) / maxExtent

  const worldToSvg = (worldX, worldZ) => ({
    x: cx + worldX * mapScale,
    y: cy + worldZ * mapScale,
  })

  // Clamp inside circle
  const clampToCircle = (pt) => {
    const dx = pt.x - cx
    const dy = pt.y - cy
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > outerR - 6) {
      const s = (outerR - 6) / dist
      return { x: cx + dx * s, y: cy + dy * s }
    }
    return pt
  }

  const player = playerPos ? clampToCircle(worldToSvg(playerPos[0], playerPos[2])) : null

  return (
    <div className="compass-nav">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer ring */}
        <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        {/* Inner ring */}
        <circle cx={cx} cy={cy} r={outerR * 0.5} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="3 3" />
        {/* Crosshair lines */}
        <line x1={cx} y1={cy - outerR} x2={cx} y2={cy + outerR} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        <line x1={cx - outerR} y1={cy} x2={cx + outerR} y2={cy} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

        {/* Direction labels */}
        <text x={cx} y={12} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="7" fontFamily="system-ui, sans-serif" fontWeight="600" letterSpacing="0.1em">FWD</text>

        {/* Waypoints */}
        {WAYPOINTS.map((wp) => {
          const isOrigin = wp.id === 'origin'
          const isActive = wp.id === activePanel
          const pt = worldToSvg(wp.worldPos[0], wp.worldPos[1])

          return (
            <g key={wp.id} className="compass-waypoint" onClick={() => onNavigate(wp)}>
              {/* Hit area */}
              <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />
              {/* Dot */}
              <circle
                cx={pt.x} cy={pt.y}
                r={isOrigin ? 7 : 5}
                fill={isActive ? 'rgba(79,70,229,0.9)' : isOrigin ? 'rgba(79,70,229,0.6)' : 'rgba(255,255,255,0.15)'}
                stroke={isActive ? 'rgba(165,180,252,0.8)' : isOrigin ? 'rgba(165,180,252,0.5)' : 'rgba(255,255,255,0.3)'}
                strokeWidth={isActive ? '2' : '1'}
              />
              {/* Active glow */}
              {isActive && (
                <circle cx={pt.x} cy={pt.y} r="10" fill="none" stroke="rgba(79,70,229,0.3)" strokeWidth="1">
                  <animate attributeName="r" from="8" to="14" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              {/* Label */}
              <text
                x={pt.x} y={pt.y - 12}
                textAnchor="middle"
                fill={isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.6)'}
                fontSize="8"
                fontFamily="system-ui, sans-serif"
                fontWeight={isActive ? '600' : '400'}
              >
                {wp.label}
              </text>
            </g>
          )
        })}

        {/* Player indicator */}
        {player && (
          <g className="compass-player">
            <circle cx={player.x} cy={player.y} r="3.5" fill="rgba(79,70,229,0.95)" stroke="white" strokeWidth="1.5" />
            <circle cx={player.x} cy={player.y} r="8" fill="none" stroke="rgba(79,70,229,0.4)" strokeWidth="1">
              <animate attributeName="r" from="5" to="11" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.8" to="0" dur="2s" repeatCount="indefinite" />
            </circle>
          </g>
        )}
      </svg>
    </div>
  )
}

function ProximityPrompt({ waypoint, onOpen }) {
  return (
    <div className="proximity-prompt" onClick={onOpen}>
      <span className="proximity-prompt-key">E</span>
      <span>View {waypoint.label}</span>
    </div>
  )
}

export default function WorldViewer({ expanded, onToggleExpand }) {
  const keysRef = useRef({ forward: false, backward: false, left: false, right: false })
  const navigateRef = useRef(null)
  const [activePanel, setActivePanel] = useState(null)
  const [playerPos, setPlayerPos] = useState([0, 0.8, 0])
  const playerPosRef = useRef([0, 0.8, 0])
  const [nearbyWaypoint, setNearbyWaypoint] = useState(null)

  const handlePositionChange = useCallback((pos) => {
    playerPosRef.current = pos
  }, [])

  // Throttle position updates + proximity detection
  useEffect(() => {
    if (!expanded) return
    const interval = setInterval(() => {
      const pos = playerPosRef.current
      setPlayerPos([...pos])

      // Find nearest waypoint within threshold (using worldPos)
      let nearest = null
      let nearestDist = PROXIMITY_THRESHOLD
      for (const wp of WAYPOINTS) {
        const dx = pos[0] - wp.worldPos[0]
        const dz = pos[2] - wp.worldPos[1]
        const dist = Math.sqrt(dx * dx + dz * dz)
        if (dist < nearestDist) {
          nearestDist = dist
          nearest = wp
        }
      }
      setNearbyWaypoint(nearest)
    }, 100)
    return () => clearInterval(interval)
  }, [expanded])

  // Always reset to origin/About Me when entering the world
  useEffect(() => {
    if (expanded) {
      navigateRef.current?.([0, 0.8, 0], 0, 0)
      setActivePanel('origin')
    }
  }, [expanded])

  const handleNavigate = useCallback((wp) => {
    navigateRef.current?.(wp.pos, wp.lookAngle, wp.pitchAngle)
    setActivePanel(wp.id)
  }, [])

  const handleClosePanel = useCallback(() => {
    setActivePanel(null)
  }, [])

  const handleOpenNearby = useCallback(() => {
    if (nearbyWaypoint) {
      navigateRef.current?.(nearbyWaypoint.pos, nearbyWaypoint.lookAngle, nearbyWaypoint.pitchAngle)
      setActivePanel(nearbyWaypoint.id)
    }
  }, [nearbyWaypoint])

  const handleKeyDown = useCallback((e) => {
    switch (e.code) {
      case 'ArrowUp': case 'KeyW': keysRef.current.forward = true; break
      case 'ArrowDown': case 'KeyS': keysRef.current.backward = true; break
      case 'ArrowLeft': case 'KeyA': keysRef.current.left = true; break
      case 'ArrowRight': case 'KeyD': keysRef.current.right = true; break
      case 'KeyE':
        if (nearbyWaypoint) {
          navigateRef.current?.(nearbyWaypoint.pos, nearbyWaypoint.lookAngle, nearbyWaypoint.pitchAngle)
          setActivePanel(nearbyWaypoint.id)
        }
        break
      case 'Escape':
        setActivePanel(null)
        break
    }
  }, [nearbyWaypoint, activePanel])

  const handleKeyUp = useCallback((e) => {
    switch (e.code) {
      case 'ArrowUp': case 'KeyW': keysRef.current.forward = false; break
      case 'ArrowDown': case 'KeyS': keysRef.current.backward = false; break
      case 'ArrowLeft': case 'KeyA': keysRef.current.left = false; break
      case 'ArrowRight': case 'KeyD': keysRef.current.right = false; break
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  return (
    <div
      className={`world-viewer ${expanded ? 'world-viewer--expanded' : 'world-viewer--pip'}`}
      onClick={!expanded ? onToggleExpand : undefined}
    >
      <button className="world-toggle-btn" onClick={(e) => { e.stopPropagation(); onToggleExpand() }}>
        {expanded ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M9.5 2v4.5H14M6.5 14V9.5H2M14 6.5L9.5 6.5M2 9.5h4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 2L14 2V6M6 14H2V10M14 2L9.5 6.5M2 14L6.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>


      {expanded && activePanel && (
        <WaypointPanel waypointId={activePanel} onClose={handleClosePanel} />
      )}

      {expanded && nearbyWaypoint && !activePanel && (
        <ProximityPrompt waypoint={nearbyWaypoint} onOpen={handleOpenNearby} />
      )}

      {expanded && (
        <CompassNav onNavigate={handleNavigate} playerPos={playerPos} activePanel={activePanel} />
      )}

      {expanded && (
        <div className="world-controls-hint">
          <span>WASD / Arrows to move</span>
          <span className="world-controls-dot">·</span>
          <span>Click + drag or scroll to look</span>
          <span className="world-controls-dot">·</span>
          <span>Click compass points to navigate</span>
        </div>
      )}

      <Canvas
        camera={{ fov: 50, near: 0.1, far: 1000 }}
        dpr={[1, 2]}
        gl={{
          antialias: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
          outputColorSpace: THREE.SRGBColorSpace,
          powerPreference: 'high-performance',
        }}
      >
        <Suspense fallback={<Loader />}>
          <SplatWorld path="/worlds/world.spz" />
        </Suspense>
        <CameraController keysRef={keysRef} navigateRef={navigateRef} onPositionChange={handlePositionChange} expanded={expanded} />
      </Canvas>

      {!expanded && (
        <div className="world-controls-hint">
          <span>Click to enter</span>
          <span className="world-controls-dot">·</span>
          <span>Arrow keys / scroll to preview</span>
        </div>
      )}
    </div>
  )
}
