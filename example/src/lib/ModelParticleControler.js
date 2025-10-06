import React, { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Particles } from './workerParticles';
import { textureVoxelizer } from './utils/textureVoxelizer';
import * as THREE from 'three';

function ModelParticleController({ modelGeometries }) {
    const { scene } = useThree();
    const particleSystem = useMemo(() => new Particles(), []);

    useEffect(() => {
        if (modelGeometries.length === 0) return;

        const mesh = new THREE.Mesh(modelGeometries[0]); // Assuming one mesh for now
        const { positions, colors } = textureVoxelizer(mesh, 50); // 50 is the resolution

        const particleCount = positions.length / 3;
        if (particleCount === 0) return;
        
        const geometry = new THREE.BoxGeometry(0.01, 0.01, 0.01);
        const material = new THREE.MeshBasicMaterial({ vertexColors: true });
        const particleMesh = new THREE.Mesh(geometry, material);

        particleSystem.InitializeParticles(scene, particleMesh, particleCount);
        particleSystem.setStartPositionFromArray(positions, false, 0, 0, false);
        
        // This is a new feature, we need to add a way to set colors directly
        // For now, I'll add a placeholder function in the Particles class.
        // I will implement this properly in the next step.
        if (particleSystem.setParticleColors) {
            particleSystem.setParticleColors(colors);
        }

        particleSystem.startPS();

    }, [modelGeometries, scene, particleSystem]);

    return null; // This component only manages the particle system
}

export default ModelParticleController;