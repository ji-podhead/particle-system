"use client"
import React, { useEffect, useRef } from 'react';
import LetterAnimation from "./letters"
import { OrbitControls, Environment } from '@react-three/drei';
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from 'three';

function Controls() {
  const { camera, gl } = useThree();
  useEffect(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl]);
  return <OrbitControls 
            args={[camera, gl.domElement]} 
            maxPolarAngle={Math.PI / 2} // Prevent camera from going below the ground
            minDistance={0.3}            // Prevent zooming in too close
            maxDistance={1.5}            // Prevent zooming out too far
         />;
}

export default function App() {
  return (
    <>
      <div style={{ width: '100vw', height: '100vh' }}>
        <Canvas camera={{ position: [0.5, 0.5, 0.5] }} shadows>
          <color attach="background" args={['#1c1c1c']} />
          <fog attach="fog" args={['#1c1c1c', 1, 4]} />
          <Environment preset="city" />
          
          <primitive object={new THREE.Group()}>
            <LetterAnimation />
          </primitive>

          <Controls />

          {/* Ground Plane */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.0651, 0]} receiveShadow>
            <planeGeometry args={[8, 8]} />
            <meshPhongMaterial color="#4a4a4a" specular="#101010" />
          </mesh>

          {/* Lights */}
          <hemisphereLight args={[0x8d7c7c, 0x494966, 3]} />
          <spotLight
            position={[-1, 1, 0.5]}
            intensity={7}
            angle={Math.PI / 16}
            penumbra={0.5}
            castShadow
          />
        </Canvas>
      </div>
    </>
  );
}
