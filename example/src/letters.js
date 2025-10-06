"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Particles } from './lib/workerParticles';
import * as THREE from 'three';
import { useThree, useFrame } from "@react-three/fiber";
import { startParticleWorker, workerUpdateSimulation, killWorker, workerResetAllParticles, setWorkerEventHandler } from './lib/workerHelper';
import { loadFont } from './lib/utils/fontLoader.js';
import { generateTextGeometries } from './lib/utils/geometryUtils.js';
const letters = ['Fullstack', 'MlOPS','JI Podheadd'];
const letterPoints = []
const particleCountsPerWord= []
const IDLE_DURATION = 2; // seconds for a word to be displayed
const TRANSITION_UP_DURATION = 0.5;
const TRANSITION_XZ_DURATION = 0.5;
const TRANSITION_DOWN_DURATION = 0.5;
const lifeTime = 8
let spawnCount=0;
const AnimationPhase = {
    IDLE: 'idle',
    TRANSITION_UP: 'transition_up',
    TRANSITION_XZ: 'transition_xz',
    TRANSITION_DOWN: 'transition_down'
};
function ParticleController({ particleSystem, letterGeometries }) {
    const { scene } = useThree();
    const currentTargetIndex = useRef(0);
    const isInitialized = useRef(false);
    const animationPhase = useRef(AnimationPhase.IDLE);
    const whirlwindPoints = useRef(null);
    const phaseTimer = useRef(0);
    const animationState = useRef({
        startTime: null,
        isAnimating: false
    });
    // todo: why do i have to set burst count to spawn parrticles if spawn over time is false?
    useEffect(() => {
        const init = async () => {
            const factor= 0.02
            const boxSize= 0.0028*factor
            const boxDepth= 0.015*factor
            const geometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
            const material = new THREE.MeshLambertMaterial({
                color: 0xffffff, // Base color, will be modulated by particle color
                emissive: 0xffffff, // Base emissive color
                emissiveIntensity: 1, // How strong the emissive light is
                transparent: true,
                opacity: 0.5, // Starting opacity
                side: THREE.BackSide // Render the back side of the material, as it points inwards
            });            material.transparent = true;
            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = false;
            if (letterGeometries.length > 1) {
                console.log("Setting initial letter geometries for particle animation.");
                for (let i = 0; i < letterGeometries.length; i++) {
                    console.log("Voxelizing letter:", letters[i]);
                    const { points, particleCount } = particleSystem.positionFromGeometryVoxelized(letterGeometries[i], boxSize*100,false);
                    letterPoints[i] = points;
                    particleCountsPerWord[i] = particleCount;
                    if(particleCount>spawnCount) spawnCount= particleCount
                    console.log(`- Voxelized into ${particleCount} particles.`);
                }
                console.log(letterPoints[0])
                console.log("Max particles in a word:", spawnCount);
                for (let i = 0; i < letterPoints.length; i++) {
                    if (particleCountsPerWord[i] >= spawnCount) {
                        console.log("skipping padding for:", letters[i]);
                        continue;
                    }
                    const newArray = new Float32Array(spawnCount * 3);
                    const originalParticleCount = particleCountsPerWord[i];
                    const originalCoordinatesLength = originalParticleCount * 3;
                    // Copy existing points
                    newArray.set(letterPoints[i].slice(0, originalCoordinatesLength));
                    for (let p = originalParticleCount; p < spawnCount; p++) {
                        const randomParticleIndex = Math.floor(Math.random() * originalParticleCount);
                        const sourceIndex = randomParticleIndex * 3;
                        const targetIndex = p * 3;
                        newArray[targetIndex] = letterPoints[i][sourceIndex];
                        newArray[targetIndex + 1] = letterPoints[i][sourceIndex + 1];
                        newArray[targetIndex + 2] = letterPoints[i][sourceIndex + 2];
                    }
                    letterPoints[i] = newArray;
                    console.log(`Padded letter ${letters[i]} to ${spawnCount} particles with random duplicates.`);
                }
            particleSystem.InitializeParticles(scene, mesh, spawnCount);
            // particleSystem.setSourceAttributes("opacity", [0], false);
            // particleSystem.setSourceAttributes("emission", [0, 0, 0], false, -45, 45);
            particleSystem.setSourceAttributes("color", [50.5, 54.0, 0], false, [50, 50, 50], [250, 250, 250]);
            particleSystem.setAttributeOverLifeTime("color", [0, 0, 0], [199, 255, 90], true, [0, 0, 3], [5, 0, 0]);
            particleSystem.setMaxLifeTime(2); // Make lifetime effectively infinite
            particleSystem.setSpawnOverTime(true);
            particleSystem.setSpawnFrequency(0.001)
            particleSystem.setForce([0.0, 0.0, 0.0]); // Default force
            particleSystem.setMaxSpawnCount(spawnCount);
            particleSystem.setBurstCount(10);
            particleSystem.setAttributeOverLifeTime("opacity", [0], [1], false);
            particleSystem.setSourceAttributes("transform", letterPoints[2], false);
            // particleSystem.setAttributeOverLifeTime("position", letterPoints[2], letterPoints[0], false); // Enable transform over lifetime
            // particleSystem.setAttributeOverLifeTime("position", letterPoints[0], letterPoints[0]);
            particleSystem.startPS();
            startParticleWorker(particleSystem, "./ocWorker.js")
            // particleSystem.onParticleKill("setLifetimeBasedOnY", {"particleSystemState":"TRANSITION_UP", "index":null},true)
            currentTargetIndex.current = 0;
            animationState.current.startTime = Date.now();
            animationState.current.isAnimating = true;
            workerResetAllParticles(0) // Removed as it resets instanceCount to 0 and prevents spawning
            // particleSystem.burst(spawnCount)
            isInitialized.current = true;
 
            } else {
                console.error("Not enough letter geometries to start animation.");
                return;
            }
            // particleSystem.burst(spawnCount)
        };
        init();
    }, []);
    const elapsedTime = useRef(0);
    const intervalSeconds = 0.0021; // Desired interval in seconds
    let initialBurst=false
    useFrame((state, delta) => {
        if (!isInitialized.current) return; 
        // else if( !initialBurst){ particleSystem.burst(spawnCount); initialBurst=true}
        phaseTimer.current += delta;
        elapsedTime.current += delta;
        let phaseCompleted = false;
        if (animationPhase.current === AnimationPhase.IDLE && phaseTimer.current >= IDLE_DURATION) {
            animationPhase.current = AnimationPhase.TRANSITION_UP;
            phaseCompleted = true;
        } else if (animationPhase.current === AnimationPhase.TRANSITION_UP && phaseTimer.current >= TRANSITION_UP_DURATION) {
            animationPhase.current = AnimationPhase.TRANSITION_XZ;
            phaseCompleted = true;
        } else if (animationPhase.current === AnimationPhase.TRANSITION_XZ && phaseTimer.current >= TRANSITION_XZ_DURATION) {
            animationPhase.current = AnimationPhase.TRANSITION_DOWN;
            phaseCompleted = true;
        } else if (animationPhase.current === AnimationPhase.TRANSITION_DOWN && phaseTimer.current >= TRANSITION_DOWN_DURATION) {
            animationPhase.current = AnimationPhase.IDLE;
            phaseCompleted = true;
        }
        // if (phaseCompleted) {
        //     phaseTimer.current = 0;
        //     const currentPoints = letterPoints[currentTargetIndex.current];
        //     const nextIndex = (currentTargetIndex.current + 1) % letters.length;
        //     const nextPoints = letterPoints[nextIndex];
        //     if (animationPhase.current === AnimationPhase.TRANSITION_UP) {
        //         console.log("Transitioning to UP");
        //         const upPoints = new Float32Array(spawnCount * 3);
        //         for (let i = 0; i < spawnCount * 3; i += 3) {
        //             upPoints[i] = currentPoints[i];
        //             upPoints[i + 1] = currentPoints[i + 1] + 0.2; // Fly up
        //             upPoints[i + 2] = currentPoints[i + 2];
        //         }
        //         whirlwindPoints.current = upPoints; // Store for next phase
        //         particleSystem.setAttributeOverLifeTime("position", currentPoints, upPoints, false);
        //     } else if (animationPhase.current === AnimationPhase.TRANSITION_XZ) {
        //         console.log("Transitioning to XZ");
        //         const xzPoints = new Float32Array(spawnCount * 3);
        //         const previousUpPoints = whirlwindPoints.current;
        //         for (let i = 0; i < spawnCount * 3; i += 3) {
        //             xzPoints[i] = nextPoints[i]; // Target X
        //             xzPoints[i + 1] = previousUpPoints[i + 1]; // Keep Y
        //             xzPoints[i + 2] = nextPoints[i + 2]; // Target Z
        //         }
        //         whirlwindPoints.current = xzPoints; // Store for next phase
        //         particleSystem.setAttributeOverLifeTime("position", previousUpPoints, xzPoints, false);
        //     } else if (animationPhase.current === AnimationPhase.TRANSITION_DOWN) {
        //         console.log("Transitioning to DOWN");
        //         const previousXZPoints = whirlwindPoints.current;
        //         particleSystem.setAttributeOverLifeTime("position", previousXZPoints, nextPoints, false);
        //         currentTargetIndex.current = nextIndex;
        //     } else if (animationPhase.current === AnimationPhase.IDLE) {
        //         console.log("Now in IDLE phase");
        //     }
        // }
        if (elapsedTime.current >= intervalSeconds) {
            workerUpdateSimulation(0, elapsedTime.current, false, false);
                // console.log(particleSystem.instance.instanceCount);
            particleSystem.updateValues(["transform", "color", "emission", "opacity", "rotation", "scale"]);
            elapsedTime.current -= delta;
        }
    });
    }
export default function LetterAnimation() {
    const particleSystem = useMemo(() => new Particles(), []);
    const [letterGeometries, setLetterGeometries] = useState([]);
    useEffect(() => {
        const createGeometries = async () => {
            try {
                const loadedFont = await loadFont('/fonts/font.json');
                // Use the new utility function to generate geometries
                const geometries = generateTextGeometries(
                    letters,
                    loadedFont,
                    0.11, // size
                    0.02, // height (depth)
                    1,    // curveSegments
                    false // bevelEnabled
                );
                setLetterGeometries(geometries);
            } catch (error) {
                console.error("Error loading font:", error);
            }
        };
        createGeometries();
    }, []);
    useEffect(() => {
        if (letterGeometries.length > 0) {
            const workerIndex = 0; // Assuming only one worker instance
            setWorkerEventHandler(workerIndex, 'onParticleBirth', 'setLifetimeBasedOnY');
        }
    }, [letterGeometries]); // Re-run when geometries are loaded

    return (
        <>
            {letterGeometries.length > 0 && (

                <ParticleController
                    particleSystem={particleSystem}
                    letterGeometries={letterGeometries}
                />
            )}
        </>
    );
}
