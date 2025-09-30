"use client"
import React, { useEffect, useRef } from 'react';
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from '@react-three/drei'; // Import OrbitControls
import { Particles } from './lib/workerParticles';
import {ParticleAutoDisposal, workerUpdateSimulation} from './lib/workerHelper';

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
    particle.setSourceAttributes("scale", [1, 1, 1], true, 30, 100);
    particle.setSourceAttributes("rotation", [0, 0, 0], true, -45, 45);
    particle.setSourceAttributes("emission", [10, 10, 10], false, -45, 45);
    particle.setSourceAttributes("color", [254.5, 254.0, 0], false, [50, 50, 50], [250, 250, 250]);
    particle.setMaxLifeTime(1, true, 1.25, 3);
    particle.setStartDirection(1, 1, 1, true, -50, 50);
    particle.setAttributeOverLifeTime("opacity", [0], [-0.1], false);
    particle.setAttributeOverLifeTime("rotation", [0, 0, 0], [2, 20, 2], false);
    particle.setAttributeOverLifeTime("force", [0, 0, 0], [0, 0, 0], false);
    particle.setAttributeOverLifeTime("color", [0, 0, 0], [1, 0.1, 0], false, [0, 0, 3], [5, 0, 0]);
    particle.setSpawnFrequency(2);
    particle.setMaxSpawnCount(amount);
    particle.setBurstCount(amount);
    particle.setSpawnOverTime(true);
    particle.setForce([10, 10, 10]);
    particle.startPS();
    particle.updateValues(["transform", "color", "emission", "opacity", "rotation", "scale"]);

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
  var timer
  useFrame((state, delta) => {
    timer=timer+1
    if(timer>10){
      timer=0
      console.log(particle)
      console.log("-----------")
    }
    particle.updateSimulation(delta, true, true, true);
    // childParticle.updateSimulation(delta, true, true, true);
    particle.updateValues(["transform", "color", "emission", "opacity", "rotation", "scale"]);
    // workerUpdateSimulation(0,delta)
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
  const amount = 1000;

  return (
    <>
      {/* Wrap Canvas in a div to control its size */}
      <div style={{ width: '100vw', height: '100vh' }}>
        <Canvas camera={{ position: [0, 0, 5] }}> {/* Added a default camera position */}
          <color attach="background" args={['#000000']} /> {/* Set background color to black */}
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
