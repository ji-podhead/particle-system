"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Particles } from './lib/workerParticles';
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { useThree, useFrame } from "@react-three/fiber";
import { startParticleWorker, workerUpdateSimulation, killWorker } from './lib/workerHelper';

const letters = ['A', 'B', 'C'];
const PARTICLE_COUNT = 4000;
const letterPoints=[]
function ParticleController({ particleSystem, letterGeometries }) {
    const { scene } = useThree();
    const currentTargetIndex = useRef(0);
    const isInitialized = useRef(false);
    const animationState = useRef({
        startTime: null,
        duration: 4000, // 4 seconds, matching maxLifeTime
        isAnimating: false
    });

    useEffect(() => {
        const init = async () => {
            const geometry = new THREE.SphereGeometry(0.02, 8, 8);
            const material = new THREE.MeshStandardMaterial({ color: '#00ff41', emissive: '#00ff41', emissiveIntensity: 2 });
            const mesh = new THREE.Mesh(geometry, material);

            const particleMesh = particleSystem.InitializeParticles(scene, mesh, PARTICLE_COUNT);
    particleSystem.setSpawnOverTime(false);
    particleSystem.setSourceAttributes("opacity", [1], false);
    particleSystem.setSourceAttributes("emission", [255, 255, 252], true, [50, 50, 50], [250, 250, 250]);
    particleSystem.setSourceAttributes("scale", [1, 1, 1], true, 0.1, 0.1);
    // particleSystem.setSourceAttributes("rotation", [0, 0, 0], true, -45, 45);
    particleSystem.setSourceAttributes("emission", [10, 10, 10], false, -45, 45);
    particleSystem.setSourceAttributes("color", [0.5, 0, 0], true, [50, 50, 50], [250, 250, 250]);
    particleSystem.setMaxLifeTime(1, true, 1.25, 4);
    // particleSystem.setStartDirection(1, 1, 1, true, -50, 50);
    // particleSystem.setAttributeOverLifeTime("opacity", [0], [1], false);
    // particleSystem.setAttributeOverLifeTime("rotation", [0, 0, 0], [1, 1, 1], false);
    // particleSystem.setAttributeOverLifeTime("force", [0, 0, 0], [0, 0, 0], false);
    particleSystem.setAttributeOverLifeTime("color", [255, 250, 255], [199, 255, 90], true, [0, 0, 3], [5, 0, 0]);
    particleSystem.setSpawnFrequency(0);
    particleSystem.setMaxSpawnCount(PARTICLE_COUNT);
    particleSystem.setBurstCount(PARTICLE_COUNT);
    // particleSystem.setSpawnOverTime(true);
    particleSystem.setForce([0.0, 0.0, 0.0]);

            particleSystem.updateValues(["transform", "color", "emission", "opacity", "rotation", "scale"]);
            // particleSystem.setAttributeOverLifeTime("opacity", [0], [1], false);

                // particleSystem.setAttributeOverLifeTime("position", [0,0,0], [1,1,1], false); // Enable transform over lifetime
            console.log("letterGeometries", letterGeometries);
            if (letterGeometries.length > 1) {
                console.log("Setting initial letter geometries for particle animation.");
                console.log(letterGeometries[0])
                console.log("letterGeometries 0", letterGeometries[0]);
                for (let i=0; i<letterGeometries.length;i++){
                    letterPoints[i]=particleSystem.positionFromGeometryFill(letterGeometries[i],PARTICLE_COUNT)
                    console.log("points of "+ letters[i],letterPoints[i])
                }
                // particleSystem.setAttributeOverLifeTime("transform", letterGeometries[0]*0.1, letterGeometries[1]*0.1, false); // Enable transform over lifetime
                particleSystem.setStartPositionFromArray(true,letterPoints[0],false)
                // particleSystem.setAttributeOverLifeTime("position", letterPoints[0], letterPoints[1], false); // Enable transform over lifetime

                currentTargetIndex.current = 0;
                animationState.current.startTime = Date.now();
                animationState.current.isAnimating = true;

                // particleSystem.burst(PARTICLE_COUNT);
            } else {
                console.error("Not enough letter geometries to start animation.");
                return;
            }
            particleSystem.startPS();
            startParticleWorker(particleSystem,"./ocWorker.js")

            isInitialized.current = true;
        };

       
            init();
            particleSystem.burst(PARTICLE_COUNT,letterPoints[0]);
    }, []);

    const elapsedTime = useRef(0);
    const intervalSeconds = 0.01;

    useFrame((state, delta) => {
        if (!isInitialized.current) return console.log("not initialized yet");

        if (false && animationState.current.isAnimating) {
            const now = Date.now();
            if (now - animationState.current.startTime > animationState.current.duration) {
                console.log("change position leter")
                // Animation finished, set up the next one
                const nextIndex = (currentTargetIndex.current + 1) % letterGeometries.length;
                const nextNextIndex = (nextIndex + 1) % letterGeometries.length;
                particleSystem.setAttributeOverLifeTime("position", letterPoints[nextIndex], letterPoints[nextNextIndex], false); // Enable transform over lifetime
                currentTargetIndex.current = nextIndex;
                particleSystem.burst(PARTICLE_COUNT);

                animationState.current.startTime = now;
            }
        }

        elapsedTime.current += delta;
        if (elapsedTime.current >= intervalSeconds) {
            //particleSystem.updateSimulation(delta,true,true,true)
            workerUpdateSimulation(0, delta);
            particleSystem.updateValues(["transform", "color", "emission", "opacity", "rotation", "scale"]);
            elapsedTime.current -= intervalSeconds;
        }
    });

    return null;
}

export default function LetterAnimation() {
    const particleSystem = useMemo(() => new Particles(), []);
    const [letterGeometries, setLetterGeometries] = useState([]);

    useEffect(() => {
        const loader = new FontLoader();
        const fontPromise = new Promise((resolve, reject) => {
            loader.load('/fonts/font.json', resolve, undefined, reject);
        });

        fontPromise.then(loadedFont => {
            const geometries = letters.map(letter => {
                if (!loadedFont || !loadedFont.generateShapes) {
                    console.error(`Font data for letter ${letter} is invalid.`);
                    return null;
                }
                const shapes = loadedFont.generateShapes(letter, 25.4);
                const geometry = new THREE.ShapeGeometry(shapes);
                geometry.computeBoundingBox();
                geometry.center();
                return geometry;
            }).filter(g => g !== null);

            setLetterGeometries(geometries);
        }).catch(error => {
            console.error("Error loading font:", error);
        });
    }, []);

    return (
        <>
                {/* <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="red" />
        </mesh> */}
            {letterGeometries.length > 0 && (
                
                <ParticleController
                    particleSystem={particleSystem}
                    letterGeometries={letterGeometries}
                />
            )}
        </>
    );
}
