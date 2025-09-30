import React, { useEffect, useRef } from 'react';
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Particles, ParticleAutoDisposal, startParticleWorker, workerUpdateSimulation } from 'js-particle-system';

export default function App() {
  const amount = 1000;
  const workerIndex = useRef(null);

  function SceneInitializer() {
    const { scene } = useThree();
    const particle = useRef(new Particles()).current;

    useEffect(() => {
      const mat = new THREE.MeshLambertMaterial();
      mat.transparent = true;
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.translateZ(-50);
      mesh.castShadow = true;

      particle.InitializeParticles(scene, mesh, amount);
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

      const workerUrl = process.env.PUBLIC_URL + '/ocWorker.js';
      workerIndex.current = startParticleWorker(particle, workerUrl);

    }, [scene, particle]);

    useFrame((state, delta) => {
      if (workerIndex.current !== null) {
        workerUpdateSimulation(workerIndex.current, delta);
      }
    });

    return null;
  }

  return (
    <>
      <Canvas camera={{ position: [0, 0, 5] }}>
        <SceneInitializer />
        <ParticleAutoDisposal />
      </Canvas>
    </>
  );
}