import * as THREE from 'three';
import * as glMatrix from "gl-matrix";
import { lerp, clamp, invlerp, range } from './utils.js';

// This is a reconstructed version of the original file, restoring all functionality.
export class Particles {
	constructor() {
        // State will be initialized in InitializeParticles
	}

    // Restored Methods
    setSpawnOverTime(value) { this.spawnOverTime = value; }
    setSourceAttributes(attribute, values, random, minRange, maxRange) {
        const sourceValues = this.properties.get("sourceValues");
        const temp = sourceValues.get(attribute) || {};
        temp.values = values;
        temp.random = random;
        temp.minRange = minRange;
        temp.maxRange = maxRange;
        sourceValues.set(attribute, temp);
    }
    setAttributeOverLifeTime(attribute, values, end, bezier, bezierControllPointA, bezierControllPointB) {
        this.attributesoverLifeTime.set(attribute, { values, end, bezier, bezierControllPointA, bezierControllPointB });
    }
    setStartDirection(x, y, z, random, minRange, maxRange) {
        this.setSourceAttributes('direction', [x, y, z], random, minRange, maxRange);
    }
    setMaxSpawnCount(count) { this.maxSpawnCount = count > this.amount ? this.amount : count; }
    setForce(force) { this.force = force; this.properties.get("sourceValues").set("force", { values: force }); }
    setBurstCount(count) { this.burstCount = count > this.maxSpawnCount ? this.maxSpawnCount : count; }
    setSpawnFrequency(freq) { this.spawFrequency = freq; }
    setMaxLifeTime(maxLifeTime, random, minRange, maxRange) {
        const temp = this.properties.get("sourceValues").get("maxLifeTime") || {};
        temp.values = [maxLifeTime];
        temp.random = random;
        temp.minRange = minRange;
        temp.maxRange = maxRange;
        this.properties.get("sourceValues").set("maxLifeTime", temp);
    }
    setNoise(strength) { this.noise = strength; }

    setMorphTargets(morphTargets) {
		for (let i = 0; i < morphTargets.length; i++) {
			this.properties.set("morphTargets", parseInt(morphTargets[i]))
		}
		this.properties.get("morphTargetInfluences").attribute.needsUpdate = true
	}

    updateValues(attributes) {
		if (typeof attributes == "object") {
			for (const attribute of attributes) {
                try { this.properties.get(attribute).attribute.needsUpdate = true; }
                catch { console.warn(`${attribute} not defined.`); }
			}
		}
	}

    startPS() {
        const lifeTime = this.properties.get("lifeTime").array;
        const max = this.properties.get("sourceValues").get("maxLifeTime");
        const sourceValues = this.properties.get("sourceValues");
        const col = sourceValues.get("color");
        const collArr = this.properties.get("color").array;
        const emm = sourceValues.get("emission");
        const emmArr = this.properties.get("emission").array;
        const op = sourceValues.get("opacity");
        const opArr = this.properties.get("opacity").array;

        for (let i = 0; i < this.amount; i++) {
            const colorIndex = i * 3;
            const lifeTimeIndex = i * 2;
            opArr[i] = op.values[0];
            collArr[colorIndex] = col.values[0];
            collArr[colorIndex + 1] = col.values[1];
            collArr[colorIndex + 2] = col.values[2];
            emmArr[colorIndex] = emm.values[0];
            emmArr[colorIndex + 1] = emm.values[1];
            emmArr[colorIndex + 2] = emm.values[2];
            if (col.random) {
                collArr[colorIndex] += range(0, 1, col.minRange[0], col.maxRange[0], Math.random());
                collArr[colorIndex + 1] += range(0, 1, col.minRange[1], col.maxRange[1], Math.random());
                collArr[colorIndex + 2] += range(0, 1, col.minRange[2], col.maxRange[2], Math.random());
            }
            if (emm.random) {
                emmArr[colorIndex] += range(0, 1, emm.minRange[0], emm.maxRange[0], Math.random());
                emmArr[colorIndex + 1] += range(0, 1, emm.minRange[1], emm.maxRange[1], Math.random());
                emmArr[colorIndex + 2] += range(0, 1, emm.minRange[2], emm.maxRange[2], Math.random());
            }
            lifeTime[lifeTimeIndex] = 0;
            lifeTime[lifeTimeIndex + 1] = max.values[0];
            if (max.random) {
                lifeTime[lifeTimeIndex + 1] += range(0, 1, max.minRange, max.maxRange, Math.random());
            }
        }
        this.instance.instanceCount = this.burstCount;
    }

	updateSimulation(delta, respawn = true, reset = true, kill = true) {
		if (this.maxSpawnCount === 0) return;

		if (respawn) {
			if (this.waitingtime < this.spawFrequency) {
				this.waitingtime += delta;
			} else {
				this.waitingtime = 0;
				let burst = this.burstCount;
				let canSpawn = this.maxSpawnCount - this.instance.instanceCount;
				this.instance.instanceCount += Math.min(burst, canSpawn);
			}
		}

		let killCount = 0;
		for (let i = 0; i < this.instance.instanceCount; i++) {
			const lifeTime = this.properties.get("lifeTime").array;
			const lifeTimeIndex = i * 2;
			lifeTime[lifeTimeIndex] += delta;

			if (lifeTime[lifeTimeIndex] <= lifeTime[lifeTimeIndex + 1]) {
                const lifeTimedelta = lifeTime[lifeTimeIndex] / lifeTime[lifeTimeIndex + 1];
                this.attributesoverLifeTime.forEach((value, attribute) => {
                    const arr = this.properties.get(attribute)?.array;
                    if(arr) {
                        const stride = value.values.length;
                        const index = i * stride;
                        for(let j=0; j<stride; ++j) {
                            arr[index+j] += (value.end[j] - value.values[j]) * delta;
                        }
                    }
                });
                const force = this.force;
                const direction = this.properties.get("direction").array;
                const transform = this.properties.get("transform").array;
                const dirIndex = i * 3;
                const posIndex = i * 3;
                transform[posIndex] += direction[dirIndex] * force[0] * delta;
                transform[posIndex+1] += direction[dirIndex+1] * force[1] * delta;
                transform[posIndex+2] += direction[dirIndex+2] * force[2] * delta;
			} else {
				if (kill) killCount++;
				if (reset) this.resetParticle(i);
			}
		}
		this.instance.instanceCount -= killCount;
	}

    resetParticle(index) {
        const sourceValues = this.properties.get("sourceValues");
        for(const [key, value] of sourceValues.entries()) {
            if (this.properties.has(key)) {
                const prop = this.properties.get(key);
                if (prop.array && value.values) {
                    const stride = value.values.length;
                    for(let i=0; i<stride; ++i) {
                        prop.array[index * stride + i] = value.values[i];
                    }
                }
            }
        }
        const lifeTime = this.properties.get("lifeTime").array;
        lifeTime[index*2] = 0;
    }

	InitializeParticles(scene, mesh, amount, maxLifeTime, burstCount, spawnOverTime, spawnFrequency, maxSpawnCount, startPosition, startScale, startRotation,startDirection, startOpacity,startColor, startForce, startForceFieldForce) {
		this.amount = amount ?? 100;
		maxLifeTime = maxLifeTime ?? { values: [10], random: false };
		startPosition = startPosition ?? { values: [0, 0, 0], random: false };
		startScale = startScale ?? { values: [1, 1, 1], random: false };
		startRotation = startRotation ?? { values: [0, 0, 0], random: false };
		startColor = startColor ?? { values: [1, 1, 1], random: false };
		startForce = startForce ?? { values: [0, 0, 0] };
		startDirection = startDirection ?? { values: [0, 0, 0], random: false };
		startOpacity = startOpacity ?? { values: [1], random: false };

        this.noise = 0;
		this.force = startForce.values;
		this.attributesoverLifeTime = new Map();
		this.properties = new Map();
		this.spawFrequency = spawnFrequency ?? 1;
		this.maxSpawnCount = maxSpawnCount ?? amount;
		this.spawnOverTime = spawnOverTime ?? true;
		this.burstCount = burstCount ?? Math.min(100, this.maxSpawnCount);
        this.waitingtime = 0;

        const geometry = mesh.geometry;
		const instancedGeometry = new THREE.InstancedBufferGeometry();
		this.instance = instancedGeometry;
		instancedGeometry.index = geometry.index;

        const emissionArray = new Uint8Array(this.amount * 3);
		const colorArray = new Uint8Array(this.amount * 3);
		const directionArray = new Float32Array(this.amount*3);
		const opacityArray = new Float32Array(this.amount);
		const lifeTimeArray = new Float32Array(amount*2);
        const morphtargetsInfluencesArray = new Float32Array(this.amount);
		const matArraySize = this.amount * 3;
		const matrixArray = [ new Float32Array(matArraySize), new Float32Array(matArraySize), new Float32Array(matArraySize) ];

		const emissiveAttribute = new THREE.InstancedBufferAttribute(emissionArray, 3, true);
		const colorAttribute = new THREE.InstancedBufferAttribute(colorArray, 3, true);
		const opacityAttribute = new THREE.InstancedBufferAttribute(opacityArray, 1, true);
        const morphTargetsinfluencesAttriute = new THREE.InstancedBufferAttribute(morphtargetsInfluencesArray, 1, true)
		const boxPositionAttribute=	new THREE.InstancedBufferAttribute( matrixArray[0], 3 );
		const boxSizeAttribute=   	new THREE.InstancedBufferAttribute( matrixArray[1], 3 );
		const rotatioAttributen= 	new THREE.InstancedBufferAttribute( matrixArray[2], 3 );

        instancedGeometry.instanceCount = 0;
		instancedGeometry.setAttribute('aInstanceColor',colorAttribute);
		instancedGeometry.setAttribute('aInstanceEmissive',emissiveAttribute);
		instancedGeometry.setAttribute('opacity1',opacityAttribute);
        instancedGeometry.setAttribute('morphTargetInfluences',morphTargetsinfluencesAttriute)
		instancedGeometry.setAttribute( 'boxPosition', boxPositionAttribute);
		instancedGeometry.setAttribute( 'boxSize',boxSizeAttribute );
		instancedGeometry.setAttribute( 'rotation', rotatioAttributen);
		Object.keys(geometry.attributes).forEach(attributeName => {
			instancedGeometry.attributes[attributeName] = geometry.attributes[attributeName]
		});

        const sourceValues = new Map();
		sourceValues.set("transform", startPosition);
		sourceValues.set("color", startColor);
		sourceValues.set("emission", {values:[0,0,0],random:false,minRange:0,maxRange:0});
		sourceValues.set("rotation", startRotation);
		sourceValues.set("scale", startScale);
		sourceValues.set("force", startForce);
		sourceValues.set("direction", startDirection);
		sourceValues.set("opacity",startOpacity);
		sourceValues.set("maxLifeTime",maxLifeTime);
        sourceValues.set("morphTargetInfluences", {values: [0]});
		this.properties.set("sourceValues", sourceValues);
		this.properties.set("transform", { array: matrixArray[0], attribute: boxPositionAttribute });
		this.properties.set("rotation", { array: matrixArray[2], attribute: rotatioAttributen});
		this.properties.set("scale", { array: matrixArray[1], attribute: boxSizeAttribute });
		this.properties.set("color", { array: colorArray, attribute: colorAttribute });
		this.properties.set("emission", { array: emissionArray, attribute: emissiveAttribute });
		this.properties.set("direction",{array:directionArray});
		this.properties.set("lifeTime",{array:lifeTimeArray});
		this.properties.set("opacity",{array:opacityArray,attribute:opacityAttribute});
        this.properties.set("morphTargetInfluences", { array: morphtargetsInfluencesArray, attribute: morphTargetsinfluencesAttriute });

		const instanceMaterial = mesh.material.clone();
		if(instanceMaterial.transparent==true){
			instanceMaterial.depthWrite=false;
		}

        instanceMaterial.onBeforeCompile = shader => {
            shader.vertexShader = `
            attribute vec3 boxPosition;
            attribute vec3 boxSize;
            attribute vec3 rotation;
            attribute vec3 aInstanceColor;
            attribute vec3 aInstanceEmissive;
            attribute float opacity1;
            attribute float morphTargetInfluences;
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
              return rotationMatrix(vec3(1, 0, 0), rotation.x) * rotationMatrix(vec3(0, 1, 0), rotation.y) * rotationMatrix(vec3(0, 0, 1), rotation.z);
            }
            ` + shader.vertexShader;
            shader.vertexShader = `
          varying vec3 vInstanceColor;
          varying vec3 vInstanceEmissive;
          varying float vOpacity;
          ${shader.vertexShader.replace(`#include <color_vertex>`, `#include <color_vertex>\n\tvInstanceColor = aInstanceColor;\n\tvInstanceEmissive = aInstanceEmissive;\n\tvOpacity=opacity1;\n`)}`
            shader.vertexShader = shader.vertexShader.replace(
                `#include <morphtarget_vertex>`,
                `#include <morphtarget_vertex>
                transformed *= morphTargetInfluences;
                `
            );
            shader.vertexShader = shader.vertexShader.replace(`#include <begin_vertex>`,
            `#include <begin_vertex>
            mat4 rotationMatrix = rotateXYZ();
            mat4 scaleMatrix = mat4(boxSize.x,0.0,0.0,0.0, 0.0,boxSize.y,0.0,0.0, 0.0,0.0,boxSize.z,0.0, 0.0,0.0,0.0,1.0);
            mat4 positionMatrix = mat4(1.0,0.0,0.0,boxPosition.x, 0.0,1.0,0.0,boxPosition.y, 0.0,0.0,1.0,boxPosition.z, 0.0,0.0,0.0,1.0);
            mat4 _aInstanceMatrix = positionMatrix * rotationMatrix * scaleMatrix;
            transformed = (_aInstanceMatrix * vec4(position, 1.)).xyz;
            `);
            shader.fragmentShader = `
          varying vec3 vInstanceColor;
          varying float vOpacity;
          ${shader.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( vInstanceColor, vOpacity );',)}`
            shader.fragmentShader = `
          varying vec3 vInstanceEmissive;
          ${shader.fragmentShader.replace('vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = vInstanceEmissive; ',)}`
        };

		const instaneMesh = new THREE.Mesh(instancedGeometry, instanceMaterial);
		scene.add(instaneMesh);
	}
}