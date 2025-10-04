"use client"
import React, { useEffect, useRef } from 'react';
import LetterAnimation from "./letters"
import { OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from 'three';

function Controls() {
  const { camera, gl } = useThree();
  useEffect(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl]);
  return <OrbitControls args={[camera, gl.domElement]} />;
}

export default function App() {
  return (
    <>
      <div style={{ width: '100vw', height: '100vh' }}>
        <Canvas camera={{ position: [0.5, 0.5, 0.5] }} shadows>
          <color attach="background" args={['#443333']} />
          <fog attach="fog" args={['#443333', 1, 4]} />
          
          <primitive object={new THREE.Group()}>
            <LetterAnimation />
          </primitive>

          <Controls />

          {/* Ground Plane */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.0651, 0]} receiveShadow>
            <planeGeometry args={[8, 8]} />
            <meshPhongMaterial color="#cbcbcb" specular="#101010" />
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
