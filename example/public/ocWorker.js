// Global state for the worker
let particleSystemState = {};
let workerIndex = 0;

// Helper functions
const lerp = (x, y, a) => x * (1 - a) + y * a;
const clamp = (a, min = 0, max = 1) => Math.min(max, Math.max(min, a));
const invlerp = (x, y, a) => clamp((a - x) / (y - x));
const range = (x1, y1, x2, y2, a) => lerp(x2, y2, invlerp(x1, y1, a));

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function resetParticle(state, index) {
    const sourceValues = state.properties.sourceValues;
    const posArray = state.properties.transform.array;
    const rotArray = state.properties.rotation.array;
    const scaleArray = state.properties.scale.array;
    const dirArray = state.properties.direction.array;
    const colorArray = state.properties.color.array;
    const emissionArray = state.properties.emission.array;
    const opacityArray = state.properties.opacity.array;

    // Reset position
    if (state.startPositionFromgeometry) {
        posArray[index * 3] = state.pointCloud[index * 3];
        posArray[index * 3 + 1] = state.pointCloud[index * 3 + 1];
        posArray[index * 3 + 2] = state.pointCloud[index * 3 + 2];
    } else {
        const startPos = sourceValues.get("transform");
        posArray[index * 3] = startPos.values[0];
        posArray[index * 3 + 1] = startPos.values[1];
        posArray[index * 3 + 2] = startPos.values[2];
        if (startPos.random) {
            posArray[index * 3] += random(startPos.minRange, startPos.maxRange);
            posArray[index * 3 + 1] += random(startPos.minRange, startPos.maxRange);
            posArray[index * 3 + 2] += random(startPos.minRange, startPos.maxRange);
        }
    }

    // Reset rotation
    const startRot = sourceValues.get("rotation");
    rotArray[index * 3] = startRot.values[0];
    rotArray[index * 3 + 1] = startRot.values[1];
    rotArray[index * 3 + 2] = startRot.values[2];
    if (startRot.random) {
        rotArray[index * 3] += random(startRot.minRange, startRot.maxRange);
        rotArray[index * 3 + 1] += random(startRot.minRange, startRot.maxRange);
        rotArray[index * 3 + 2] += random(startRot.minRange, startRot.maxRange);
    }

    // Reset scale
    const startScale = sourceValues.get("scale");
    scaleArray[index * 3] = startScale.values[0];
    scaleArray[index * 3 + 1] = startScale.values[1];
    scaleArray[index * 3 + 2] = startScale.values[2];
    if (startScale.random) {
        scaleArray[index * 3] += random(startScale.minRange, startScale.maxRange);
        scaleArray[index * 3 + 1] += random(startScale.minRange, startScale.maxRange);
        scaleArray[index * 3 + 2] += random(startScale.minRange, startScale.maxRange);
    }

    // Reset direction
    const startDir = sourceValues.get("direction");
    dirArray[index * 3] = startDir.values[0];
    dirArray[index * 3 + 1] = startDir.values[1];
    dirArray[index * 3 + 2] = startDir.values[2];
    if (startDir.random) {
        dirArray[index * 3] += random(startDir.minRange, startDir.maxRange);
        dirArray[index * 3 + 1] += random(startDir.minRange, startDir.maxRange);
        dirArray[index * 3 + 2] += random(startDir.minRange, startDir.maxRange);
    }

    // Reset color
    const startColor = sourceValues.get("color");
    colorArray[index * 3] = startColor.values[0];
    colorArray[index * 3 + 1] = startColor.values[1];
    colorArray[index * 3 + 2] = startColor.values[2];

    // Reset emission
    const startEmission = sourceValues.get("emission");
    emissionArray[index * 3] = startEmission.values[0];
    emissionArray[index * 3 + 1] = startEmission.values[1];
    emissionArray[index * 3 + 2] = startEmission.values[2];

    // Reset opacity
    const startOpacity = sourceValues.get("opacity");
    opacityArray[index] = startOpacity.values[0];

    // Reset lifetime
    const lifeTimeArray = state.properties.lifeTime.array;
    const maxLifeTime = sourceValues.get("maxLifeTime");
    lifeTimeArray[index * 2] = 0; // current life
    lifeTimeArray[index * 2 + 1] = maxLifeTime.values[0]; // max life
    if (maxLifeTime.random) {
        lifeTimeArray[index * 2 + 1] += random(maxLifeTime.minRange, maxLifeTime.maxRange);
    }
}


function updateSimulation(state, delta) {
    if (!state || !state.properties) {
        return; // Not initialized yet
    }

    // 1. Handle spawning
    state.waitingTime = (state.waitingTime || 0) + delta;
    if (state.spawnOverTime && state.waitingTime >= state.spawFrequency) {
        state.waitingTime = 0;
        const canSpawn = state.maxSpawnCount - state.instanceCount;
        const numToSpawn = Math.min(canSpawn, state.burstCount);

        for (let i = 0; i < numToSpawn; i++) {
            const newIndex = state.instanceCount + i;
            if (newIndex < state.maxSpawnCount) {
                resetParticle(state, newIndex);
            }
        }
        state.instanceCount += numToSpawn;
    }

    // 2. Update active particles
    const lifeTimeArray = state.properties.lifeTime.array;
    const posArray = state.properties.transform.array;
    const dirArray = state.properties.direction.array;

    for (let i = 0; i < state.instanceCount; i++) {
        const lifeTimeIndex = i * 2;
        lifeTimeArray[lifeTimeIndex] += delta;
        const maxLife = lifeTimeArray[lifeTimeIndex + 1];

        if (lifeTimeArray[lifeTimeIndex] >= maxLife) {
            resetParticle(state, i);
        } else {
            // Update particle based on forces and lifetime attributes
            const lifeRatio = lifeTimeArray[lifeTimeIndex] / maxLife;

            // Apply force
            posArray[i * 3] += state.force[0] * delta;
            posArray[i * 3 + 1] += state.force[1] * delta;
            posArray[i * 3 + 2] += state.force[2] * delta;

            // Apply direction
            posArray[i * 3] += dirArray[i * 3] * delta;
            posArray[i * 3 + 1] += dirArray[i * 3 + 1] * delta;
            posArray[i * 3 + 2] += dirArray[i * 3 + 2] * delta;

            // Apply attributes over lifetime
            state.attributesoverLifeTime.forEach((value, key) => {
                const targetArray = state.properties[key]?.array;
                if (targetArray) {
                    // Simplified: lerp from start to end value over lifetime
                    const startValue = state.properties.sourceValues.get(key).values;
                    const endValue = value.end;
                    if (startValue && endValue) {
                        for (let j = 0; j < startValue.length; j++) {
                            const componentIndex = i * startValue.length + j;
                            targetArray[componentIndex] = lerp(startValue[j], endValue[j], lifeRatio);
                        }
                    }
                }
            });
        }
    }

    // 3. Post data back
    postMessage({
        index: workerIndex,
        values: {
            instanceCount: state.instanceCount,
            transformArrays: [
                state.properties.transform.array,
                state.properties.rotation.array,
                state.properties.scale.array,
            ],
            colorArray: state.properties.color.array,
            emissionArray: state.properties.emission.array,
            opacityArray: state.properties.opacity.array,
            lifeTime: state.properties.lifeTime.array,
            directionArray: state.properties.direction.array,
        }
    });
}

self.onmessage = function (e) {
    const { task, value, index } = e.data;
    switch (task) {
        case "init":
            workerIndex = index;
            break;
        case "updateDefaultValues":
            particleSystemState = value.object;
            // The maps are cloned, so we need to convert them back to Maps
            particleSystemState.properties.sourceValues = new Map(Object.entries(particleSystemState.properties.sourceValues));
            particleSystemState.attributesoverLifeTime = new Map(particleSystemState.attributesoverLifeTime);

            // Initialize all particles to their default state
            for (let i = 0; i < particleSystemState.maxSpawnCount; i++) {
                resetParticle(particleSystemState, i);
            }
            // Start with burstCount particles
            particleSystemState.instanceCount = particleSystemState.burstCount;

            break;
        case "updateSimulation":
            updateSimulation(particleSystemState, value.delta);
            break;
    }
};