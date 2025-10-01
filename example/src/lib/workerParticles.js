import * as THREE from 'three';
import * as glMatrix from "gl-matrix";
import { lerp, clamp, invlerp, range } from './utils.js';
import { WorkerManager } from './workerHelper.js';
import { updateSimulation, resetParticle as sharedResetParticle } from './_simulation.js';

export class Particles {
	constructor() {
        // Properties will be initialized in InitializeParticles
        this.workerManager = null;
        this.simulationState = {
            waitingTime: 0,
            killCount: 0
        };
	}

	addChildParticleSysthem(particleSysthem, spawnOverLifeTime, spawnFrequencyOverLifeTime) {
		particleSysthem.instance.instanceCount=0;
		this.childParticles.set(this.childParticles.size, {
			ps: particleSysthem,
			spawnOverLifeTime: spawnOverLifeTime,
			spawnFrequencyOverLifeTime: spawnFrequencyOverLifeTime,
			tempIndex:0
		})
	}

	setMorphTargets(morphTargets) {
		for (let i = 0; i < morphTargets.length; i++) {
			this.properties.set("morphTargets", parseInt(morphTargets[i]))
		}
		this.properties.get("morphTargetInfluences").attribute.needsUpdate = true
	}

	setMaxLifeTime(maxLifeTime,random,minRange,maxRange) {
		const temp=this.properties.get("sourceValues").get("maxLifeTime")
		if(typeof random !== "undefined"){
			temp.random=random
			temp.minRange=minRange
			temp.maxRange=maxRange

		}else{
			temp.random=false
		}
		temp.values=maxLifeTime
        if (this.workerManager) {
            this.workerManager.callMethod('setMaxLifeTime', { maxLifeTime: temp });
        }
	}

	setNoise(strength) {
		this.noise = strength;
        if (this.workerManager) {
            this.workerManager.callMethod('setNoise', { strength });
        }
	}

	setScale(x, y, z, index) {
		this.properties.get("transform").array[1][index * 4] = x
		this.properties.get("transform").array[1][(index * 4) + 1] = y
		this.properties.get("transform").array[1][(index * 4) + 2] = z
	}

	setRotation(x, y, z, index) {
		this.properties.get("transform").array[2][(index * 4)] = x
		this.properties.get("transform").array[2][(index * 4) + 1] = y
		this.properties.get("transform").array[2][(index * 4) + 2] = z
	}

	setTransform(x, y, z, index) {
		const indexA0=index*3
		const trans= this.properties.get("transform")
		trans.array[0][index*3]= x
		trans.array[1][index*3+1]= y
		trans.array[2][index*3+2]= z
	}

	setStartDirection(x, y, z,random,minRange,maxRange){
		const direc=this.properties.get("sourceValues").get("direction")
		direc.values[0]=x
		direc.values[1]=y
		direc.values[2]=z
		if(random==true){
			direc.random=true
			direc.minRange=minRange
			direc.maxRange=maxRange
		}
		else{
			direc.random=false
		}
	}

	setDirection(x, y, z, index) {
		this.properties.get("direction").array[(index * 3)] = x
		this.properties.get("direction").array[(index * 3) + 1] = y
		this.properties.get("direction").array[(index * 3) + 2] = z
	}

	getdirection(index) {
		return ([
			this.properties.get("direction").array[(index * 3)],
			this.properties.get("direction").array[(index * 3) + 1],
			this.properties.get("direction").array[(index * 3) + 2]])
	}

	setForce(force) {
		this.force = force.values;
		this.properties.get("sourceValues").set("force", force);
        if (this.workerManager) {
            this.workerManager.callMethod('setForce', { force });
        }
	}

	setBurstCount(count) {
		if(this.maxSpawnCount<count){
			this.burstCount=this.maxSpawnCount
		}else{
			this.burstCount = count
		}
        if (this.workerManager) {
            this.workerManager.callMethod('setBurstCount', { count: this.burstCount });
        }
	}

    setSpawnFrequency(freq) {
        this.spawFrequency = freq;
        if (this.workerManager) {
            this.workerManager.callMethod('setSpawnFrequency', { freq });
        }
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
            const index = i * 3;
            opArr[i] = op.values[0]; // Corrected from index
            for (let j = 0; j < 3; j++) {
                collArr[index + j] = col.values[j];
                emmArr[index + j] = emm.values[j];
            }
            if (col.random) {
                collArr[index] += range(0, 1, col.minRange, col.maxRange, Math.random());
                collArr[index + 1] += range(0, 1, col.minRange, col.maxRange, Math.random());
                collArr[index + 2] += range(0, 1, col.minRange, col.maxRange, Math.random());
            }
            if (emm.random) {
                emmArr[index] += range(0, 1, emm.minRange, emm.maxRange, Math.random());
                emmArr[index + 1] += range(0, 1, emm.minRange, emm.maxRange, Math.random());
                emmArr[index + 2] += range(0, 1, emm.minRange, emm.maxRange, Math.random());
            }
            lifeTime[i * 2] = 0;
            lifeTime[(i * 2) + 1] = max.values[0];
            if (max.random) {
                lifeTime[(i * 2) + 1] += range(0, 1, max.minRange, max.maxRange, Math.random());
            }
        }
        this.instance.instanceCount = this.burstCount;

        if (this.workerManager) {
            this.workerManager.callMethod('startPS');
        }
    }

	updateSimulation(delta) {
        if (this.workerManager) {
            this.workerManager.callMethod('updateSimulation', { delta });
        } else {
            this.simulationState = updateSimulation(this, delta, this.simulationState);
            this.updateValues(["transform", "color", "emission", "opacity"]);
        }
    }

	InitializeParticles(scene, mesh, amount, maxLifeTime, burstCount, spawnOverTime, spawnFrequency, maxSpawnCount, startPosition, startScale, startRotation,startDirection, startOpacity,startColor, startForce, startForceFieldForce, useWorker = false) {
		this.spawnOfset=0
		this.indexSlide=false
		amount = typeof amount != "number" && amount < 0 ? 100 : amount
		maxLifeTime = typeof maxLifeTime != "number" ? {values:10,random:false } : maxLifeTime
		startPosition = typeof startPosition != "object" || startPosition == undefined ? {values:[0, 0, 0],random:false }: startPosition
		startScale = typeof startScale != "object" ? {values:[1, 1, 1],random:false } : startScale
		startRotation = typeof startRotation != "object" ? {values:[0, 0, 0],random:false } : startRotation
		startColor = typeof startColor != "object" ? {values:[1, 1, 1],random:false } : startColor
		startForce = typeof startForce != "object" ? {values:[0, 0, 0] } : startForce
		startForceFieldForce = typeof startForceFieldForce != "object" ? {values:[0, 0, 0],random:false } : startForceFieldForce
		spawnFrequency = typeof spawnFrequency != "number" ? 1 : spawnFrequency
		maxSpawnCount = typeof maxSpawnCount != "number" ? 1 : maxSpawnCount
		spawnOverTime = typeof spawnOverTime != "boolean" ? false : maxSpawnCount
		burstCount = typeof burstCount != "number" ? 100 : (burstCount>maxSpawnCount?maxSpawnCount:burstCount)
		startDirection = typeof startDirection != "object" ? {values:[0, 0, 0],random:false } : startDirection
		startOpacity=typeof startOpacity!="number"?{values:[1],random:false}:startOpacity

        this.childParticles = new Map()
		this.amount = amount
		this.noise = 0
		this.pointCloud = []
		this.startPositionFromgeometry = false
		this.forcefield = []
		this.force = startForce.values
		this.forceFieldForce = startForceFieldForce.values
		this.attributesoverLifeTime = new Map()
		this.properties = new Map()
		this.spawFrequency = 1
		this.maxSpawnCount = maxSpawnCount
		this.spawnOverTime = true
		this.burstCount = burstCount

        const geometry = mesh.geometry
		const instancedGeometry = new THREE.InstancedBufferGeometry()
		this.instance = instancedGeometry
		instancedGeometry.index = geometry.index

        const emissionArray = new Uint8Array(this.amount * 3)
		const colorArray = new Uint8Array(this.amount * 3)
		const directionArray = new Float32Array(this.amount*3)
		const opacityArray = new Float32Array(this.amount)
		const lifeTimeArray = new Float32Array(amount*2)
		const matArraySize = this.amount * 3;
		const matrixArray = [
			new Float32Array(matArraySize),
			new Float32Array(matArraySize),
			new Float32Array(matArraySize),
		]

		const emissiveAttribute = new THREE.InstancedBufferAttribute(emissionArray, 3, true)
		const colorAttribute = new THREE.InstancedBufferAttribute(colorArray, 3, true)
		const opacityAttribute = new THREE.InstancedBufferAttribute(opacityArray, 1, true)
		const boxPositionAttribute=	new THREE.InstancedBufferAttribute( matrixArray[0], 3 )
		const boxSizeAttribute=   	new THREE.InstancedBufferAttribute( matrixArray[1], 3 )
		const rotatioAttributen= 	new THREE.InstancedBufferAttribute( matrixArray[2], 3 )

        instancedGeometry.instanceCount = 0;
		instancedGeometry.setAttribute('aInstanceColor',colorAttribute)
		instancedGeometry.setAttribute('aInstanceEmissive',emissiveAttribute)
		instancedGeometry.setAttribute('opacity1',opacityAttribute)
		instancedGeometry.setAttribute( 'boxPosition', boxPositionAttribute);
		instancedGeometry.setAttribute( 'boxSize',boxSizeAttribute );
		instancedGeometry.setAttribute( 'rotation', rotatioAttributen);
		Object.keys(geometry.attributes).forEach(attributeName => {
			instancedGeometry.attributes[attributeName] = geometry.attributes[attributeName]
		})

        const sourceValues = new Map()
		sourceValues.set("transform", startPosition)
		sourceValues.set("color", startColor)
		sourceValues.set("emission", {values:[0,0,0],random:false,minRange:0,maxRange:0})
		sourceValues.set("rotation", startRotation)
		sourceValues.set("scale", startScale)
		sourceValues.set("force", {values: startForce.values});
		sourceValues.set("direction", startDirection);
		sourceValues.set("opacity",startOpacity)
		sourceValues.set("maxLifeTime",maxLifeTime)
		this.properties.set("sourceValues", sourceValues)
		this.properties.set("transform", { array: matrixArray[0], attribute: boxPositionAttribute })
		this.properties.set("rotation", { array: matrixArray[2], attribute: rotatioAttributen})
		this.properties.set("scale", { array: matrixArray[1], attribute: boxSizeAttribute })
		this.properties.set("color", { array: colorArray, attribute: colorAttribute })
		this.properties.set("emission", { array: emissionArray, attribute: emissiveAttribute })
		this.properties.set("direction",{array:directionArray})
		this.properties.set("lifeTime",{array:lifeTimeArray})
		this.properties.set("opacity",{array:opacityArray,attribute:opacityAttribute})

		const instanceMaterial = mesh.material.clone();
		if(instanceMaterial.transparent==true){
			instanceMaterial.depthWrite=false
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