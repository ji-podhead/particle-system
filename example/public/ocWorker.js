const lerp = (x, y, a) => x * (1 - a) + y * a;
const clamp = (a, min = 0, max = 1) => Math.min(max, Math.max(min, a));
const invlerp = (x, y, a) => clamp((a - x) / (y - x));
const range = (x1, y1, x2, y2, a) => lerp(x2, y2, invlerp(x1, y1, a));
let individualTransform = false;
let individualRotation = false;
let individualScale = false;
let individualDirection = false;
let individualForceField = false;
function bezier(out, a, b, c, d, t, vec3Index) {
    let inverseFactor = 1 - t;
    let inverseFactorTimesTwo = inverseFactor * inverseFactor;
    let factorTimes2 = t * t;
    let factor1 = inverseFactorTimesTwo * inverseFactor;
    let factor2 = 3 * t * inverseFactorTimesTwo;
    let factor3 = 3 * factorTimes2 * inverseFactor;
    let factor4 = factorTimes2 * t;
    out[vec3Index] += a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
    if(a.length>1){
        out[vec3Index+1] += a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
        if(a.length>2){
            out[vec3Index+2] += a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
        }
    }
}

function lerpAttribute(out, a, b, t, vec3Index) {
    out[vec3Index] += a[0] + t * (b[0] - a[0]);
    if(a.length>1){
        out[vec3Index+1] += a[1] + t * (b[1] - a[1]);
        if(a.length>2){
            out[vec3Index+2] += a[2] + t * (b[2] - a[2]);
        }
    }
}

function lerpAttribute(out, a, b, t, vec3Index) {
    out[vec3Index] = a[0] + t * (b[0] - a[0]);
    if(a.length>1){
        out[vec3Index+1] = a[1] + t * (b[1] - a[1]);
        if(a.length>2){
            out[vec3Index+2] = a[2] + t * (b[2] - a[2]);
        }
    }
}
function lerpIndividual(out, a, b, t, vec3Index) {
    out[vec3Index] = a[vec3Index] + t * (b[vec3Index] - a[vec3Index]);
    if(a.length>1){
        out[vec3Index+1] = a[vec3Index+ 1] + t * (b[vec3Index+1] - a[vec3Index+1]);
        if(a.length>2){
            out[vec3Index+2] = a[vec3Index+2] + t * (b[vec3Index+2] - a[vec3Index+2]);
        }
    }
}

let killCount = 0;
let waitingTime = 0;
let index = 0;
let object1 = {};
let delta;

function resetTransform(object1, index) {
    const start = object1.properties.get("sourceValues").get("transform");
    const pos1 = new Array(3).fill(0); // Assuming transform is always 3 values (x, y, z)
    if (individualTransform) {
        const i = index * 3;
        pos1[0] = start.values[i];
        pos1[1] = start.values[i + 1];
        pos1[2] = start.values[i + 2];
    } else {
        pos1[0] = start.values[0];
        pos1[1] = start.values[1];
        pos1[2] = start.values[2];
    }
    // The 'directly' variable is not defined in this scope, assuming it's meant to be handled elsewhere or removed.
    // If 'directly' is intended to be a global or passed parameter, it needs to be defined.
    // For now, I will remove the 'if (directly)' block as it's not defined.
    // If it's meant to be part of the object, it should be object1.directly.
    // Given the context, it's likely a remnant or needs to be explicitly passed.
    // I will remove it for now to avoid a ReferenceError.
    // if (directly) {
    //     setTransform(object1, pos1[0], pos1[1], pos1[2], index);
    // }
    return pos1;
}

function setTransform(object1, x, y, z, index) {
    const transformArray = object1.properties.get("transform").array;
    const i = index * 3;
    transformArray[i] = x;
    transformArray[i + 1] = y;
    transformArray[i + 2] = z;
}

function resetAttribute(object1, attributeName, index, isIndividual) {
    const sourceAttribute = object1.properties.get("sourceValues").get(attributeName);
    const values = new Array(sourceAttribute.values.length).fill(0);
    if (isIndividual) {
        const i = index * 3;
        values[0] = sourceAttribute.values[i];
        values[1] = sourceAttribute.values[i + 1];
        values[2] = sourceAttribute.values[i + 2];
    } else {
        values[0] = sourceAttribute.values[0];
        values[1] = sourceAttribute.values[1];
        values[2] = sourceAttribute.values[2];
    }
    return values;
}

function setAttribute(object1, attributeName, x, y, z, index) {
    const attributeArray = object1.properties.get(attributeName).array;
    const i = index * 3;
    attributeArray[i] = x;
    attributeArray[i + 1] = y;
    attributeArray[i + 2] = z;
}

function resetParticle(object1, index, attributesoverLifeTimeValues) {
    const vec3Index = index * 3;
    const sourceValues = object1.properties.get("sourceValues");

    const pos = sourceValues.get("transform");
    const rot = sourceValues.get("rotation");
    const scale = sourceValues.get("scale");
    const direc = sourceValues.get("direction");

    const newPosition = object1.properties.get("transform").array;
    const rotationArray = object1.properties.get("rotation").array;
    const scaleArray = object1.properties.get("scale").array;
    const directionArray = object1.properties.get("direction").array;

    const pos1 = resetTransform(object1, index);
    newPosition[vec3Index] = pos1[0];
    newPosition[vec3Index + 1] = pos1[1];
    newPosition[vec3Index + 2] = pos1[2];

    const rot1 = resetAttribute(object1, "rotation", index, individualRotation);
    setAttribute(object1, "rotation", rot1[0], rot1[1], rot1[2], index);

    const scale1 = resetAttribute(object1, "scale", index, individualScale);
    setAttribute(object1, "scale", scale1[0], scale1[1], scale1[2], index);

    const direc2 = resetAttribute(object1, "direction", index, individualDirection);
    setAttribute(object1, "direction", direc2[0], direc2[1], direc2[2], index);

    // Handle random values for transform, rotation, scale, direction
    if (pos.random) {
        newPosition[vec3Index] += range(0, 1, pos.minRange, pos.maxRange, Math.random());
        newPosition[vec3Index + 1] += range(0, 1, pos.minRange, pos.maxRange, Math.random());
        newPosition[vec3Index + 2] += range(0, 1, pos.minRange, pos.maxRange, Math.random());
    }
    if (rot.random) {
        rotationArray[vec3Index] += range(0, 1, rot.minRange, rot.maxRange, Math.random());
        rotationArray[vec3Index + 1] += range(0, 1, rot.minRange, rot.maxRange, Math.random());
        rotationArray[vec3Index + 2] += range(0, 1, rot.minRange, rot.maxRange, Math.random());
    }
    if (scale.random) {
        scaleArray[vec3Index] += range(0, 1, scale.minRange, scale.maxRange, Math.random());
        scaleArray[vec3Index + 1] += range(0, 1, scale.minRange, scale.maxRange, Math.random());
        scaleArray[vec3Index + 2] += range(0, 1, scale.minRange, scale.maxRange, Math.random());
    }
    if (direc.random) {
        directionArray[vec3Index] += range(0, 1, direc.minRange, direc.maxRange, Math.random());
        directionArray[vec3Index + 1] += range(0, 1, direc.minRange, direc.maxRange, Math.random());
        directionArray[vec3Index + 2] += range(0, 1, direc.minRange, direc.maxRange, Math.random());
    }

    attributesoverLifeTimeValues.forEach((value, attribute) => {
        if (attribute !== "transform" && attribute !== "rotation" && attribute !== "scale" && attribute !== "force" && attribute !== "direction" && attribute !== "position") {
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


function updateSimulation(object1, delta, respawn=true, kill=true) {
    // console.log("updateSimulation", object1.instanceCount, object1.maxSpawnCount);

    if (!object1.properties) return console.warn("No properties found in object1");
    const maxSpawnCount = typeof object1.maxSpawnCount === 'number' ? object1.maxSpawnCount : 0;
    if (maxSpawnCount === 0) return console.warn("maxSpawnCount is zero or not a number");
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

            if (attributesoverLifeTimeValues.has("position")) {
                const value = attributesoverLifeTimeValues.get("position");
                const out= newPosition 
                // const val=[value.values[vec3Index],value.values[vec3Index+1],value.values[vec3Index+2]]
                // const end=[value.end[vec3Index],value.end[vec3Index+1],value.end[vec3Index+2]]
                if (value.bezier === true) {
                    bezier(newPosition, value.values, value.bezierControllPointA, value.bezierControllPointB, value.end, step, vec3Index);
                } else {
                    lerpIndividual(out, value.values, value.end, step, vec3Index);
                }
            }

            // attributesoverLifeTimeValues.forEach((value, attribute) => {
            //     if (attribute === "position") return;
            //     if (attribute === "force") {
            //         force[0] += (step * value.values[0]);
            //         force[1] += (step * value.values[1]);
            //         force[2] += (step * value.values[2]);
            //     } else {
            //         try {
            //             const arr = object1.properties.get(attribute).array;
            //             const stride = value.values.length;
            //             const arrIndex = index * stride;
            //             for (let i2 = 0; i2 < stride; i2++) {
            //                if(value.end && value.end.length > i2) {
            //                     arr[arrIndex + i2] += (value.end[i2] - value.values[i2]) * step;
            //                } else {
            //                     arr[arrIndex + i2] += value.values[i2] * step;
            //                }
            //             }
            //         } catch {}
            //     }
            // });

            newPosition[vec3Index] += (direction[vec3Index] !== 0 ? (force[0] * direction[vec3Index]) : force[0]);
            newPosition[vec3Index + 1] += (direction[vec3Index + 1] !== 0 ? (force[1] * direction[vec3Index + 1]) : force[1]);
            newPosition[vec3Index + 2] += (direction[vec3Index + 2] !== 0 ? (force[2] * direction[vec3Index + 2]) : force[2]);

            if (object1.noise > 0) {
                const noise = Math.sin(delta * 10 * object1.noise);
                newPosition[vec3Index] += noise;
                newPosition[vec3Index + 1] += noise;
                newPosition[vec3Index + 2] += noise;
            }

            // Apply forceFieldForce
            const sourceForceFieldForce = object1.properties.get("sourceValues").get("forceFieldForce");
            if (sourceForceFieldForce && sourceForceFieldForce.values && sourceForceFieldForce.values.length > 0) {
                let forceFieldValues = [0, 0, 0];
                if (individualForceField) {
                    const ffIndex = index * 3;
                    // Apply individual force field force
                    forceFieldValues[0] = object1.forcefield[ffIndex];
                    forceFieldValues[1] = object1.forcefield[ffIndex + 1];
                    forceFieldValues[2] = object1.forcefield[ffIndex + 2];
                } else {
                    // Apply unified force field force
                    forceFieldValues[0] = sourceForceFieldForce.values[0];
                    forceFieldValues[1] = sourceForceFieldForce.values[1];
                    forceFieldValues[2] = sourceForceFieldForce.values[2];
                }

                newPosition[vec3Index] += forceFieldValues[0];
                newPosition[vec3Index + 1] += forceFieldValues[1];
                newPosition[vec3Index + 2] += forceFieldValues[2];
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
      if (input.data && input.data.index !== undefined) {
        index = input.data.index
      }
      break;
    }
    case ("updateDefaultValues"): {
      if (input.data && input.data.value && input.data.value.object) {
        object1 = input.data.value.object;
        // Reconstruct Maps from arrays
        if (object1.attributesoverLifeTime) {
            object1.attributesoverLifeTime = new Map(object1.attributesoverLifeTime);
        }
        if (object1.properties) {
            object1.properties = new Map(object1.properties);
            if (object1.properties.has("sourceValues")) {
                object1.properties.set("sourceValues", new Map(object1.properties.get("sourceValues")));
                individualTransform = object1.properties.get("sourceValues").has("transform") && (object1.properties.get("sourceValues").get("transform").values.length > 3);
                individualRotation = object1.properties.get("sourceValues").has("rotation") && (object1.properties.get("sourceValues").get("rotation").values.length > 3);
                individualScale = object1.properties.get("sourceValues").has("scale") && (object1.properties.get("sourceValues").get("scale").values.length > 3);
                individualDirection = object1.properties.get("sourceValues").has("direction") && (object1.properties.get("sourceValues").get("direction").values.length > 3);
                individualForceField = object1.properties.get("sourceValues").has("forceFieldForce") && (object1.properties.get("sourceValues").get("forceFieldForce").values.length > 3);
                console.log("individualTransform", individualTransform);
                console.log("individualRotation", individualRotation);
                console.log("individualScale", individualScale);
                console.log("individualDirection", individualDirection);
                console.log("individualForceField", individualForceField);
            }
        }
        postMessage({
            task: "initialized"
        });
      }
      break;
    }
    case ("update"): {
        if (input.data && input.data.type && input.data.data) {
            const { type, data } = input.data;
            switch (type) {
                case "property":
                    object1[data.propertyName] = data.value;
                    break;
                case "sourceAttribute":
                    if(object1.properties.get("sourceValues")) {
                        object1.properties.get("sourceValues").set(data.attributeName, data.values);
                    }
                    break;
                case "attributeOverLifeTime":
                    if(object1.attributesoverLifeTime) {
                        object1.attributesoverLifeTime.set(data.attributeName, data.values);
                    }
                    break;
                case "propertiesMapEntry":
                     if(object1.properties) {
                        object1.properties.set(data.key, data.value);
                     }
                    break;
                case "particleAttribute": {
                    const { attributeName, particleIndex, value } = data;
                    const attribute = object1.properties.get(attributeName);
                    if (attribute && attribute.array) {
                        // Assuming a stride of 3 for vector attributes (pos, rot, scale)
                        const startIndex = particleIndex * 3;
                        attribute.array[startIndex] = value[0];
                        attribute.array[startIndex + 1] = value[1];
                        attribute.array[startIndex + 2] = value[2];
                    }
                    break;
                }
                default:
                    console.warn(`Unknown update type: ${type}`);
            }
        }
        break;
    }
    case ("burst"): {
        console.log("burst", object1.instanceCount)
    const { amount } = input.data.value;
    const lifeTime=object1.properties.get("lifeTime").array
	const overFlow =object1.maxSpawnCount-(object1.instanceCount+amount)
	let start

	if( overFlow>=0&&(lifeTime[object1.instanceCount]==0)){
		start=object1.instanceCount
	}else{

		start=0
	}

	for (let i=start;i<=(start+amount);i++){
		if(overFlow>=0){
			object1.instanceCount+=1
		}
		else{
			lifeTime[i]=0
		}
		resetParticle(object1,i, object1.attributesoverLifeTime)
		//setTransform(position[0],position[1],position[2],i)
        // console.log(overFlow+"func"+i,object1.getTransform(i))

		}
        break;
    }
    case ("resetParticle"): {
        const { index } = input.data.value;
        resetParticle(object1, index, object1.attributesoverLifeTime);
        break;
    }
    case ("resetParticles"): {
        for (let i = 0; i < object1.amount; i++) {
            resetParticle(object1, i, object1.attributesoverLifeTime);
        }
        break;
    }
    case ("updateSimulation"): {
      if (!input.data || !input.data.value || input.data.value.delta === undefined) {
        return console.error("Received 'updateSimulation' task but input.data.value or input.data.value.delta is undefined.");
      }
      updateSimulation(object1, input.data.value.delta, input.data.value.kill, input.data.value.respawn)
      break;
    }
  }
}
