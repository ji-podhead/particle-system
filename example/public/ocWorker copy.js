import { ParticleWorkerLogic } from './particleWorkerLogic.js';

const workerLogic = new ParticleWorkerLogic();

// --- User-defined functions library ---
// Define all functions that can be assigned to particle events here.
const userFunctions = new Map([
    ['setLifetimeBasedOnY', (particleSystemState, index) => {
        const particleAttributes = particleSystemState.properties;
        const positions = particleAttributes.get('transform').array;
        const lifetimes = particleAttributes.get('lifeTime').array;
        
        const yPos = positions[index * 3 + 1];
        const factor = 10; // Example factor, can be passed as an argument if needed
        
        const maxLifetime = Math.abs(yPos) * factor + 0.5;
        const lifetimeIndex = index * 2;
        lifetimes[lifetimeIndex + 1] = maxLifetime; // Set max lifetime
        lifetimes[lifetimeIndex] = Math.random() * maxLifetime; // Randomize current lifetime
    }]
    // Add more functions here with unique keys
]);


// --- Register the function library with the worker logic ---
workerLogic.registerFunctions(userFunctions);


// --- Assign the message handler ---
// The worker's onmessage handler is now managed by the ParticleWorkerLogic class.
self.onmessage = workerLogic.onmessage.bind(workerLogic);
