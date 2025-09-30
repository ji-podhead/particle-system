import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import Worker from './particle.worker.js';
import './App.css';

function App() {
    const mountRef = useRef(null);
    const workerRef = useRef(null);
    const particleMeshRef = useRef(null);

    useEffect(() => {
        const currentMount = mountRef.current;
        workerRef.current = new Worker();

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
        camera.position.z = 500;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        currentMount.appendChild(renderer.domElement);

        const geometry = new THREE.BoxGeometry(10, 10, 10);
        const material = new THREE.MeshNormalMaterial();

        workerRef.current.onmessage = (e) => {
            const { type, payload } = e.data;

            if (type === 'initialized') {
                const { transform, scale, rotation, color, opacity } = payload;

                const instancedGeometry = new THREE.InstancedBufferGeometry();
                instancedGeometry.index = geometry.index;
                instancedGeometry.setAttribute('position', geometry.attributes.position);

                instancedGeometry.setAttribute('instancePosition', new THREE.InstancedBufferAttribute(transform, 3));
                instancedGeometry.setAttribute('instanceScale', new THREE.InstancedBufferAttribute(scale, 3));
                instancedGeometry.setAttribute('instanceRotation', new THREE.InstancedBufferAttribute(rotation, 3));
                instancedGeometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(color, 3));
                instancedGeometry.setAttribute('instanceOpacity', new THREE.InstancedBufferAttribute(opacity, 1));

                const mesh = new THREE.Mesh(instancedGeometry, material);
                mesh.frustumCulled = false;
                scene.add(mesh);
                particleMeshRef.current = mesh;
            }

            if (type === 'update' && particleMeshRef.current) {
                const { transform, scale, rotation, color, opacity } = payload;
                const mesh = particleMeshRef.current;
                mesh.geometry.attributes.instancePosition.array = transform;
                mesh.geometry.attributes.instanceScale.array = scale;
                mesh.geometry.attributes.instanceRotation.array = rotation;
                mesh.geometry.attributes.instanceColor.array = color;
                mesh.geometry.attributes.instanceOpacity.array = opacity;

                mesh.geometry.attributes.instancePosition.needsUpdate = true;
                mesh.geometry.attributes.instanceScale.needsUpdate = true;
                mesh.geometry.attributes.instanceRotation.needsUpdate = true;
                mesh.geometry.attributes.instanceColor.needsUpdate = true;
                mesh.geometry.attributes.instanceOpacity.needsUpdate = true;
            }
        };

        workerRef.current.postMessage({
            type: 'init',
            payload: {
                amount: 1000,
                maxLifeTime: { values: 5 },
                burstCount: 1000,
                spawnOverTime: false,
                spawnFrequency: 0,
                maxSpawnCount: 1000,
                startPosition: { values: [0, 0, 0], random: true, minRange: -200, maxRange: 200 },
                startScale: { values: [1, 1, 1] },
                startRotation: { values: [0, 0, 0] },
                startDirection: { values: [0, 0, 0] },
                startOpacity: { values: [1] },
                startColor: { values: [1, 1, 1], random: true, minRange: 0, maxRange: 1 },
                startForce: { values: [0, 0, 0] },
                startForceFieldForce: { values: [0, 0, 0] }
            }
        });

        workerRef.current.postMessage({
            type: 'setAttributeOverLifeTime',
            payload: {
                attribute: 'scale',
                start: [0.1, 0.1, 0.1],
                end: [5, 5, 5]
            }
        });

        workerRef.current.postMessage({
            type: 'setAttributeOverLifeTime',
            payload: {
                attribute: 'color',
                start: [1, 0, 0],
                end: [0, 1, 1]
            }
        });

        const animate = () => {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        };
        animate();

        return () => {
            currentMount.removeChild(renderer.domElement);
            workerRef.current.terminate();
        };
    }, []);

    return <div ref={mountRef} className="App" style={{ width: '100vw', height: '100vh' }} />;
}

export default App;