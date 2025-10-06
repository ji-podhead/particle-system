const lerp = (x, y, a) => x * (1 - a) + y * a;
const clamp = (a, min = 0, max = 1) => Math.min(max, Math.max(min, a));
const invlerp = (x, y, a) => clamp((a - x) / (y - x));
const range = (x1, y1, x2, y2, a) => lerp(x2, y2, invlerp(x1, y1, a));

class ParticleWorkerLogic {
    constructor() {
        this.index = 0;
        this.object1 = {};
        this.killCount = 0;
        this.individualTransform = false;
        this.individualRotation = false;
        this.individualScale = false;
        this.individualDirection = false;
        this.individualForceField = false;
        this.fullySpawned = false;
        this.spawFrequency = 0;
        this.spawnOverTime =false
        this.userFunctions = new Map(); // Stores { functionKey: args }
        // Store handler info as { key: string, args: any }
        this.onParticleBirth = { key: null, args: null };
        this.onParticleKill = { key: null, args: null };
    }


    _onmessage(input) {
        switch (input.data.task) {
            case ("init"): {
                if (input.data && input.data.index !== undefined) {
                    this.index = input.data.index;
                }
                break;
            }
            case ("updateDefaultValues"): {
                if (input.data && input.data.value && input.data.value.object) {
                    this.object1 = input.data.value.object;
                    if (this.object1.attributesoverLifeTime) {
                        this.object1.attributesoverLifeTime = new Map(this.object1.attributesoverLifeTime);
                    }
                    if (this.object1.properties) {
                        this.object1.properties = new Map(this.object1.properties);
                        if (this.object1.properties.has("sourceValues")) {
                            this.object1.properties.set("sourceValues", new Map(this.object1.properties.get("sourceValues")));
                            this.individualTransform = this.object1.properties.get("sourceValues").has("transform") && (this.object1.properties.get("sourceValues").get("transform").values.length > 3);
                            this.individualRotation = this.object1.properties.get("sourceValues").has("rotation") && (this.object1.properties.get("sourceValues").get("rotation").values.length > 3);
                            this.individualScale = this.object1.properties.get("sourceValues").has("scale") && (this.object1.properties.get("sourceValues").get("scale").values.length > 3);
                            this.individualDirection = this.object1.properties.get("sourceValues").has("direction") && (this.object1.properties.get("sourceValues").get("direction").values.length > 3);
                            this.individualForceField = this.object1.properties.get("sourceValues").has("forceFieldForce") && (this.object1.properties.get("sourceValues").get("forceFieldForce").values.length > 3);
                        }
                    }
                    
                    // Register user functions if provided
                    if (input.data.value.userFunctions) {
                        this.registerFunctions(input.data.value.userFunctions);
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
                            this.object1[data.propertyName] = data.value;
                            break;
                        case "sourceAttribute":
                            if (this.object1.properties.get("sourceValues")) {
                                this.object1.properties.get("sourceValues").set(data.attributeName, data.values);
                            }
                            break;
                        case "attributeOverLifeTime":
                            if (this.object1.attributesoverLifeTime) {
                                this.object1.attributesoverLifeTime.set(data.attributeName, data.values);
                            }
                            break;
                        case "propertiesMapEntry":
                             if(this.object1.properties) {
                                this.object1.properties.set(data.key, data.value);
                             }
                            break;
                        case "particleAttribute": {
                            const { attributeName, particleIndex, value } = data;
                            const attribute = this.object1.properties.get(attributeName);
                            if (attribute && attribute.array) {
                                // Assuming a stride of 3 for vector attributes (pos, rot, scale)
                                const startIndex = particleIndex * 3;
                                attribute.array[startIndex] = value[0];
                                attribute.array[startIndex + 1] = value[1];
                                attribute.array[startIndex + 2] = value[2];
                            }
                            break;
                        console.log()
                        }
                        default:
                            console.warn(`Unknown update type: ${type}`);
                    }
                }
                break;
            }
            case ("resetAllParticles"): {
                this.object1.instanceCount = 0;
                const lifeTime = this.object1.properties.get("lifeTime").array;
                for (let i = 0; i < this.object1.maxSpawnCount; i++) {
                    lifeTime[i * 2] = 0;
                    this.resetParticle(i);
                }
                break;
            }
            case ("burst"): {
                const { amount } = input.data.value;
                const lifeTime = this.object1.properties.get("lifeTime").array;
                const overFlow = this.object1.maxSpawnCount - (this.object1.instanceCount + amount);
                let start = (overFlow >= 0 && (lifeTime[this.object1.instanceCount] == 0)) ? this.object1.instanceCount : 0;

                for (let i = start; i <= (start + amount); i++) {
                    if (overFlow >= 0) {
                        this.object1.instanceCount += 1;
                    } else {
                        lifeTime[i] = 0;
                    }
                    this.resetParticle(i);
                }
                break;
            }
            case ("resetParticle"): {
                const { index } = input.data.value;
                this.resetParticle(index);
                break;
            }
            case ("resetParticles"): {
                const amount = input.data.value.amount;
                for (let i = 0; i < amount; i++) {
                    this.resetParticle(i);
                }
                break;
            }
            case ("updateSimulation"): {
                if (!input.data || !input.data.value || input.data.value.delta === undefined) {
                    return console.error("Received 'updateSimulation' task but input.data.value or input.data.value.delta is undefined.");
                }
                this.updateSimulation(input.data.value.delta, input.data.value.respawn,input.data.value.kill);
                break;
            }
            case ("setMaxLifeTimes"): {
                const { lifetime } = input.data.value;
                const lifeTimeArray = this.object1.properties.get("lifeTime").array;
                for (let i = 0; i < this.object1.amount; i++) {
                    lifeTimeArray[i * 2 + 1] = lifetime;
                }
                break;
            }
            case ("setEventHandler"): {
                const { handlerName, functionKey, args } = input.data.value;
                if (functionKey === null) {
                    // Allow unsetting the handler
                    if (handlerName === 'onParticleBirth') this.onParticleBirth = { key: null, args: null };
                    if (handlerName === 'onParticleKill') this.onParticleKill = { key: null, args: null };
                } else if (this.userFunctions.has(functionKey)) {
                    const actualFunc = self[functionKey]; // Get function from global scope

                    if (typeof actualFunc === 'function') {
                        if (handlerName === 'onParticleBirth') {
                            // Store the key and the args passed in the message
                            this.onParticleBirth = { func: actualFunc, args: args };
                        } else if (handlerName === 'onParticleKill') {
                            // Store the key and the args passed in the message
                            this.onParticleKill = { func: actualFunc, args: args };
                        } else {
                            console.warn(`Unknown event handler: ${handlerName}`);
                        }
                    } else {
                        console.warn(`Function key '${functionKey}' resolved to a non-function value in global scope.`);
                    }
                } else {
                    console.warn(`Function key '${functionKey}' not found in userFunctions map.`);
                }
                break;
            }
            case ("registerFunctions"): {
                const functionsMap = input.data.value.functionsMap;
                this.registerFunctions(functionsMap);
                break;
            }
        }
    }

    registerFunctions(functionsMap) {
        for (const [key, args] of functionsMap) {
            // Store the entire object { func: actualFunction, args: originalArgs }
            this.userFunctions.set(key, args);
        }
    }
    // These methods are for setting handlers from within the worker itself,
    // not for registering functions from the main thread.
    // They are kept for potential internal use or if the worker needs to define its own handlers.
    onParticleBirth(func, args) {
        this.onParticleBirth = { func: func, args: args };
    }

    onParticleKill(func, args) {
        this.onParticleKill = { func: func, args: args };
    }

    bezier(out, a, b, c, d, t, vec3Index) {
        let inverseFactor = 1 - t;
        let inverseFactorTimesTwo = inverseFactor * inverseFactor;
        let factorTimes2 = t * t;
        let factor1 = inverseFactorTimesTwo * inverseFactor;
        let factor2 = 3 * t * inverseFactorTimesTwo;
        let factor3 = 3 * factorTimes2 * inverseFactor;
        let factor4 = factorTimes2 * t;
        out[vec3Index] += a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
        if(a.length > 1){
            out[vec3Index+1] += a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
            if(a.length > 2){
                out[vec3Index+2] += a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
            }
        }
    }

    lerpAttribute(out, a, b, t, vec3Index) {
        out[vec3Index] = a[vec3Index] + t * (b[vec3Index] - a[vec3Index]);
        if(a.length > 1){
            out[vec3Index+1] = a[vec3Index+1] + t * (b[vec3Index+1] - a[vec3Index+1]);
            if(a.length > 2){
                out[vec3Index+2] = a[vec3Index+2] + t * (b[vec3Index+2] - a[vec3Index+2]);
            }
        }
    }

    lerpIndividual(out, a, b, t, vec3Index) {
        out[vec3Index] = a[vec3Index] + t * (b[vec3Index] - a[vec3Index]);
        out[vec3Index + 1] = a[vec3Index + 1] + t * (b[vec3Index + 1] - a[vec3Index + 1]);
        out[vec3Index + 2] = a[vec3Index + 2] + t * (b[vec3Index + 2] - a[vec3Index + 2]);
    }

    resetTransform(index) {
        const start = this.object1.properties.get("sourceValues").get("transform");
        const pos1 = new Array(3).fill(0);
        if (this.individualTransform) {
            const i = index * 3;
            pos1[0] = start.values[i];
            pos1[1] = start.values[i + 1];
            pos1[2] = start.values[i + 2];
        } else {
            pos1[0] = start.values[0];
            pos1[1] = start.values[1];
            pos1[2] = start.values[2];
        }
        return pos1;
    }

    setTransform(x, y, z, index) {
        const transformArray = this.object1.properties.get("transform").array;
        const i = index * 3;
        transformArray[i] = x;
        transformArray[i + 1] = y;
        transformArray[i + 2] = z;
    }

    resetAttribute(attributeName, index, isIndividual) {
        const sourceAttribute = this.object1.properties.get("sourceValues").get(attributeName);
        const values = new Array(3).fill(0); // Assuming 3 components for simplicity, matching setAttribute
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

    setAttribute(attributeName, x, y, z, index) {
        const attributeArray = this.object1.properties.get(attributeName).array;
        const i = index * 3;
        attributeArray[i] = x;
        attributeArray[i + 1] = y;
        attributeArray[i + 2] = z;
    }

    resetParticle(index) {
        const vec3Index = index * 3;
        const sourceValues = this.object1.properties.get("sourceValues");
        const newPositionArray = this.object1.properties.get("transform").array;

        // Reset Transform
        const pos1 = this.resetTransform(index);
        newPositionArray[vec3Index] = pos1[0];
        newPositionArray[vec3Index + 1] = pos1[1];
        newPositionArray[vec3Index + 2] = pos1[2];

        // Reset Rotation, Scale, Direction
        const rot1 = this.resetAttribute("rotation", index, this.individualRotation);
        this.setAttribute("rotation", rot1[0], rot1[1], rot1[2], index);

        const scale1 = this.resetAttribute("scale", index, this.individualScale);
        this.setAttribute("scale", scale1[0], scale1[1], scale1[2], index);

        const direc2 = this.resetAttribute("direction", index, this.individualDirection);
        this.setAttribute("direction", direc2[0], direc2[1], direc2[2], index);

        // Handle random values for transform, rotation, scale, direction
        const posSource = sourceValues.get("transform");
        if (posSource && posSource.random) {
            newPositionArray[vec3Index] += this.range(0, 1, posSource.minRange, posSource.maxRange, Math.random());
            newPositionArray[vec3Index + 1] += this.range(0, 1, posSource.minRange, posSource.maxRange, Math.random());
            newPositionArray[vec3Index + 2] += this.range(0, 1, posSource.minRange, posSource.maxRange, Math.random());
        }
        const rotSource = sourceValues.get("rotation");
        if (rotSource && rotSource.random) {
            const rotationArray = this.object1.properties.get("rotation").array;
            rotationArray[vec3Index] += this.range(0, 1, rotSource.minRange, rotSource.maxRange, Math.random());
            rotationArray[vec3Index + 1] += this.range(0, 1, rotSource.minRange, rotSource.maxRange, Math.random());
            rotationArray[vec3Index + 2] += this.range(0, 1, rotSource.minRange, rotSource.maxRange, Math.random());
        }
        const scaleSource = sourceValues.get("scale");
        if (scaleSource && scaleSource.random) {
            const scaleArray = this.object1.properties.get("scale").array;
            scaleArray[vec3Index] += this.range(0, 1, scaleSource.minRange, scaleSource.maxRange, Math.random());
            scaleArray[vec3Index + 1] += this.range(0, 1, scaleSource.minRange, scaleSource.maxRange, Math.random());
            scaleArray[vec3Index + 2] += this.range(0, 1, scaleSource.minRange, scaleSource.maxRange, Math.random());
        }
        const direcSource = sourceValues.get("direction");
        if (direcSource && direcSource.random) {
            const directionArray = this.object1.properties.get("direction").array;
            directionArray[vec3Index] += this.range(0, 1, direcSource.minRange, direcSource.maxRange, Math.random());
            directionArray[vec3Index + 1] += this.range(0, 1, direcSource.minRange, direcSource.maxRange, Math.random());
            directionArray[vec3Index + 2] += this.range(0, 1, direcSource.minRange, direcSource.maxRange, Math.random());
        }

        // Handle other attributes over lifetime
        if (this.object1.attributesoverLifeTime) {
            this.object1.attributesoverLifeTime.forEach((value, attribute) => {
                if (attribute !== "transform" && attribute !== "rotation" && attribute !== "scale" && attribute !== "force" && attribute !== "direction" && attribute !== "position") {
                    try {
                        const sourceAttribute = sourceValues.get(attribute);
                        const attrArray = this.object1.properties.get(attribute).array;
                        const stride = sourceAttribute.values.length; // Use stride from source
                        const attrIndex = index * stride;

                        for (let i = 0; i < stride; i++) {
                            let randomVal = 0;
                            if (sourceAttribute.random) {
                                randomVal = this.range(0, 1, sourceAttribute.minRange, sourceAttribute.maxRange, Math.random());
                            }
                            attrArray[attrIndex + i] = sourceAttribute.values[i] + randomVal;
                        }
                    } catch (e) {
                        console.error(`Error resetting attribute ${attribute}:`, e);
                    }
                }
            });
        }

        // Call onParticleBirth if it exists, passing stored args
        if (this.onParticleBirth && this.onParticleBirth.key) { // Check if key is set
            const handlerFunc = self[this.onParticleBirth.key]; // Get function from global scope
            if (typeof handlerFunc === 'function') {
                // Pass the stored args, particle system state, and the index to the user function
                if (this.onParticleBirth.args) {
                    this.onParticleBirth.args.index=index;
                    handlerFunc(this.onParticleBirth.args);
                } else {
                    handlerFunc(this.object1, index);
                }
            }
        }
    }

    updateSimulation(delta, respawn = true, kill = true) {
        if (!this.object1.properties) return console.warn("No properties found in object1");
        const maxSpawnCount = typeof this.object1.maxSpawnCount === 'number' ? this.object1.maxSpawnCount : 0;
        if (maxSpawnCount === 0) return console.warn("maxSpawnCount is zero or not a number");
        const attributesoverLifeTime = this.object1.attributesoverLifeTime;
        const lifeTime = this.object1.properties.get("lifeTime").array;
        const maxLifeTimeProps = this.object1.properties.get("sourceValues").get("maxLifeTime");

        if (respawn || (this.fullySpawned === false && this.object1.spawnOverTime === true)) {
            if (this.object1.spawnFrequency < this.object1.spawFrequency) {
                this.object1.spawnFrequency += delta;
            } else {
                this.object1.spawnFrequency = 0;
                let burstCountOfset = this.object1.maxSpawnCount - (this.object1.burstCount + this.object1.instanceCount);
                console.log("ofset "+ burstCountOfset+ " burst "+ this.object1.burstCount+" inst "+this.object1.instanceCount+ " fully "+this.fullySpawned+ " respawn "+respawn + " spawnovertime "+this.object1.spawnOverTime);
                if (burstCountOfset <= 0) {
                    this.object1.instanceCount += (this.object1.burstCount + burstCountOfset);
                } else {
                    this.object1.instanceCount += this.object1.burstCount;
                }
                if (this.object1.instanceCount >= this.object1.maxSpawnCount) {
                    this.object1.instanceCount = this.object1.maxSpawnCount;
                    this.fullySpawned = true;
                }
            }
        }

        let force = [...this.object1.force];
        this.killCount = 0;
        // console.log(lifeTime)
        for (let index = 0; index < this.object1.instanceCount; index++) {
            const lifeTimeIndex = index * 2;
            lifeTime[lifeTimeIndex] += delta;

            if (lifeTime[lifeTimeIndex] <= lifeTime[lifeTimeIndex + 1]) {
                const step = (lifeTime[lifeTimeIndex] / lifeTime[lifeTimeIndex + 1]);
                const vec3Index = index * 3;

                const newPositionArray = this.object1.properties.get("transform").array;
                const directionArray = this.object1.properties.get("direction").array;

                // Position update
                if (attributesoverLifeTime.has("position")) {
                    const value = attributesoverLifeTime.get("position");
                    if (value.bezier === true) {
                        this.bezier(newPositionArray, value.values, value.bezierControllPointA, value.bezierControllPointB, value.end, step, vec3Index);
                    } else {
                        this.lerpIndividual(newPositionArray, value.values, value.end, step, vec3Index);
                    }
                }

                // Apply force and direction
                newPositionArray[vec3Index] += (directionArray[vec3Index] !== 0 ? (force[0] * directionArray[vec3Index]) : force[0]);
                newPositionArray[vec3Index + 1] += (directionArray[vec3Index + 1] !== 0 ? (force[1] * directionArray[vec3Index + 1]) : force[1]);
                newPositionArray[vec3Index + 2] += (directionArray[vec3Index + 2] !== 0 ? (force[2] * directionArray[vec3Index + 2]) : force[2]);

                // Apply noise
                if (this.object1.noise > 0) {
                    const noise = Math.sin(delta * 10 * this.object1.noise);
                    newPositionArray[vec3Index] += noise;
                    newPositionArray[vec3Index + 1] += noise;
                    newPositionArray[vec3Index + 2] += noise;
                }

                // Apply forceFieldForce
                const sourceForceFieldForce = this.object1.properties.get("sourceValues").get("forceFieldForce");
                if (sourceForceFieldForce && sourceForceFieldForce.values && sourceForceFieldForce.values.length > 0) {
                    let forceFieldValues = [0, 0, 0];
                    if (this.individualForceField) {
                        const ffIndex = index * 3;
                        forceFieldValues[0] = this.object1.forcefield[ffIndex];
                        forceFieldValues[1] = this.object1.forcefield[ffIndex + 1];
                        forceFieldValues[2] = this.object1.forcefield[ffIndex + 2];
                    } else {
                        forceFieldValues[0] = sourceForceFieldForce.values[0];
                        forceFieldValues[1] = sourceForceFieldForce.values[1];
                        forceFieldValues[2] = sourceForceFieldForce.values[2];
                    }
                    newPositionArray[vec3Index] += forceFieldValues[0];
                    newPositionArray[vec3Index + 1] += forceFieldValues[1];
                    newPositionArray[vec3Index + 2] += forceFieldValues[2];
                }

                // Apply other attributes over lifetime (commented out in user's code)
                attributesoverLifeTime.forEach((value, attribute) => {
                    if (attribute === "position") return;
                    if (attribute === "force") {
                        force[0] += (step * value.values[0]);
                        force[1] += (step * value.values[1]);
                        force[2] += (step * value.values[2]);
                    } else {
                        try {
                            const arr = this.object1.properties.get(attribute).array;
                            const stride = value.values.length;
                            const arrIndex = index * stride;
                            for (let i2 = 0; i2 < stride; i2++) {
                               if(value.end && value.end.length > i2) {
                                    arr[arrIndex + i2] = lerp(value.values[i2], value.end[i2], step);
                               } else {
                                    // If no end value is provided, assume no animation for this component, so it retains its initial value.
                                    arr[arrIndex + i2] = value.values[i2];
                               }
                            }
                        } catch {}
                    }
                });

            } else if (kill) {
                this.killCount++;
                // Call onParticleKill if it exists, passing stored args
                if (this.onParticleKill && this.onParticleKill.key) { // Check if key is set
                    const handlerFunc = self[this.onParticleKill.key]; // Get function from global scope
                    if (typeof handlerFunc === 'function') {
                        // Pass the stored args, particle system state, and the index to the user function
                        if (this.onParticleKill.args) {
                            handlerFunc(this.onParticleKill.args, this.object1, index);
                        } else {
                            handlerFunc(this.object1, index);
                        }
                    }
                }
                lifeTime[lifeTimeIndex] = 0;
                lifeTime[lifeTimeIndex + 1] = maxLifeTimeProps.values;
                if (maxLifeTimeProps.random) {
                    lifeTime[lifeTimeIndex + 1] += this.range(0, 1, maxLifeTimeProps.minRange, maxLifeTimeProps.maxRange, Math.random());
                }
                this.resetParticle(index);
            }
        }
        this.object1.instanceCount -= this.killCount;

        postMessage({
            index: this.index,
            values: {
                transform: this.object1.properties.get("transform").array,
                scale: this.object1.properties.get("scale").array,
                rotation: this.object1.properties.get("rotation").array,
                lifeTime: lifeTime,
                color: this.object1.properties.get("color").array,
                emission: this.object1.properties.get("emission").array,
                opacity: this.object1.properties.get("opacity").array,
                direction: this.object1.properties.get("direction").array,
                instanceCount: this.object1.instanceCount,
            },
        });
    }
}
