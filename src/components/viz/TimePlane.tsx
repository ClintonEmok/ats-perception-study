import React, { forwardRef } from 'react';
import * as THREE from 'three';

export const TimePlane = forwardRef<THREE.Mesh, object>((_, ref) => {
  return (
    <mesh 
      ref={ref} 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, 0, 0]}
    >
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial 
        color="#00FFFF" 
        transparent 
        opacity={0.2} 
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
});

TimePlane.displayName = 'TimePlane';
