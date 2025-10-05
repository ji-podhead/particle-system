"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Particles } from './lib/workerParticles';
import * as THREE from 'three';
import { useThree, useFrame } from "@react-three/fiber";
import { startParticleWorker, workerUpdateSimulation, killWorker } from './lib/workerHelper';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { loadFont } from './lib/utils/fontLoader.js';
const letters = ['JI Podheadd', 'Fullstack', 'MlOPS'];
const PARTICLE_COUNT = 6000;
const letterPoints = []
const particleCountsPerWord= []
const lifetime = 1; // seconds
let spawnCount=0
function ParticleController({ particleSystem, letterGeometries }) {
    const { scene } = useThree();
    const currentTargetIndex = useRef(0);
    const isInitialized = useRef(false);
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
            const material = new THREE.MeshLambertMaterial();
            material.transparent = true;
            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = false;
            const particleMesh = particleSystem.InitializeParticles(scene, mesh, PARTICLE_COUNT);
            particleSystem.setSpawnOverTime(false);
            particleSystem.setSourceAttributes("opacity", [1], false);
            particleSystem.setSourceAttributes("emission", [10, 10, 10], false, -45, 45);
            particleSystem.setSourceAttributes("color", [254.5, 254.0, 0], false, [50, 50, 50], [250, 250, 250]);
            // particleSystem.setAttributeOverLifeTime("opacity", [0], [-0.1], false);
            particleSystem.setAttributeOverLifeTime("color", [0, 0, 0], [1, 0.1, 0], false, [0, 0, 3], [5, 0, 0]);

            particleSystem.setMaxLifeTime(lifetime);
            // particleSystem.setAttributeOverLifeTime("color", [50, 250, 255], [199, 255, 90], false, [0, 0, 3], [5, 0, 0]);
            // particleSystem.setSpawnFrequency(0.1);
            particleSystem.setMaxSpawnCount(PARTICLE_COUNT);
            particleSystem.setBurstCount(PARTICLE_COUNT);
            particleSystem.setSpawnOverTime(true);
            particleSystem.setForce([0.0, 0.0, 0.0]);
            
            // particleSystem.setAttributeOverLifeTime("opacity", [0], [1], false);
            // particleSystem.setAttributeOverLifeTime("position", [0,0,0], [1,1,1], false); // Enable transform over lifetime
            particleSystem.updateValues(["transform", "color", "emission", "opacity", "rotation", "scale"]);
            console.log("letterGeometries", letterGeometries);
            
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
                // particleSystem.setMaxSpawnCount(spawnCount);
                // particleSystem.setBurstCount(spawnCount);
                console.log("Max particles in a word:", spawnCount);
                for (let i = 0; i < letterPoints.length; i++) {
                    // Pad with zeros if necessary
                    if(particleCountsPerWord[i] >= spawnCount) {console.log("skipping");continue};
                    const newArray = new Float32Array(spawnCount * 3)
                    letterPoints[i].map((v, idx) => { newArray[idx] = v; })
                    let count =0
                    for (let i2 = letterPoints[i].length    ; i2 < spawnCount; i2++)
                    {
                        count++;
                        newArray[i2]= letterPoints[i][count];
                    }
                    letterPoints[i] = newArray;
                    particleCountsPerWord[i] = spawnCount;
                    console.log(`Padded letter ${letters[i]} to ${spawnCount} particles.`);
                }
                // Set initial positions to the first word
                // const transformArray = new Float32Array(letterPoints[0]);
                // for (let i = 1; i < letterPoints[0].length; i++) {
                //     transformArray[i] = letterPoints[0][i]+ (Math.random() - 0.5) * boxDepth; // Add random depth variation
                // }

                // particleSystem.burst(spawnCount);
                // particleSystem.setMaxSpawnCount(particleCountsPerWord[0]);
                // particleSystem.setBurstCount(particleCountsPerWord[0]);
                // particleSystem.setMaxSpawnCount(particleCountsPerWord[0]);
                // particleSystem.setAttributeOverLifeTime("position", [letterPoints[0]], letterPoints[1], false); // Enable transform over lifetime
                currentTargetIndex.current = 0;
                animationState.current.startTime = Date.now();
                animationState.current.isAnimating = true;

            } else {
                console.error("Not enough letter geometries to start animation.");
                return;
            }
            // particleSystem.setSourceAttributes("transform", letterPoints[0], false);
            particleSystem.setStartPositionFromArray(letterPoints[0]);
            particleSystem.startPS();
            startParticleWorker(particleSystem, "./ocWorker.js")

            // particleSystem.burst(spawnCount);
            // workerUpdateSimulation(0, 0, true,true);
            particleSystem.setAttributeOverLifeTime("position",letterPoints[0],letterPoints[1]); // Enable transform over lifetime

            particleSystem.updateValues(["transform", "color", "emission", "opacity", "rotation", "scale"]);

            isInitialized.current = true;

        };
        init();
        // workerUpdateSimulation(0, 0, true,true);

    }, []);

    const elapsedTime = useRef(0);
  const intervalSeconds = 0.021; // Desired interval in seconds
    var animationBreak=2//   useFrame((state, delta) => {
//     if(!isInitialized.current) return console.log("not initialized yet");
//     elapsedTime.current += delta; // Accumulate delta time

//     if (elapsedTime.current >= intervalSeconds) {
//       // Call the worker function at the desired interval
//       // The original code passed delta to workerUpdateSimulation, so we continue to do so.
//       // If a fixed value is needed, this would require further clarification.
//     //   particleSystem.updateSimulation(0,true,true,true)
//       workerUpdateSimulation(0, delta,true, true);
//       particleSystem.updateValues(["transform", "color", "emission", "opacity", "rotation", "scale"]);  

//       elapsedTime.current -= intervalSeconds; // Subtract the interval to maintain accuracy
//     }
// },[isInitialized.current]);
    useFrame((state, delta) => {
        // console.log("isInitialized", isInitialized.current);
    if (!isInitialized.current) return console.log("not initialized yet");
    // if(animationBreak>0){
    //     animationBreak-=delta
    //     console.log("break", animationBreak)
    // }else{
        elapsedTime.current += delta; // Accumulate delta time
        if (elapsedTime.current >= intervalSeconds) {
            workerUpdateSimulation(0, delta, true,true);
            elapsedTime.current = -delta
        
        if(particleSystem.getAliveCount()<=0){
                var nextIndex = (currentTargetIndex.current + 1);
                if (nextIndex >= letters.length) { nextIndex = 0; }
                console.log("Index", nextIndex);
                console.log("letter", letters[nextIndex])
                particleSystem.burst(spawnCount);
                // particleSystem.setStartPositionFromArray(letterPoints[currentTargetIndex.current]);
                // particleSystem.setSourceAttributes("transform", letterPoints[currentTargetIndex.current], false);
                particleSystem.setAttributeOverLifeTime("position", letterPoints[currentTargetIndex.current], letterPoints[nextIndex], false); // Enable transform over lifetime
                workerUpdateSimulation(0, delta, false,false);

                animationBreak=2
                currentTargetIndex.current = nextIndex;
                console.log("next burst")
                console.log("alive", particleSystem.getAliveCount())
            }
            particleSystem.updateValues(["transform", "color", "emission", "opacity", "rotation", "scale"]);
        }    
    // }
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
