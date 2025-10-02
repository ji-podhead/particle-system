"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Particles } from './lib/workerParticles';
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { useThree, useFrame } from "@react-three/fiber";
import { startParticleWorker, workerUpdateSimulation, killWorker } from './lib/workerHelper';

const letters = ['A', 'B', 'C'];
const PARTICLE_COUNT = 4000;

function ParticleController({ particleSystem, letterGeometries }) {
    const { scene } = useThree();
    const currentTargetIndex = useRef(0);
    const isInitialized = useRef(false);

    useEffect(() => {
        const geometry = new THREE.SphereGeometry(0.02, 8, 8);
        const material = new THREE.MeshStandardMaterial({ color: '#00ff41', emissive: '#00ff41', emissiveIntensity: 2 });
        const mesh = new THREE.Mesh(geometry, material);

        const pMesh = particleSystem.InitializeParticles(scene, mesh, PARTICLE_COUNT);

        particleSystem.setSpawnOverTime(true);
        particleSystem.setSourceAttributes("opacity", [1], false);
        particleSystem.setSourceAttributes("emission", [255, 255, 252], true, [50, 50, 50], [250, 250, 250]);
        particleSystem.setSourceAttributes("scale", [1, 1, 1], true, 0.1, 0.1);
        particleSystem.setSourceAttributes("rotation", [0, 0, 0], true, -45, 45);
        particleSystem.setSourceAttributes("emission", [10, 10, 10], false, -45, 45);
        particleSystem.setMaxSpawnCount(PARTICLE_COUNT);
        particleSystem.setBurstCount(PARTICLE_COUNT);
        particleSystem.setMaxLifeTime(1, true, 1.25, 4);
        particleSystem.setStartDirection(0, 0, 0, false, 0, 0);
        particleSystem.setAttributeOverLifeTime("opacity", [0], [1], false);
        particleSystem.setAttributeOverLifeTime("rotation", [0, 0, 0], [0,0,0], false);
        particleSystem.setAttributeOverLifeTime("force", [0, 0, 0], [0, 0, 0], false);
        particleSystem.setAttributeOverLifeTime("color", [255, 250, 255], [199, 255, 90], true, [0, 0, 3], [5, 0, 0]);
        particleSystem.setForce([0, 0, 0]);


        if (letterGeometries[0]) {
            particleSystem.setStartPositionFromGeometryFill(letterGeometries[0], PARTICLE_COUNT);
            particleSystem.startPS();
            particleSystem.updateValues(["transform", "color", "emission", "opacity", "rotation", "scale"]);
                    startParticleWorker(particleSystem, "./ocWorker.js");

        } else {
            console.error("Initial letter geometry is undefined, cannot set start position.");
            return;
        }


        isInitialized.current = true;

        const interval = setInterval(() => {
            if (isInitialized.current) {
                const newIndex = (currentTargetIndex.current + 1) % letters.length;
                currentTargetIndex.current = newIndex;
                if (letterGeometries[newIndex]) {
                    particleSystem.setStartPositionFromGeometryFill(letterGeometries[newIndex], PARTICLE_COUNT);
                } else {
                    console.warn(`Letter geometry for index ${newIndex} is undefined, skipping update.`);
                }
            }
        }, 3000);

        return () => {
            clearInterval(interval);
            if (particleSystem.pointCloud && particleSystem.pointCloud[0]) {
                scene.remove(particleSystem.pointCloud[0]);
            }
            geometry.dispose();
            material.dispose();
            killWorker();
        };
    }, [particleSystem, letterGeometries, scene]);

    const elapsedTime = useRef(0);
    const intervalSeconds = 0.01;

    useFrame((state, delta) => {
        elapsedTime.current += delta;
        if (elapsedTime.current >= intervalSeconds) {
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
                const shapes = loadedFont.generateShapes(letter, 1.2);
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
            {letterGeometries.length > 0 && (
                <ParticleController
                    particleSystem={particleSystem}
                    letterGeometries={letterGeometries}
                />
            )}
        </>
    );
}
