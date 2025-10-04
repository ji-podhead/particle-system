"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Particles } from './lib/workerParticles';
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { useThree, useFrame } from "@react-three/fiber";
import { startParticleWorker, workerUpdateSimulation, killWorker } from './lib/workerHelper';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'; // <-- Füge diese Zeile hinzu!
const letters = ['JI Podhead', 'Fullstack', 'MlOPS'];
const PARTICLE_COUNT = 5000;
const letterPoints = []
const particleCountsPerWord= []
const lifetime = 5; // seconds
function ParticleController({ particleSystem, letterGeometries }) {
    const { scene } = useThree();
    const currentTargetIndex = useRef(0);
    const isInitialized = useRef(false);
    const animationState = useRef({
        startTime: null,
        duration: lifetime * 1000, // Convert to milliseconds
        isAnimating: false
    });

    useEffect(() => {
        const init = async () => {
            const factor= 0.02
            const boxSize= 0.0028*factor
            const boxDepth= 0.015*factor
            const geometry = new THREE.BoxGeometry(boxSize,boxSize,boxDepth) //SphereGeometry(0.0021, 2, 2);
            const material = new THREE.MeshLambertMaterial({ color: '#00ff41', emissive: '#00ff41', emissiveIntensity: 2 });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            const particleMesh = particleSystem.InitializeParticles(scene, mesh, PARTICLE_COUNT);
            particleSystem.setSpawnOverTime(false);
            particleSystem.setSourceAttributes("opacity", [0.5], false);
            particleSystem.setSourceAttributes("emission", [100, 50, 52], false, [50, 50, 50], [250, 250, 250])
            particleSystem.setSourceAttributes("color", [50, 100, 100], true, [50, 50, 50], [50, 50, 150]);
            particleSystem.setMaxLifeTime(lifetime);
            // particleSystem.setAttributeOverLifeTime("color", [50, 250, 255], [199, 255, 90], false, [0, 0, 3], [5, 0, 0]);
            particleSystem.setSpawnFrequency(0);
            particleSystem.setMaxSpawnCount(PARTICLE_COUNT);
            particleSystem.setBurstCount(0);
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
                for (let i = 0; i < letterGeometries.length; i++) {
                    console.log("Calculating points for letter:", letters[i]);
                    particleCountsPerWord[i]=particleSystem.calculateParticlesPerWord(letterGeometries[i], boxSize,100,2000);
                    console.log("particleCountsPerWord", particleCountsPerWord)
                    letterPoints[i] = particleSystem.positionFromGeometryFill(letterGeometries[i], particleCountsPerWord[i], boxSize,false, 0, 0, true);
                    console.log("points of " + letters[i], letterPoints[i])
                }
                particleSystem.setSourceAttributes("transform", letterPoints[0], false);
                // particleSystem.setAttributeOverLifeTime("position", letterPoints[0], letterPoints[1], false); // Enable transform over lifetime
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
        particleSystem.burst(particleCountsPerWord[0]);
        particleSystem.updateValues(["transform", "color", "emission", "opacity", "rotation", "scale"]);

    }, []);

    const elapsedTime = useRef(0);
    const simulaionIntervall = 0.01;
    const animationduration = lifetime * 1000; // in milliseconds
    var animationDelta = 0
    useFrame((state, delta) => {
        if (!isInitialized.current) return console.log("not initialized yet");
            elapsedTime.current += delta;
            animationDelta += delta * 1000; // convert to milliseconds

            if (elapsedTime.current >= simulaionIntervall + 0.01) {
                workerUpdateSimulation(0, delta, true, true);
                particleSystem.updateValues(["transform", "color", "emission", "opacity", "rotation", "scale"]);
                elapsedTime.current -= simulaionIntervall;
            }
            if (animationDelta > animationduration) {
                animationDelta=0
                var nextIndex = (currentTargetIndex.current + 1);
                if (nextIndex >= letters.length) { nextIndex = 0; }
                    console.log("Index", nextIndex);
                    console.log("letter", letters[nextIndex])
                    particleSystem.setSourceAttributes("transform", letterPoints[nextIndex], false);
                    // particleSystem.setAttributeOverLifeTime("position", letterPoints[nextIndex], letterPoints[nextNextIndex], false); // Enable transform over lifetime
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
const textGeometry = new TextGeometry(letter, {
    font: loadedFont,
    size: 0.11,
    height: 1,
    depth: 0,
    curveSegments: 1,
    bevelEnabled: false,
});
textGeometry.computeBoundingBox();
textGeometry.center();
return textGeometry;
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
