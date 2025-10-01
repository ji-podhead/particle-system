const lerp = (x, y, a) => x * (1 - a) + y * a;
const clamp = (a, min = 0, max = 1) => Math.min(max, Math.max(min, a));
const invlerp = (x, y, a) => clamp((a - x) / (y - x));
const range = (x1, y1, x2, y2, a) => lerp(x2, y2, invlerp(x1, y1, a));

function _resetTransform(particleSystemState, index) {
    const pos1 = new Array(3);
    if (particleSystemState.startPositionFromgeometry) {
        const i = index * 3;
        pos1[0] = particleSystemState.pointCloud[i];
        pos1[1] = particleSystemState.pointCloud[i + 1];
        pos1[2] = particleSystemState.pointCloud[i + 2];
    } else {
        const start = particleSystemState.properties.get("sourceValues").get("transform");
        pos1[0] = start.values[0];
        pos1[1] = start.values[1];
        pos1[2] = start.values[2];
    }
    return pos1;
}

export function resetParticle(particleSystemState, index) {
    const attributesoverLifeTimeValues = particleSystemState.attributesoverLifeTime;
    const vec3Index = index * 3;
    const sourceValues = particleSystemState.properties.get("sourceValues");

    const pos = sourceValues.get("transform");
    const rot = sourceValues.get("rotation");
    const scale = sourceValues.get("scale");
    const direc = sourceValues.get("direction");

    const newPosition = particleSystemState.properties.get("transform").array;
    const rotation = particleSystemState.properties.get("rotation").array;
    const scaleTemp = particleSystemState.properties.get("scale").array;
    const direc1 = particleSystemState.properties.get("direction").array;

    const pos1 = _resetTransform(particleSystemState, index);
    newPosition[vec3Index] = pos1[0];
    newPosition[vec3Index + 1] = pos1[1];
    newPosition[vec3Index + 2] = pos1[2];

    rotation[vec3Index] = rot.values[0];
    rotation[vec3Index + 1] = rot.values[1];
    rotation[vec3Index + 2] = rot.values[2];

    scaleTemp[vec3Index] = scale.values[0];
    scaleTemp[vec3Index + 1] = scale.values[1];
    scaleTemp[vec3Index + 2] = scale.values[2];

    direc1[vec3Index] = direc.values[0];
    direc1[vec3Index + 1] = direc.values[1];
    direc1[vec3Index + 2] = direc.values[2];

    if (pos.random) {
        newPosition[vec3Index] += range(0, 1, pos.minRange, pos.maxRange, Math.random());
        newPosition[vec3Index + 1] += range(0, 1, pos.minRange, pos.maxRange, Math.random());
        newPosition[vec3Index + 2] += range(0, 1, pos.minRange, pos.maxRange, Math.random());
    }
    if (rot.random) {
        rotation[vec3Index] += range(0, 1, rot.minRange, rot.maxRange, Math.random());
        rotation[vec3Index + 1] += range(0, 1, rot.minRange, rot.maxRange, Math.random());
        rotation[vec3Index + 2] += range(0, 1, rot.minRange, rot.maxRange, Math.random());
    }
    if (scale.random) {
        scaleTemp[vec3Index] += range(0, 1, scale.minRange, scale.maxRange, Math.random());
        scaleTemp[vec3Index + 1] += range(0, 1, scale.minRange, scale.maxRange, Math.random());
        scaleTemp[vec3Index + 2] += range(0, 1, scale.minRange, scale.maxRange, Math.random());
    }
    if (direc.random) {
        direc1[vec3Index] += range(0, 1, direc.minRange, direc.maxRange, Math.random());
        direc1[vec3Index + 1] += range(0, 1, direc.minRange, direc.maxRange, Math.random());
        direc1[vec3Index + 2] += range(0, 1, direc.minRange, direc.maxRange, Math.random());
    }

    attributesoverLifeTimeValues.forEach((value, attribute) => {
        if (attribute !== "transform" && attribute !== "rotation" && attribute !== "scale" && attribute !== "force" && attribute !== "direction") {
            try {
                const sourceAttribute = sourceValues.get(attribute);
                const attrArray = particleSystemState.properties.get(attribute).array;
                const stride = sourceAttribute.values.length;
                const attrIndex = index * stride;

                for (let i = 0; i < stride; i++) {
                    let randomVal = 0;
                    if (sourceAttribute.random) {
                        randomVal = range(0, 1, sourceAttribute.minRange, sourceAttribute.maxRange, Math.random());
                    }
                    attrArray[attrIndex + i] = sourceAttribute.values[i] + randomVal;
                }
            } catch (e) {}
        }
    });
}

export function updateSimulation(particleSystemState, delta, state) {
    const respawn = true;
    const reset = true;
    const kill = true;

    if (!particleSystemState.properties || particleSystemState.maxSpawnCount === 0) {
        return state;
    }

    const attributesoverLifeTimeValues = particleSystemState.attributesoverLifeTime;
    if (respawn) {
        if (state.waitingTime < particleSystemState.spawFrequency) {
            state.waitingTime += delta;
        } else {
            state.waitingTime = 0;
            let burstCountOfset = particleSystemState.maxSpawnCount - (particleSystemState.burstCount + particleSystemState.instanceCount);
            if (burstCountOfset <= 0) {
                particleSystemState.instanceCount += (particleSystemState.burstCount + burstCountOfset);
            } else {
                particleSystemState.instanceCount += particleSystemState.burstCount;
            }
        }
    }

    let force = [...particleSystemState.force];
    state.killCount = 0;

    for (let i = 0; i < particleSystemState.instanceCount; i++) {
        const lifeTime = particleSystemState.properties.get("lifeTime").array;
        const lifeTimeIndex = i * 2;
        lifeTime[lifeTimeIndex] += delta;

        if (lifeTime[lifeTimeIndex] <= lifeTime[lifeTimeIndex + 1]) {
            let direction = particleSystemState.properties.get("direction").array;
            const lifeTimedelta = lifeTime[lifeTimeIndex] / lifeTime[lifeTimeIndex + 1];
            const indexA0 = i * 3;
            const indexA1 = indexA0 + 1;
            const indexA2 = indexA1 + 1;

            const step = lifeTimedelta;
            const trans0 = particleSystemState.properties.get("transform").array;
            const directionVector = [0, 0, 0];

            const bezier = (out, a, b, c, d, t) => {
                let inverseFactor = 1 - t;
                let inverseFactorTimesTwo = inverseFactor * inverseFactor;
                let factorTimes2 = t * t;
                let factor1 = inverseFactorTimesTwo * inverseFactor;
                let factor2 = 3 * t * inverseFactorTimesTwo;
                let factor3 = 3 * factorTimes2 * inverseFactor;
                let factor4 = factorTimes2 * t;
                out[indexA0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
                if (a.length > 1) {
                    out[indexA1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
                    if (a.length > 2) {
                        out[indexA2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
                    }
                }
            };

            const lerp = (out, a, b, t) => {
                out[indexA0] += t * (b[0] - a[0]);
                if (a.length > 1) {
                    out[indexA1] += t * (b[1] - a[1]);
                    if (a.length > 2) {
                        out[indexA2] += t * (b[2] - a[2]);
                    }
                }
            };

            attributesoverLifeTimeValues.forEach((value, attribute) => {
                const arr = particleSystemState.properties.get(attribute)?.array;

                if (attribute == "force") {
                    force[0] += (step * value.values[0]);
                    force[1] += (step * value.values[1]);
                    force[2] += (step * value.values[2]);
                } else if (attribute == "direction") {
                    direction[indexA0] += (value.values[0]);
                    direction[indexA1] += (value.values[1]);
                    direction[indexA2] += (value.values[2]);
                } else if(arr) {
                    if (value.bezier) {
                        bezier(arr, value.values, value.bezierControllPointA, value.bezierControllPointB, value.end, step);
                    } else {
                        lerp(arr, value.values, value.end, step);
                    }
                }
            });

            directionVector[0] += (direction[indexA0] !== 0 ? (force[0] * direction[indexA0]) : force[0]);
            directionVector[1] += (direction[indexA1] !== 0 ? (force[1] * direction[indexA1]) : force[1]);
            directionVector[2] += (direction[indexA2] !== 0 ? (force[2] * direction[indexA2]) : force[2]);

            if (particleSystemState.noise > 0) {
                const noise = Math.sin(delta * 10 * particleSystemState.noise);
                directionVector[0] += noise;
                directionVector[1] += noise;
                directionVector[2] += noise;
            }

            for (let j = 0; j < 3; j++) {
                trans0[indexA0 + j] += directionVector[j];
            }

        } else {
            const max = particleSystemState.properties.get("sourceValues").get("maxLifeTime");
            lifeTime[lifeTimeIndex] = 0;
            if (max.values.length > 0) {
                lifeTime[lifeTimeIndex + 1] = max.values[0];
            }
            if (max.random) {
                lifeTime[lifeTimeIndex + 1] += range(0, 1, max.minRange, max.maxRange, Math.random());
            }
            if (kill) {
                state.killCount++;
            }
            if (reset) {
                resetParticle(particleSystemState, i);
            }
        }
    }
    particleSystemState.instanceCount -= state.killCount;
    return state;
}