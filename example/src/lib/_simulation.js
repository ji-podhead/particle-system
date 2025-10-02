// This file contains the shared, pure simulation logic for the particle system.
const lerp = (x, y, a) => x * (1 - a) + y * a;
const clamp = (a, min = 0, max = 1) => Math.min(max, Math.max(min, a));
const invlerp = (x, y, a) => clamp((a - x) / (y - x));
const range = (x1, y1, x2, y2, a) => lerp(x2, y2, invlerp(x1, y1, a));

export function resetParticle(particleSystemState, index) {
    const sourceValues = particleSystemState.properties.get("sourceValues");
    for(const [key, value] of sourceValues.entries()) {
        if (particleSystemState.properties.has(key)) {
            const prop = particleSystemState.properties.get(key);
            if (prop.array && value.values) {
                const stride = value.values.length;
                for(let i=0; i<stride; ++i) {
                    prop.array[index * stride + i] = value.values[i];
                }
                 // Handle randomization
                 if (value.random && value.minRange && value.maxRange) {
                    for(let i=0; i<stride; ++i) {
                        const min = Array.isArray(value.minRange) ? value.minRange[i] : value.minRange;
                        const max = Array.isArray(value.maxRange) ? value.maxRange[i] : value.maxRange;
                        prop.array[index * stride + i] += range(0, 1, min, max, Math.random());
                    }
                }
            }
        }
    }
    const lifeTime = particleSystemState.properties.get("lifeTime").array;
    lifeTime[index*2] = 0; // Reset current lifetime
}


export function updateSimulation(particleSystemState, delta, simState) {
    const { respawn = true, reset = true, kill = true } = {};

    if (particleSystemState.maxSpawnCount === 0) return simState;

    if (respawn && particleSystemState.spawnOverTime) {
        if (simState.waitingTime < particleSystemState.spawFrequency) {
            simState.waitingTime += delta;
        } else {
            simState.waitingTime = 0;
            let burst = particleSystemState.burstCount;
            let canSpawn = particleSystemState.maxSpawnCount - particleSystemState.instanceCount;
            particleSystemState.instanceCount += Math.min(burst, canSpawn);
        }
    }

    let killCount = 0;
    const lifeTimeArray = particleSystemState.properties.get("lifeTime").array;

    for (let i = 0; i < particleSystemState.instanceCount; i++) {
        const lifeTimeIndex = i * 2;
        lifeTimeArray[lifeTimeIndex] += delta;

        if (lifeTimeArray[lifeTimeIndex] <= lifeTimeArray[lifeTimeIndex + 1]) {
            // Particle is alive, update it based on attributes over lifetime
            const lifeTimedelta = lifeTimeArray[lifeTimeIndex] / lifeTimeArray[lifeTimeIndex + 1];
            particleSystemState.attributesoverLifeTime.forEach((value, attribute) => {
                const arr = particleSystemState.properties.get(attribute)?.array;
                if(arr) {
                    const stride = value.values.length;
                    const index = i * stride;
                    // Note: This is a simplified linear interpolation. The original had more complex logic.
                    // Replicating the core idea of change over time.
                    for(let j=0; j<stride; ++j) {
                        arr[index+j] += (value.end[j] - value.values[j]) * delta;
                    }
                }
            });
            // Update position based on force
            const force = particleSystemState.force;
            const direction = particleSystemState.properties.get("direction").array;
            const transform = particleSystemState.properties.get("transform").array;
            const dirIndex = i * 3;
            const posIndex = i * 3;

            transform[posIndex] += direction[dirIndex] * force[0] * delta;
            transform[posIndex+1] += direction[dirIndex+1] * force[1] * delta;
            transform[posIndex+2] += direction[dirIndex+2] * force[2] * delta;

        } else {
            if (kill) killCount++;
            if (reset) resetParticle(particleSystemState, i);
        }
    }
    particleSystemState.instanceCount -= killCount;
    simState.killCount = killCount;
    return simState;
}