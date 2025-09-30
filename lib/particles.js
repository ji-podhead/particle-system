import * as glMatrix from 'gl-matrix';
import { lerp, clamp, invlerp, range } from './myMath.js';

let rot = new Array(3);
let scale = new Array(3);
let col = new Array(3);
let pos = new Array(3);
let direc = new Array(3);
let rot1, scale1, pos1, direc1;
let killCount = 0;
const tempArr0 = [];
const tempArr1 = new Array(2);
const tempArr2 = new Array(3);
let indexA0, indexA1, indexA2;
let indexB0, indexB1, indexB2;
const matrix4R = glMatrix.mat4.create();
const matrix4S = glMatrix.mat4.create();
const matrix4T = glMatrix.mat4.create();
const matrix4 = glMatrix.mat4.create();
const matrix4B = glMatrix.mat4.create();
let quat = glMatrix.quat.create();
const quat2 = glMatrix.quat.create();
const normalVector = glMatrix.vec3.create();

const scaleVector = glMatrix.vec3.create();
const rotationVector = new Float32Array(3);
const positionVector = new Float32Array(3);
const directionVector = new Float32Array(3);
const v2A = glMatrix.vec2.create();
const v2B = glMatrix.vec2.create();
const crossA = glMatrix.vec3.create();
const crossB = glMatrix.vec3.create();
const crossC = glMatrix.vec3.create();
let x1, x2, y1, y2, z1, z2;
const postemp2 = new Float32Array(3);
let randomX, randomY, randomZ;
const scaletemp2 = new Float32Array(3);
const rottemp2 = new Float32Array(3);
let isRotating;
let isScaling;
let isTransforming;

export class Particles {
    constructor() {
        // Constructor can be left empty or with some default initializations
    }

    initData(amount, maxLifeTime, burstCount, spawnOverTime, spawnFrequency, maxSpawnCount, startPosition, startScale, startRotation, startDirection, startOpacity, startColor, startForce, startForceFieldForce) {
        this.spawnOfset = 0;
        this.indexSlide = false;
        amount = typeof amount != "number" && amount < 0 ? 100 : amount;
        maxLifeTime = typeof maxLifeTime != "number" ? { values: 10, random: false } : maxLifeTime;
        startPosition = typeof startPosition != "object" || startPosition == undefined ? { values: [0, 0, 0], random: false } : startPosition;
        startScale = typeof startScale != "object" ? { values: [1, 1, 1], random: false } : startScale;
        startRotation = typeof startRotation != "object" ? { values: [0, 0, 0], random: false } : startRotation;
        startColor = typeof startColor != "object" ? { values: [1, 1, 1], random: false } : startColor;
        startForce = typeof startForce != "object" ? { values: [0, 0, 0] } : startForce;
        startForceFieldForce = typeof startForceFieldForce != "object" ? { values: [0, 0, 0], random: false } : startForceFieldForce;
        spawnFrequency = typeof spawnFrequency != "number" ? 1 : spawnFrequency;
        maxSpawnCount = typeof maxSpawnCount != "number" ? amount : maxSpawnCount;
        spawnOverTime = typeof spawnOverTime != "boolean" ? true : spawnOverTime;
        burstCount = typeof burstCount != "number" ? amount : (burstCount > maxSpawnCount ? maxSpawnCount : burstCount);
        startDirection = typeof startDirection != "object" ? { values: [0, 0, 0], random: false } : startDirection;
        startOpacity = typeof startOpacity != "number" ? { values: [1], random: false } : startOpacity;

        this.amount = amount;
        this.vertCount = 4;
        this.noise = 0;
        this.pointCloud = [];
        this.startPositionFromgeometry = false;
        this.forcefield = [];
        this.force = startForce.values;
        this.forceFieldForce = startForceFieldForce.values;
        this.attributesoverLifeTime = new Map();
        this.properties = new Map();
        this.spawFrequency = spawnFrequency;
        this.maxSpawnCount = maxSpawnCount;
        this.spawnOverTime = spawnOverTime;
        this.waitingtime = 0;
        this.burstCount = burstCount;
        this.additionalBurstCount = 0;
        this.evenFunctions = new Map();
        this.particleEventFunctions = new Map();
        this.childParticles = new Map();

        const emissionArray = new Uint8Array(this.amount * 3);
        const colorArray = new Float32Array(this.amount * 3);
        const opacityArray = new Float32Array(this.amount);
        const lifeTimeArray = new Float32Array(this.amount * 2);
        const positionArray = new Float32Array(this.amount * 3);
        const scaleArray = new Float32Array(this.amount * 3);
        const rotationArray = new Float32Array(this.amount * 3);
        const directionArray = new Float32Array(this.amount * 3);

        const sourceValues = new Map();
        sourceValues.set("transform", startPosition);
        sourceValues.set("color", startColor);
        sourceValues.set("emission", { values: [0, 0, 0], random: false, minRange: 0, maxRange: 0 });
        sourceValues.set("rotation", startRotation);
        sourceValues.set("scale", startScale);
        sourceValues.set("forceFieldForce", startForceFieldForce);
        sourceValues.set("force", startForce);
        sourceValues.set("direction", startDirection);
        sourceValues.set("opacity", startOpacity);
        sourceValues.set("maxLifeTime", maxLifeTime);

        this.properties.set("sourceValues", sourceValues);
        this.properties.set("transform", { array: positionArray });
        this.properties.set("rotation", { array: rotationArray });
        this.properties.set("scale", { array: scaleArray });
        this.properties.set("color", { array: colorArray });
        this.properties.set("emission", { array: emissionArray });
        this.properties.set("direction", { array: directionArray });
        this.properties.set("lifeTime", { array: lifeTimeArray });
        this.properties.set("opacity", { array: opacityArray });

        this.instance = { instanceCount: 0 };
    }

    createInstancedMesh(scene, geometry, material) {
        const instancedGeometry = new THREE.InstancedBufferGeometry();
        instancedGeometry.index = geometry.index;
        instancedGeometry.setAttribute('position', geometry.attributes.position);
        instancedGeometry.setAttribute('uv', geometry.attributes.uv);
        instancedGeometry.setAttribute('normal', geometry.attributes.normal);

        const positionAttribute = new THREE.InstancedBufferAttribute(this.properties.get("transform").array, 3);
        const scaleAttribute = new THREE.InstancedBufferAttribute(this.properties.get("scale").array, 3);
        const rotationAttribute = new THREE.InstancedBufferAttribute(this.properties.get("rotation").array, 3);
        const colorAttribute = new THREE.InstancedBufferAttribute(this.properties.get("color").array, 3);
        const opacityAttribute = new THREE.InstancedBufferAttribute(this.properties.get("opacity").array, 1);

        instancedGeometry.setAttribute('instancePosition', positionAttribute);
        instancedGeometry.setAttribute('instanceScale', scaleAttribute);
        instancedGeometry.setAttribute('instanceRotation', rotationAttribute);
        instancedGeometry.setAttribute('instanceColor', colorAttribute);
        instancedGeometry.setAttribute('instanceOpacity', opacityAttribute);

        const instancedMesh = new THREE.Mesh(instancedGeometry, material);
        scene.add(instancedMesh);

        this.properties.get("transform").attribute = positionAttribute;
        this.properties.get("scale").attribute = scaleAttribute;
        this.properties.get("rotation").attribute = rotationAttribute;
        this.properties.get("color").attribute = colorAttribute;
        this.properties.get("opacity").attribute = opacityAttribute;

        material.onBeforeCompile = shader => {
            shader.vertexShader = `
                attribute vec3 instancePosition;
                attribute vec3 instanceScale;
                attribute vec3 instanceRotation;
                attribute vec3 instanceColor;
                attribute float instanceOpacity;
                varying vec3 vInstanceColor;
                varying float vInstanceOpacity;

                mat4 rotationMatrix(vec3 axis, float angle) {
                    axis = normalize(axis);
                    float s = sin(angle);
                    float c = cos(angle);
                    float oc = 1.0 - c;
                    return mat4(oc * axis.x * axis.x + c, oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s, 0.0,
                                oc * axis.x * axis.y + axis.z * s, oc * axis.y * axis.y + c, oc * axis.y * axis.z - axis.x * s, 0.0,
                                oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c, 0.0,
                                0.0, 0.0, 0.0, 1.0);
                }

                mat4 rotateXYZ() {
                    return rotationMatrix(vec3(1, 0, 0), instanceRotation.x) *
                           rotationMatrix(vec3(0, 1, 0), instanceRotation.y) *
                           rotationMatrix(vec3(0, 0, 1), instanceRotation.z);
                }
            ` + shader.vertexShader;

            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `
                #include <begin_vertex>
                mat4 modelMatrix = modelMatrix * rotateXYZ();
                modelMatrix[3][0] = instancePosition.x;
                modelMatrix[3][1] = instancePosition.y;
                modelMatrix[3][2] = instancePosition.z;
                transformed = (modelMatrix * vec4(position, 1.0)).xyz;
                vInstanceColor = instanceColor;
                vInstanceOpacity = instanceOpacity;
                `
            );

            shader.fragmentShader = `
                varying vec3 vInstanceColor;
                varying float vInstanceOpacity;
            ` + shader.fragmentShader;

            shader.fragmentShader = shader.fragmentShader.replace(
                'vec4 diffuseColor = vec4( diffuse, opacity );',
                'vec4 diffuseColor = vec4( vInstanceColor, vInstanceOpacity );'
            );
        };
        return instancedMesh;
    }


    setTransform(x, y, z, index) {
        indexA0 = index * 3;
        const trans = this.properties.get("transform").array;
        trans[indexA0] = x;
        trans[indexA0 + 1] = y;
        trans[indexA0 + 2] = z;
    }

    setScale(x, y, z, index) {
        indexA0 = index * 3;
        const scaleArr = this.properties.get("scale").array;
        scaleArr[indexA0] = x;
        scaleArr[indexA0 + 1] = y;
        scaleArr[indexA0 + 2] = z;
    }

    setRotation(x, y, z, index) {
        indexA0 = index * 3;
        const rotArr = this.properties.get("rotation").array;
        rotArr[indexA0] = x;
        rotArr[indexA0 + 1] = y;
        rotArr[indexA0 + 2] = z;
    }

    setStartDirection(x, y, z, random, minRange, maxRange) {
        direc = this.properties.get("sourceValues").get("direction");
        direc.values = [x, y, z];
        direc.random = random;
        direc.minRange = minRange;
        direc.maxRange = maxRange;
    }

    resetParticle(index) {
        const sourceValues = this.properties.get("sourceValues");
        const attributesoverLifeTimeValues = this.attributesoverLifeTime;

        indexA0 = index * 3;
        indexA1 = indexA0 + 1;
        indexA2 = indexA1 + 1;

        const posSource = sourceValues.get("transform");
        const rotSource = sourceValues.get("rotation");
        const scaleSource = sourceValues.get("scale");
        const colorSource = sourceValues.get("color");
        const opacitySource = sourceValues.get("opacity");
        const directionSource = sourceValues.get("direction");

        const posArr = this.properties.get("transform").array;
        const rotArr = this.properties.get("rotation").array;
        const scaleArr = this.properties.get("scale").array;
        const colorArr = this.properties.get("color").array;
        const opacityArr = this.properties.get("opacity").array;
        const directionArr = this.properties.get("direction").array;

        posArr[indexA0] = posSource.values[0] + (posSource.random ? range(-1, 1, posSource.minRange, posSource.maxRange, Math.random()) : 0);
        posArr[indexA1] = posSource.values[1] + (posSource.random ? range(-1, 1, posSource.minRange, posSource.maxRange, Math.random()) : 0);
        posArr[indexA2] = posSource.values[2] + (posSource.random ? range(-1, 1, posSource.minRange, posSource.maxRange, Math.random()) : 0);

        rotArr[indexA0] = rotSource.values[0] + (rotSource.random ? range(-1, 1, rotSource.minRange, rotSource.maxRange, Math.random()) : 0);
        rotArr[indexA1] = rotSource.values[1] + (rotSource.random ? range(-1, 1, rotSource.minRange, rotSource.maxRange, Math.random()) : 0);
        rotArr[indexA2] = rotSource.values[2] + (rotSource.random ? range(-1, 1, rotSource.minRange, rotSource.maxRange, Math.random()) : 0);

        scaleArr[indexA0] = scaleSource.values[0] + (scaleSource.random ? range(-1, 1, scaleSource.minRange, scaleSource.maxRange, Math.random()) : 0);
        scaleArr[indexA1] = scaleSource.values[1] + (scaleSource.random ? range(-1, 1, scaleSource.minRange, scaleSource.maxRange, Math.random()) : 0);
        scaleArr[indexA2] = scaleSource.values[2] + (scaleSource.random ? range(-1, 1, scaleSource.minRange, scaleSource.maxRange, Math.random()) : 0);

        colorArr[indexA0] = colorSource.values[0] + (colorSource.random ? range(-1, 1, colorSource.minRange, colorSource.maxRange, Math.random()) : 0);
        colorArr[indexA1] = colorSource.values[1] + (colorSource.random ? range(-1, 1, colorSource.minRange, colorSource.maxRange, Math.random()) : 0);
        colorArr[indexA2] = colorSource.values[2] + (colorSource.random ? range(-1, 1, colorSource.minRange, colorSource.maxRange, Math.random()) : 0);

        opacityArr[index] = opacitySource.values[0] + (opacitySource.random ? range(-1, 1, opacitySource.minRange, opacitySource.maxRange, Math.random()) : 0);

        directionArr[indexA0] = directionSource.values[0] + (directionSource.random ? range(-1, 1, directionSource.minRange, directionSource.maxRange, Math.random()) : 0);
        directionArr[indexA1] = directionSource.values[1] + (directionSource.random ? range(-1, 1, directionSource.minRange, directionSource.maxRange, Math.random()) : 0);
        directionArr[indexA2] = directionSource.values[2] + (directionSource.random ? range(-1, 1, directionSource.minRange, directionSource.maxRange, Math.random()) : 0);
    }

    startPS() {
        const lifeTime = this.properties.get("lifeTime").array;
        const max = this.properties.get("sourceValues").get("maxLifeTime");
        for (let i = 0; i < this.amount; i++) {
            this.resetParticle(i);
            lifeTime[i * 2] = 0;
            lifeTime[i * 2 + 1] = max.values + (max.random ? range(0, 1, max.minRange, max.maxRange, Math.random()) : 0);
        }
        this.instance.instanceCount = this.burstCount;
    }

    setAttributeOverLifeTime(attribute, start, end) {
        this.attributesoverLifeTime.set(attribute, { start, end });
    }

    updateSimulation(delta, respawn, reset, kill, translate) {
        if (this.maxSpawnCount === 0) return;

        if (respawn) {
            this.waitingtime += delta;
            if (this.waitingtime >= this.spawFrequency) {
                this.waitingtime = 0;
                const burst = Math.min(this.burstCount, this.maxSpawnCount - this.instance.instanceCount);
                this.instance.instanceCount += burst;
            }
        }

        const lifeTimeArr = this.properties.get("lifeTime").array;
        const posArr = this.properties.get("transform").array;
        const scaleArr = this.properties.get("scale").array;
        const rotArr = this.properties.get("rotation").array;
        const colorArr = this.properties.get("color").array;
        const opacityArr = this.properties.get("opacity").array;
        const directionArr = this.properties.get("direction").array;

        let killCount = 0;

        for (let i = 0; i < this.instance.instanceCount; i++) {
            const lifeTimeIndex = i * 2;
            lifeTimeArr[lifeTimeIndex] += delta;

            if (lifeTimeArr[lifeTimeIndex] < lifeTimeArr[lifeTimeIndex + 1]) {
                const lifeDelta = lifeTimeArr[lifeTimeIndex] / lifeTimeArr[lifeTimeIndex + 1];
                const i3 = i * 3;

                posArr[i3] += directionArr[i3] * delta + this.force[0] * delta;
                posArr[i3 + 1] += directionArr[i3 + 1] * delta + this.force[1] * delta;
                posArr[i3 + 2] += directionArr[i3 + 2] * delta + this.force[2] * delta;

                this.attributesoverLifeTime.forEach((attr, key) => {
                    const arr = this.properties.get(key).array;
                    if (arr.length / this.amount === 3) { // vec3
                        arr[i3] = lerp(attr.start[0], attr.end[0], lifeDelta);
                        arr[i3 + 1] = lerp(attr.start[1], attr.end[1], lifeDelta);
                        arr[i3 + 2] = lerp(attr.start[2], attr.end[2], lifeDelta);
                    } else { // float
                        arr[i] = lerp(attr.start[0], attr.end[0], lifeDelta);
                    }
                });

            } else {
                if (kill) {
                    killCount++;
                }
                if (reset) {
                    this.resetParticle(i);
                    const max = this.properties.get("sourceValues").get("maxLifeTime");
                    lifeTimeArr[lifeTimeIndex] = 0;
                    lifeTimeArr[lifeTimeIndex + 1] = max.values + (max.random ? range(0, 1, max.minRange, max.maxRange, Math.random()) : 0);
                }
            }
        }

        if (kill) {
            this.instance.instanceCount -= killCount;
        }
    }

    updateValues(attributes) {
        attributes.forEach(attr => {
            const property = this.properties.get(attr);
            if (property && property.attribute) {
                property.attribute.needsUpdate = true;
            }
        });
    }
}