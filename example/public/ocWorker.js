// import { ParticleWorkerLogic } from './particleWorkerLogic.js';
importScripts('./particleWorkerLogic.js')
const workerLogic = new ParticleWorkerLogic();

// --- User-defined functions library ---
// Define all functions that can be assigned to particle events here.
const userArgs = [{particleSystemState: null, index: null}]; // Example args structure
function setLifetimeBasedOnY(particleSystemState, index) {
      const particleAttributes = particleSystemState.properties;
        const positions = workerLogic.object1.properties.get('transform').array;
        const lifetimes = workerLogic.object1.properties.get("sourceValues").get('lifeTime').array;
        const position = workerLogic.object1.properties.get("attributeOverLifeTime").get('position').array;
        const yPos = positions[index * 3 + 1];
        const factor = 10; // Example factor, can be passed as an argument if needed
        
        const maxLifetime = Math.abs(yPos) * factor + 0.5;
        const lifetimeIndex = index * 2;
        lifetimes[lifetimeIndex + 1] = maxLifetime; // Set max lifetime
        lifetimes[lifetimeIndex] = 0; // Randomize current lifetime
        position[lifetimeIndex+1] = 10
        console.log("setLifetimeBasedOnY",index, yPos, maxLifetime)
        console.log(lifetimes)
    }
const userFunctions = new Map([
    ['setLifetimeBasedOnY',userArgs[0]],
    // Add more functions here with unique keys
]);




// // --- Register the function library with the worker logic ---
workerLogic.registerFunctions(userFunctions);

self.onmessage = function (input) {workerLogic._onmessage(input)}