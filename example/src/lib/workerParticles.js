import * as THREE from 'three';
import * as glMatrix from "gl-matrix";
import { lerp, clamp, invlerp, range } from './utils.js';
import { WorkerManager } from './workerHelper.js';
import { updateSimulation, resetParticle as sharedResetParticle } from './_simulation.js';

export class Particles {
	constructor() {
        this.workerManager = null;
        this.simulationState = {
            waitingTime: 0,
            killCount: 0
        };
	}

    _proxyCall(method, args) {
        if (this.workerManager) {
            this.workerManager.callMethod(method, args);
        }
    }

	setMaxLifeTime(maxLifeTime,random,minRange,maxRange) {
		const temp = this.properties.get("sourceValues").get("maxLifeTime") || {};
		temp.values = [maxLifeTime];
        temp.random = random;
        temp.minRange = minRange;
        temp.maxRange = maxRange;
		this.properties.get("sourceValues").set("maxLifeTime", temp);
        this._proxyCall('setMaxLifeTime', { maxLifeTime: temp });
	}

	setNoise(strength) {
		this.noise = strength;
        this._proxyCall('setNoise', { strength });
	}

	setForce(force) {
		this.force = force;
        const sourceValues = this.properties.get("sourceValues");
        const forceObject = sourceValues.get("force") || { values: [] };
        forceObject.values = force;
		sourceValues.set("force", forceObject);
        this._proxyCall('setForce', { force: forceObject });
	}

	setBurstCount(count) {
		if(this.maxSpawnCount<count){
			this.burstCount=this.maxSpawnCount
		}else{
			this.burstCount = count
		}
        this._proxyCall('setBurstCount', { count: this.burstCount });
	}

    setSpawnFrequency(freq) {
        this.spawFrequency = freq;
        this._proxyCall('setSpawnFrequency', { freq });
    }

    setMaxSpawnCount(count) {
        if (count > this.amount) {
            this.maxSpawnCount = this.amount;
        } else {
            this.maxSpawnCount = count;
        }
        this._proxyCall('setMaxSpawnCount', { count: this.maxSpawnCount });
    }

    setSpawnOverTime(value) {
        this.spawnOverTime = value;
        this._proxyCall('setSpawnOverTime', { value });
    }

    setSourceAttributes(attribute, values, random, minRange, maxRange) {
        const sourceValues = this.properties.get("sourceValues");
        const temp = sourceValues.get(attribute) || {};
        temp.values = values;
        temp.random = random;
        temp.minRange = minRange;
        temp.maxRange = maxRange;
        sourceValues.set(attribute, temp);
        this._proxyCall('setSourceAttributes', { attribute, data: temp });
    }

    setAttributeOverLifeTime(attribute, values, end, bezier, bezierControllPointA, bezierControllPointB) {
        const data = { values, end, bezier, bezierControllPointA, bezierControllPointB };
        this.attributesoverLifeTime.set(attribute, data);
        this._proxyCall('setAttributeOverLifeTime', { attribute, data });
    }

    setStartDirection(x, y, z, random, minRange, maxRange) {
        this.setSourceAttributes('direction', [x, y, z], random, minRange, maxRange);
    }

    updateValues(attributes) {
		if (typeof attributes == "object") {
			for (const attribute of attributes) {
					try {
						this.properties.get(attribute).attribute.needsUpdate = true
					}
					catch { console.warn(attribute + " is not defined, pls check your spelling, or check if the attribute exist") }
				}
		}
	}

	resetParticle(index) {
        sharedResetParticle(this, index);
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

            collArr[colorIndex]     = col.values[0];
            collArr[colorIndex + 1] = col.values[1];
            collArr[colorIndex + 2] = col.values[2];
            emmArr[colorIndex]      = emm.values[0];
            emmArr[colorIndex + 1]  = emm.values[1];
            emmArr[colorIndex + 2]  = emm.values[2];

            if (col.random && col.minRange && col.maxRange) {
                collArr[colorIndex]     += range(0, 1, col.minRange[0], col.maxRange[0], Math.random());
                collArr[colorIndex + 1] += range(0, 1, col.minRange[1], col.maxRange[1], Math.random());
                collArr[colorIndex + 2] += range(0, 1, col.minRange[2], col.maxRange[2], Math.random());
            }
            if (emm.random && emm.minRange && emm.maxRange) {
                emmArr[colorIndex]      += range(0, 1, emm.minRange[0], emm.maxRange[0], Math.random());
                emmArr[colorIndex + 1]  += range(0, 1, emm.minRange[1], emm.maxRange[1], Math.random());
                emmArr[colorIndex + 2]  += range(0, 1, emm.minRange[2], emm.maxRange[2], Math.random());
            }

            lifeTime[lifeTimeIndex] = 0;
            lifeTime[lifeTimeIndex + 1] = max.values[0];
            if (max.random) {
                lifeTime[lifeTimeIndex + 1] += range(0, 1, max.minRange, max.maxRange, Math.random());
            }
        }
        this.instance.instanceCount = this.burstCount;
        this._proxyCall('startPS');
    }

	updateSimulation(delta) {
        if (this.workerManager) {
            this.workerManager.callMethod('updateSimulation', { delta });
        } else {
            this.simulationState = updateSimulation(this, delta, this.simulationState);
            this.updateValues(["transform", "color", "emission", "opacity"]);
        }
    }

	InitializeParticles(scene, mesh, config) {
        const {
            amount = 100,
            maxLifeTime = { values: [10], random: false },
            burstCount,
            spawnOverTime = true,
            spawnFrequency = 1,
            maxSpawnCount,
            startPosition = { values: [0, 0, 0], random: false },
            startScale = { values: [1, 1, 1], random: false },
            startRotation = { values: [0, 0, 0], random: false },
            startColor = { values: [1, 1, 1], random: false },
            startForce = { values: [0, 0, 0] },
            startDirection = { values: [0, 0, 0], random: false },
            startOpacity = { values: [1], random: false },
            useWorker = false
        } = config;

		this.amount = amount;
		this.noise = 0;
		this.pointCloud = [];
		this.startPositionFromgeometry = false;
		this.force = startForce.values;
		this.attributesoverLifeTime = new Map();
		this.properties = new Map();
		this.spawFrequency = spawnFrequency;
		this.maxSpawnCount = maxSpawnCount ?? amount;
		this.spawnOverTime = spawnOverTime;
		this.burstCount = burstCount ?? Math.min(100, this.maxSpawnCount);

        const geometry = mesh.geometry;
		const instancedGeometry = new THREE.InstancedBufferGeometry();
		this.instance = instancedGeometry;
		instancedGeometry.index = geometry.index;

        const emissionArray = new Uint8Array(this.amount * 3);
		const colorArray = new Uint8Array(this.amount * 3);
		const directionArray = new Float32Array(this.amount*3);
		const opacityArray = new Float32Array(this.amount);
		const lifeTimeArray = new Float32Array(amount*2);
		const matArraySize = this.amount * 3;
		const matrixArray = [
			new Float32Array(matArraySize),
			new Float32Array(matArraySize),
			new Float32Array(matArraySize),
		];

		const emissiveAttribute = new THREE.InstancedBufferAttribute(emissionArray, 3, true);
		const colorAttribute = new THREE.InstancedBufferAttribute(colorArray, 3, true);
		const opacityAttribute = new THREE.InstancedBufferAttribute(opacityArray, 1, true);
		const boxPositionAttribute=	new THREE.InstancedBufferAttribute( matrixArray[0], 3 );
		const boxSizeAttribute=   	new THREE.InstancedBufferAttribute( matrixArray[1], 3 );
		const rotatioAttributen= 	new THREE.InstancedBufferAttribute( matrixArray[2], 3 );

        instancedGeometry.instanceCount = 0;
		instancedGeometry.setAttribute('aInstanceColor',colorAttribute);
		instancedGeometry.setAttribute('aInstanceEmissive',emissiveAttribute);
		instancedGeometry.setAttribute('opacity1',opacityAttribute);
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
		this.properties.set("sourceValues", sourceValues);
		this.properties.set("transform", { array: matrixArray[0], attribute: boxPositionAttribute });
		this.properties.set("rotation", { array: matrixArray[2], attribute: rotatioAttributen});
		this.properties.set("scale", { array: matrixArray[1], attribute: boxSizeAttribute });
		this.properties.set("color", { array: colorArray, attribute: colorAttribute });
		this.properties.set("emission", { array: emissionArray, attribute: emissiveAttribute });
		this.properties.set("direction",{array:directionArray});
		this.properties.set("lifeTime",{array:lifeTimeArray});
		this.properties.set("opacity",{array:opacityArray,attribute:opacityAttribute});

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
            mat4 rotationMatrix(vec3 axis, float angle)
            {
                axis = normalize(axis);
                float s = sin(angle);
                float c = cos(angle);
                float oc = 1.0 - c;
                return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                            oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                            oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                            0.0,                                0.0,                                0.0,                                1.0);
            }
            mat4 rotateXYZ() {
              return rotationMatrix(vec3(1, 0, 0), rotation.x) * rotationMatrix(vec3(0, 1, 0), rotation.y) * rotationMatrix(vec3(0, 0, 1), rotation.z) ;
            }
            ` + shader.vertexShader;
            shader.vertexShader = `
          varying vec3 vInstanceColor;
          varying vec3 vInstanceEmissive;
          varying float vOpacity;
          ${shader.vertexShader.replace(
        `#include <color_vertex>`,
        `#include <color_vertex>
             vInstanceColor = aInstanceColor;
             vInstanceEmissive = aInstanceEmissive;
             vOpacity=opacity1;
              `
        )}`
            shader.vertexShader = shader.vertexShader.replace(
                `#include <begin_vertex>`,
            `#include <begin_vertex>
            mat4 rotationMatrix = rotateXYZ();
            mat4 scaleMatrix =  mat4(
                                     boxSize.x,0.0,0.0,0.0,
                                     0.0,boxSize.y,0.0,0.0,
                                     0.0,0.0,boxSize.z,0.0,
                                     0.0,0.0,0.0,1.0);
            mat4 positionMatrix = mat4(
                                        1.0,0.0,0.0,boxPosition.x,
                                        0.0,1.0,0.0,boxPosition.y,
                                        0.0,0.0,1.0,boxPosition.z,
                                        0.0,0.0,0.0,1.0);
             mat4 _aInstanceMatrix = mat4(scaleMatrix*rotationMatrix);
                                        transformed = (_aInstanceMatrix * vec4( position , 1. )*positionMatrix).xyz;
            vNormal = (_aInstanceMatrix*vec4(normalize(position), 1.0)).xyz;

            `,
          );
        shader.fragmentShader = `
          varying vec3 vInstanceColor;
          varying float vOpacity;
          ${shader.fragmentShader.replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        'vec4 diffuseColor = vec4( vInstanceColor, vOpacity );',
        )}`
        shader.fragmentShader = `
          varying vec3 vInstanceEmissive;
          ${shader.fragmentShader.replace(
        'vec3 totalEmissiveRadiance = emissive;',
        'vec3 totalEmissiveRadiance = vInstanceEmissive; ',
        )}`
        };

		const instaneMesh = new THREE.Mesh(
			instancedGeometry,
			instanceMaterial
		)
		scene.add(instaneMesh)

        if (useWorker) {
            this.workerManager = new WorkerManager(this);
        }
	}
}