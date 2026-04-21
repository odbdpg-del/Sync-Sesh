import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";

interface RenderingStackSpikeProps {
  onClose: () => void;
}

function RotatingCube() {
  const meshRef = useRef<{ rotation: { x: number; y: number } } | null>(null);

  useFrame((_, delta) => {
    if (!meshRef.current) {
      return;
    }

    meshRef.current.rotation.x += delta * 0.45;
    meshRef.current.rotation.y += delta * 0.7;
  });

  return (
    <mesh ref={meshRef} position={[0, 1, 0]}>
      <boxGeometry args={[1.25, 1.25, 1.25]} />
      <meshStandardMaterial args={[{ color: "#57f3ff", emissive: "#123c4d", roughness: 0.36, metalness: 0.18 }]} />
    </mesh>
  );
}

export function RenderingStackSpike({ onClose }: RenderingStackSpikeProps) {
  return (
    <div className="rendering-spike-overlay" role="dialog" aria-modal="true" aria-label="3D rendering spike">
      <Canvas camera={{ position: [3.5, 3, 5], fov: 48 }} dpr={[1, 1.75]} className="rendering-spike-canvas">
        <color attach="background" args={["#05070c"]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[4, 6, 3]} intensity={1.8} />
        <pointLight position={[-3, 2, -2]} color="#ff8a5b" intensity={1.2} />

        <RotatingCube />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[18, 18]} />
          <meshStandardMaterial args={[{ color: "#101a2d", roughness: 0.78, metalness: 0.04 }]} />
        </mesh>

        <gridHelper args={[18, 18, "#57f3ff", "#1d3758"]} position={[0, 0.01, 0]} />
      </Canvas>

      <button type="button" className="rendering-spike-close" onClick={onClose}>
        Close
      </button>
    </div>
  );
}
