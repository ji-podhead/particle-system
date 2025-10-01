"use client"
import React, { useEffect, useRef } from 'react';
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from '@react-three/drei'; // Import OrbitControls
import { Particles } from './lib/workerParticles';
import {ParticleAutoDisposal, startParticleWorker, updateWorkerValues, killWorker, workerUpdateSimulation} from './lib/workerHelper';

// Component to handle the scene setup and frame updates
function SceneInitializer({ particle, childParticle, amount }) { // Receive props
  const { scene, gl, camera } = useThree(); // useThree hook is correctly scoped within a child of Canvas

  // Initialize particle system configuration using useEffect for side effects
  useEffect(() => {
    const mat = new THREE.MeshLambertMaterial();
    mat.transparent = true;
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.translateZ(-50);
    mesh.castShadow = true;

    // Initialize the particle system
    const particleMesh = particle.InitializeParticles(scene,mesh, amount);
    // scene.add(particleMesh);
    particle.setSpawnOverTime(true);
    particle.setSourceAttributes("opacity", [1], false);
    particle.setSourceAttributes("emission", [255, 255, 252], true, [50, 50, 50], [250, 250, 250]);
    particle.setSourceAttributes("scale", [1, 1, 1], true, 0.1, 0.1);
    particle.setSourceAttributes("rotation", [0, 0, 0], true, -45, 45);
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
    particle.setSpawnOverTime(true);
    particle.setForce([0.01, 0.01, 0.01]);
    particle.startPS();
    particle.updateValues(["transform", "color", "emission", "opacity", "rotation", "scale"]);
    startParticleWorker(particle,"./ocWorker.js")
    // workerUpdateSimulation(0,0.1)

    // Placeholder for childParticle initialization if needed
    // childParticle.InitializeParticles(scene, mesh, 100000);
    // ... other childParticle configurations ...

    // Cleanup function
    return () => {
      // Dispose of Three.js objects if necessary
      // For example: mat.dispose(); geometry.dispose(); mesh.geometry.dispose(); mesh.material.dispose();
      // If particle system has a dispose method, call it here.
      // particle.dispose();
      // childParticle.dispose();
    };
  }, [scene, amount, particle, childParticle]); // Added particle and childParticle to dependencies
  const elapsedTime = useRef(0); // Initialize elapsed time to 0
  const intervalSeconds = 10; // Desired interval in seconds

  useFrame((state, delta) => {
    elapsedTime.current += delta; // Accumulate delta time

    if (elapsedTime.current >= intervalSeconds) {
      // Call the worker function at the desired interval
      // The original code passed delta to workerUpdateSimulation, so we continue to do so.
      // If a fixed value is needed, this would require further clarification.
      workerUpdateSimulation(0, delta);
      elapsedTime.current -= intervalSeconds; // Subtract the interval to maintain accuracy
    }

    // Keep other update calls if they are intended to run every frame
    // particle.updateValues(["transform", "color", "emission", "opacity", "rotation", "scale"]);
    // childParticle.updateValues(["transform", "color", "emission", "opacity", "rotation", "scale"]);
  });

  // This component doesn't render anything directly, it sets up the scene
  return null;
}

// Helper component to use OrbitControls
function Controls() {
  const { camera, gl } = useThree();
  return <OrbitControls args={[camera, gl]} />;
}

export default function App() {
  const particle = useRef(new Particles()).current;
  const childParticle = useRef(new Particles()).current;
  const amount = 10000;

  return (
    <>
      {/* Wrap Canvas in a div to control its size */}
      <div style={{ width: '100vw', height: '100vh' }}>
        <Canvas camera={{ position: [0, 0, 5] }}> {/* Added a default camera position */}
          <color attach="background" args={['#099000']} /> {/* Set background color to black */}
        {/* Test with a simple mesh to check R3F setup */}
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="red" />
        </mesh>
        <SceneInitializer particle={particle} childParticle={childParticle} amount={amount} />
        <ParticleAutoDisposal />
        <Controls /> {/* Add OrbitControls for camera manipulation */}
        {/* Add other scene elements here if needed */}
      </Canvas>
    </div> {/* Close the div here */}
    </>
  );
}
