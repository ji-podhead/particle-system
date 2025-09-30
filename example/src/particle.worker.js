import * as THREE from 'three';
import * as glMatrix from 'gl-matrix';
import { Particles } from '../../lib/particles.js';

const particleSystem = new Particles();
let initialized = false;

self.onmessage = (e) => {
    const { type, payload } = e.data;

    if (type === 'init') {
        particleSystem.initData(
            payload.amount,
            payload.maxLifeTime,
            payload.burstCount,
            payload.spawnOverTime,
            payload.spawnFrequency,
            payload.maxSpawnCount,
            payload.startPosition,
            payload.startScale,
            payload.startRotation,
            payload.startDirection,
            payload.startOpacity,
            payload.startColor,
            payload.startForce,
            payload.startForceFieldForce
        );
        particleSystem.startPS();
        initialized = true;

        self.postMessage({
            type: 'initialized',
            payload: {
                transform: particleSystem.properties.get('transform').array,
                scale: particleSystem.properties.get('scale').array,
                rotation: particleSystem.properties.get('rotation').array,
                color: particleSystem.properties.get('color').array,
                opacity: particleSystem.properties.get('opacity').array
            }
        }, [
            particleSystem.properties.get('transform').array.buffer,
            particleSystem.properties.get('scale').array.buffer,
            particleSystem.properties.get('rotation').array.buffer,
            particleSystem.properties.get('color').array.buffer,
            particleSystem.properties.get('opacity').array.buffer
        ]);
    }

    if(type === 'setAttributeOverLifeTime'){
        particleSystem.setAttributeOverLifeTime(payload.attribute, payload.start, payload.end)
    }
};

const run = () => {
    if (initialized) {
        const delta = 0.016; // Assuming 60fps
        particleSystem.updateSimulation(delta, false, true, true, false);

        const transferableProperties = {
            transform: particleSystem.properties.get('transform').array,
            scale: particleSystem.properties.get('scale').array,
            rotation: particleSystem.properties.get('rotation').array,
            color: particleSystem.properties.get('color').array,
            opacity: particleSystem.properties.get('opacity').array
        };

        self.postMessage({ type: 'update', payload: transferableProperties }, [
            transferableProperties.transform.buffer,
            transferableProperties.scale.buffer,
            transferableProperties.rotation.buffer,
            transferableProperties.color.buffer,
            transferableProperties.opacity.buffer
        ]);
    }
    requestAnimationFrame(run);
}

run();