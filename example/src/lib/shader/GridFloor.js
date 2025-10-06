import React from 'react';
import * as THREE from 'three';

const GridFloor = () => {
    const vertexShader = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    const fragmentShader = `
        varying vec2 vUv;
        uniform float time;
        uniform vec3 color;

        void main() {
            vec2 coord = vUv * 20.0; // Grid density
            vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
            float line = min(grid.x, grid.y);

            float glow = 1.0 - clamp(line, 0.0, 1.0);
            vec3 finalColor = color * glow;

            gl_FragColor = vec4(finalColor, glow * 0.5);
        }
    `;

    const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
            time: { value: 0.0 },
            color: { value: new THREE.Color(0x00ff00) } // Tron green
        },
        transparent: true,
        depthWrite: false,
    });

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} material={material}>
            <planeGeometry args={[100, 100]} />
        </mesh>
    );
};

export default GridFloor;