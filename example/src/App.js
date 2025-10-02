"use client"
import React, { useEffect, useRef } from 'react';
import LetterAnimation from "./letters"
import Spawn from './spawn';
import {ParticleAutoDisposal, startParticleWorker, updateWorkerValues, killWorker, workerUpdateSimulation} from './lib/workerHelper';
import { OrbitControls } from '@react-three/drei'; // Import OrbitControls
import { Canvas, useThree, useFrame } from "@react-three/fiber";

export default function App() {
function Controls() {
  const { camera, gl } = useThree();
  return <OrbitControls args={[camera, gl]} />;
}

  return (
    <>
      {/* Wrap Canvas in a div to control its size */}
      <div style={{ width: '100vw', height: '100vh' }}>
         <Canvas camera={{ position: [0, 0, 5] }}> {/* Added a default camera position */}
                  <color attach="background" args={['#099000']} /> {/* Set background color to black */}
          <LetterAnimation></LetterAnimation>
          <ParticleAutoDisposal />
          <Controls /> {/* Add OrbitControls for camera manipulation */}
                {/* Add other scene elements here if needed */}
          </Canvas>

         
      </div> {/* Close the div here */}
    </>
  );
}
