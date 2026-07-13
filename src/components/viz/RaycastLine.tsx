import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface RaycastLineProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  color?: string;
  duration?: number;
  onComplete?: () => void;
}

export const RaycastLine: React.FC<RaycastLineProps> = ({
  start,
  end,
  color = '#00ffff', // Cyan default
  duration = 500, // 500ms default
  onComplete
}) => {
  const lineRef = useRef<THREE.Line>(null);
  const startTimeRef = useRef(0);

  // Reset timer when component mounts or props change
  useEffect(() => {
    startTimeRef.current = Date.now();
    if (lineRef.current?.material) {
      const material = lineRef.current.material as THREE.LineBasicMaterial;
      material.opacity = 1.0;
    }
  }, [start, end]);

  // Create line geometry and material once
  const lineObject = useMemo(() => {
    const points = [start, end];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 1.0,
      depthTest: false,
      depthWrite: false
    });
    return new THREE.Line(geometry, material);
  }, [start, end, color]);

  // Animate opacity fade-out
  useFrame(() => {
    if (!lineRef.current) return;
    
    const elapsed = Date.now() - startTimeRef.current;
    const progress = Math.min(elapsed / duration, 1.0);
    const newOpacity = 1.0 - progress;
    
    const material = lineRef.current.material as THREE.LineBasicMaterial;
    if (material) {
      material.opacity = newOpacity;
    }
    
    // Call onComplete when fade is finished
    if (progress >= 1.0 && onComplete) {
      onComplete();
    }
  });

  return <primitive ref={lineRef} object={lineObject} />;
};

export default RaycastLine;
