"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Particles } from './lib/workerParticles';
import * as THREE from 'three';
import { useThree, useFrame } from "@react-three/fiber";
import { startParticleWorker, workerUpdateSimulation, killWorker } from './lib/workerHelper';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { loadFont } from './lib/utils/fontLoader.js';
const letters = ['JI Podhead', 'Fullstack', 'MlOPS'];
const PARTICLE_COUNT = 5000;
const letterPoints = []
const particleCountsPerWord= []
const lifetime = 3.5; // seconds
function ParticleController({ particleSystem, letterGeometries }) {
    const { scene } = useThree();
    const currentTargetIndex = useRef(0);
    const isInitialized = useRef(false);
    const animationState = useRef({
        startTime: null,
        isAnimating: false
    });

    useEffect(() => {
        const init = async () => {
            const factor= 0.02
            const boxSize= 0.0028*factor
            const boxDepth= 0.015*factor
            const geometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
            const material = new THREE.MeshLambertMaterial();
            material.transparent = true;
            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            const particleMesh = particleSystem.InitializeParticles(scene, mesh, PARTICLE_COUNT);
            particleSystem.setSpawnOverTime(false);
            particleSystem.setSourceAttributes("opacity", [1], false);
      particleSystem.setSourceAttributes("emission", [10, 10, 10], false, -45, 45);
            particleSystem.setSourceAttributes("color", [254.5, 254.0, 0], false, [50, 50, 50], [250, 250, 250]);
            particleSystem.setAttributeOverLifeTime("opacity", [0], [-0.1], false);
      particleSystem.setAttributeOverLifeTime("color", [0, 0, 0], [1, 0.1, 0], false, [0, 0, 3], [5, 0, 0]);

      particleSystem.setMaxLifeTime(lifetime);
            // particleSystem.setAttributeOverLifeTime("color", [50, 250, 255], [199, 255, 90], false, [0, 0, 3], [5, 0, 0]);
            particleSystem.setSpawnFrequency(1);
            particleSystem.setMaxSpawnCount(PARTICLE_COUNT);
            particleSystem.setBurstCount(PARTICLE_COUNT);
            // particleSystem.setSpawnOverTime(true);
            particleSystem.setForce([0.0, 0.0, 0.0]);
            
            particleSystem.setAttributeOverLifeTime("opacity", [0], [1], false);
            // particleSystem.setAttributeOverLifeTime("position", [0,0,0], [1,1,1], false); // Enable transform over lifetime
            particleSystem.updateValues(["transform", "color", "emission", "opacity", "rotation", "scale"]);
            console.log("letterGeometries", letterGeometries);
            if (letterGeometries.length > 1) {
                console.log("Setting initial letter geometries for particle animation.");
                for (let i = 0; i < letterGeometries.length; i++) {
                    console.log("Voxelizing letter:", letters[i]);
                    const { points, particleCount } = particleSystem.positionFromGeometryVoxelized(letterGeometries[i], boxSize*100, true);
                    letterPoints[i] = points;
                    particleCountsPerWord[i] = particleCount;
                    console.log(`- Voxelized into ${particleCount} particles.`);
                }
                particleSystem.setSourceAttributes("transform", letterPoints[0], false);
                // particleSystem.setAttributeOverLifeTime("transform", [0,0,0], letterPoints[1], false); // Enable transform over lifetime
                // particleSystem.setAttributeOverLifeTime("position", [letterPoints[0]], letterPoints[1], false); // Enable transform over lifetime
                currentTargetIndex.current = 0;
                animationState.current.startTime = Date.now();
                animationState.current.isAnimating = true;

            } else {
                console.error("Not enough letter geometries to start animation.");
                return;
            }
            particleSystem.startPS();
            startParticleWorker(particleSystem, "./ocWorker.js")
            isInitialized.current = true;
        };
        init();
        particleSystem.burst(1000);
        particleSystem.updateValues(["transform", "color", "emission", "opacity", "rotation", "scale"]);

    }, []);

    const elapsedTime = useRef(0);
    const simulaionIntervall = 1;
    const animationduration = lifetime ; // in milliseconds
    var animationDelta = 0
    var simulationDelta = 0

    useFrame((state, delta) => {
        if (!isInitialized.current) return console.log("not initialized yet");
            elapsedTime.current += delta;
            animationDelta += delta; // convert to milliseconds
            simulationDelta += delta;

                workerUpdateSimulation(0, delta, true, true);
                simulationDelta=0
                particleSystem.updateValues(["transform", "color", "emission", "opacity", "rotation", "scale"]);
                
            
            if (animationDelta > animationduration*1000) {
                animationDelta=0
                var nextIndex = (currentTargetIndex.current + 1);
                if (nextIndex >= letters.length) { nextIndex = 0; }
                    console.log("Index", nextIndex);
                    console.log("letter", letters[nextIndex])
                    particleSystem.setSourceAttributes("transform", letterPoints[nextIndex-1], false);
                    particleSystem.setAttributeOverLifeTime("transform", letterPoints[nextIndex-1], letterPoints[nextIndex], false); // Enable transform over lifetime
                    particleSystem.burst(particleCountsPerWord[nextIndex]);
                    currentTargetIndex.current = nextIndex;
            }
    });

    return null;
}

export default function LetterAnimation() {
    const particleSystem = useMemo(() => new Particles(), []);
    const [letterGeometries, setLetterGeometries] = useState([]);

    useEffect(() => {
        const createGeometries = async () => {
            try {
                const loadedFont = await loadFont('/fonts/font.json');
                const geometries = letters.map(letter => {
                    if (!loadedFont || !loadedFont.generateShapes) {
                        console.error(`Font data for letter ${letter} is invalid.`);
                        return null;
                    }
                    const textGeometry = new TextGeometry(letter, {
                        font: loadedFont,
                        size: 0.11,
                        height: 0.02, // Add depth for the voxelization to work
                        curveSegments: 1,
                        bevelEnabled: false,
                    });
                    textGeometry.computeBoundingBox();
                    textGeometry.center();
                    return textGeometry;
                }).filter(g => g !== null);
                setLetterGeometries(geometries);
            } catch (error) {
                console.error("Error loading font:", error);
            }
        };

        createGeometries();
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
