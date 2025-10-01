const lerp = (x, y, a) => x * (1 - a) + y * a;
const clamp = (a, min = 0, max = 1) => Math.min(max, Math.max(min, a));
const invlerp = (x, y, a) => clamp((a - x) / (y - x));
const range = (x1, y1, x2, y2, a) => lerp(x2, y2, invlerp(x1, y1, a));
let killCount = 0;
let waitingTime = 0;
let index = 0;
let object1 = {};
let delta;

function resetTransform(object1, index, directly) {
    const pos1 = new Array(3);
    if (object1.startPositionFromgeometry) {
        const i = index * 3;
        pos1[0] = object1.pointCloud[i];
        pos1[1] = object1.pointCloud[i + 1];
        pos1[2] = object1.pointCloud[i + 2];
    } else {
        const start = object1.properties.get("sourceValues").get("transform");
        pos1[0] = start.values[0];
        pos1[1] = start.values[1];
        pos1[2] = start.values[2];
    }
    if (directly) {
        setTransform(object1, pos1[0], pos1[1], pos1[2], index);
    }
    return pos1;
}

function setTransform(object1, x, y, z, index) {
    const transformArray = object1.properties.get("transform").array;
    const i = index * 3;
    transformArray[i] = x;
    transformArray[i + 1] = y;
    transformArray[i + 2] = z;
}

function resetParticle(object1, index, attributesoverLifeTimeValues) {
    const vec3Index = index * 3;
    const sourceValues = object1.properties.get("sourceValues");

    const pos = sourceValues.get("transform");
    const rot = sourceValues.get("rotation");
    const scale = sourceValues.get("scale");
    const direc = sourceValues.get("direction");

    const newPosition = object1.properties.get("transform").array;
    const rotation = object1.properties.get("rotation").array;
    const scaleTemp = object1.properties.get("scale").array;
    const direc1 = object1.properties.get("direction").array;

    const pos1 = resetTransform(object1, index, false);
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
                const attrArray = object1.properties.get(attribute).array;
                const stride = sourceAttribute.values.length;
                const attrIndex = index * stride;

                for (let i = 0; i < stride; i++) {
                    let randomVal = 0;
                    if (sourceAttribute.random) {
                        randomVal = range(0, 1, sourceAttribute.minRange, sourceAttribute.maxRange, Math.random());
                    }
                    attrArray[attrIndex + i] = sourceAttribute.values[i] + randomVal;
                }
            } catch {}
        }
    });
}


function updateSimulation(object1, delta, respawn, kill) {
    if (!object1.properties) return;
    const maxSpawnCount = typeof object1.maxSpawnCount === 'number' ? object1.maxSpawnCount : 0;
    if (maxSpawnCount === 0) return;

    const attributesoverLifeTimeValues = object1.attributesoverLifeTime;
    const lifeTime = object1.properties.get("lifeTime").array;
    const maxLifeTimeProps = object1.properties.get("sourceValues").get("maxLifeTime");

    if (respawn) {
        if (waitingTime < object1.spawFrequency) {
            waitingTime += delta;
        } else {
            waitingTime = 0;
            let burstCountOfset = object1.maxSpawnCount - (object1.burstCount + object1.instanceCount);
            if (burstCountOfset <= 0) {
                object1.instanceCount += (object1.burstCount + burstCountOfset);
            } else {
                object1.instanceCount += object1.burstCount;
            }
        }
    }

    let force = [...object1.force];
    killCount = 0;

    for (let index = 0; index < object1.instanceCount; index++) {
        const lifeTimeIndex = index * 2;
        lifeTime[lifeTimeIndex] += delta;

        if (lifeTime[lifeTimeIndex] <= lifeTime[lifeTimeIndex + 1]) {
            const lifeTimedelta = (lifeTime[lifeTimeIndex] / lifeTime[lifeTimeIndex + 1]);
            const step = lifeTimedelta;
            const vec3Index = index * 3;

            const newPosition = object1.properties.get("transform").array;
            const direction = object1.properties.get("direction").array;

            attributesoverLifeTimeValues.forEach((value, attribute) => {
                if (attribute === "force") {
                    force[0] += (step * value.values[0]);
                    force[1] += (step * value.values[1]);
                    force[2] += (step * value.values[2]);
                } else {
                    try {
                        const arr = object1.properties.get(attribute).array;
                        const stride = value.values.length;
                        const arrIndex = index * stride;
                        for (let i2 = 0; i2 < stride; i2++) {
                           if(value.end && value.end.length > i2) {
                                arr[arrIndex + i2] += (value.end[i2] - value.values[i2]) * step;
                           } else {
                                arr[arrIndex + i2] += value.values[i2] * step;
                           }
                        }
                    } catch {}
                }
            });

            newPosition[vec3Index] += (direction[vec3Index] !== 0 ? (force[0] * direction[vec3Index]) : force[0]);
            newPosition[vec3Index + 1] += (direction[vec3Index + 1] !== 0 ? (force[1] * direction[vec3Index + 1]) : force[1]);
            newPosition[vec3Index + 2] += (direction[vec3Index + 2] !== 0 ? (force[2] * direction[vec3Index + 2]) : force[2]);

            if (object1.noise > 0) {
                const noise = Math.sin(delta * 10 * object1.noise);
                newPosition[vec3Index] += noise;
                newPosition[vec3Index + 1] += noise;
                newPosition[vec3Index + 2] += noise;
            }

        } else if (kill) {
            killCount++;
            const lifeTimeIndex = index * 2;
            lifeTime[lifeTimeIndex] = 0;
            const max = maxLifeTimeProps;
            lifeTime[lifeTimeIndex + 1] = max.values;
            if (max.random) {
                lifeTime[lifeTimeIndex + 1] += range(0, 1, max.minRange, max.maxRange, Math.random());
            }
            if (resetParticle) {
                resetParticle(object1, index, attributesoverLifeTimeValues);
            }
        }
    }
    object1.instanceCount -= killCount;

    postMessage({
        index: index,
        values: {
            transform: object1.properties.get("transform").array,
            scale: object1.properties.get("scale").array,
            rotation: object1.properties.get("rotation").array,
            lifeTime: lifeTime,
            color: object1.properties.get("color").array,
            emission: object1.properties.get("emission").array,
            opacity: object1.properties.get("opacity").array,
            direction: object1.properties.get("direction").array,
            instanceCount: object1.instanceCount,
        },
    });
}

self.onmessage = function (input) {
  switch (input.data.task) {
    case ("init"): {
      if (input.data && input.data.value && input.data.value.index !== undefined) {
        index = input.data.value.index
      }
      break;
    }
    case ("updateDefaultValues"): {
      if (input.data && input.data.value && input.data.value.object) {
        object1 = input.data.value.object
      }
      break;
    }
    case ("updateSimulation"): {
      if (input.data && input.data.value && input.data.value.delta !== undefined) {
        delta = input.data.value.delta
        updateSimulation(object1, delta, true, true)
      } else {
        console.error("Received 'updateSimulation' task but input.data.value or input.data.value.delta is undefined.");
      }
      break;
    }
  }
}