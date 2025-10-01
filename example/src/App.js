"use client"
import React, { useEffect, useRef } from 'react';
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from '@react-three/drei';
import { Particles, ParticleAutoDisposal } from './lib';

// Component to handle the scene setup and frame updates
function SceneInitializer({ particle, amount }) {
  const { scene } = useThree();

  useEffect(() => {
    const mat = new THREE.MeshLambertMaterial({ transparent: true });
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.translateZ(-50);
    mesh.castShadow = true;

    // Initialize the particle system using the new config object API
    particle.InitializeParticles(scene, mesh, {
        amount: amount,
        useWorker: true,
    });

    // All original configuration calls are preserved
    particle.setSpawnOverTime(true);
    particle.setSourceAttributes("opacity", [1], false);
    particle.setSourceAttributes("emission", [255, 255, 252], true, [50, 50, 50], [250, 250, 250]);
    particle.setSourceAttributes("scale", [1, 1, 1], true, 0.1, 0.1);
    particle.setSourceAttributes("rotation", [0, 0, 0], true, -45, 45);
    // This second emission call seems intentional in the original code, so we preserve it.
    particle.setSourceAttributes("emission", [10, 10, 10], false, -45, 45);
    particle.setSourceAttributes("color", [0.5, 0, 0], true, [50, 50, 50], [250, 250, 250]);
    particle.setMaxLifeTime(1, true, 1.25, 4);
    particle.setStartDirection(1, 1, 1, true, -50, 50);
    particle.setAttributeOverLifeTime("opacity", [0], [1], false);
    particle.setAttributeOverLifeTime("rotation", [0, 0, 0], [1, 1, 1], false);
    particle.setAttributeOverLifeTime("force", [0, 0, 0], [0, 0, 0], false);
    particle.setAttributeOverLifeTime("color", [255, 250, 255], [199, 255, 90], true, [0, 0, 3], [5, 0, 0]);
    particle.setSpawnFrequency(2);
    particle.setMaxSpawnCount(amount);
    particle.setBurstCount(amount);
    particle.setForce([0.01, 0.01, 0.01]);

    particle.startPS();

    return () => {
      // Cleanup logic if needed
    };
  }, [scene, amount, particle]);

  useFrame((state, delta) => {
    // The API call is the same for both single and multi-threaded modes.
    particle.updateSimulation(delta);
  });

  return null;
}

function Controls() {
  const { camera, gl } = useThree();
  return <OrbitControls args={[camera, gl.domElement]} />;
}

export default function App() {
  const particle = useRef(new Particles()).current;
  const amount = 10000;

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas camera={{ position: [0, 0, 50] }}>
        <color attach="background" args={['#000000']} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <SceneInitializer particle={particle} amount={amount} />
        <Controls />
        <ParticleAutoDisposal />
      </Canvas>
    </div>
  );
}