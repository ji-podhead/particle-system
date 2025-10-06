import * as THREE from 'three';
import * as glMatrix from "gl-matrix";
import { voxelize } from './utils/voxelize.js';
import {
    updateWorkerProperty,
    updateWorkerSourceAttribute,
    updateWorkerAttributeOverLifeTime,
    updateWorkerPropertiesMapEntry,
	resetWorkerParticles,
	setWorkerMaxLifeTimes,
	workerBurst,
	workerResetParticle,
	updateWorkerParticleAttribute
} from './workerHelper.js';

export const lerp = (x, y, a) => x * (1 - a) + y * a;
export const clamp = (a, min = 0, max = 1) => Math.min(max, Math.max(min, a));
export const invlerp = (x, y, a) => clamp((a - x) / (y - x));
export const range = (x1, y1, x2, y2, a) => lerp(x2, y2, invlerp(x1, y1, a));

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

let rot =new Array(3)
let scale =new Array(3)
let col =new Array(3)
let pos =new Array(3)
let direc =new Array(3)
let rot1 , scale1 ,  pos1,direc1
let killCount=0
const tempArr0 =[]
const tempArr1 =new Array(2)
const tempArr2 =new Array(3)
let indexA0,indexA1,indexA2
let indexB0,indexB1,indexB2
const matrix4R= glMatrix.mat4.create()
const matrix4S= glMatrix.mat4.create()
const matrix4T= glMatrix.mat4.create()
const matrix4= glMatrix.mat4.create()
const matrix4B= glMatrix.mat4.create()
let quat = glMatrix.quat.create()
const quat2 = glMatrix.quat.create()
const normalVector = glMatrix.vec3.create()

const scaleVector = glMatrix.vec3.create()
const rotationVector = new Float32Array(3)
const positionVector = new Float32Array(3)
const directionVector =new Float32Array(3)
const v2A = glMatrix.vec2.create()
const v2B = glMatrix.vec2.create()
const crossA = glMatrix.vec3.create()
const crossB = glMatrix.vec3.create()
const crossC = glMatrix.vec3.create()
let x1, x2, y1, y2, z1, z2
const postemp2 = new Float32Array(3)
let randomX,randomY,randomZ
const scaletemp2 = new Float32Array(3)
const rottemp2 = new Float32Array(3)
let isRotating
let isScaling
let isTransforming
export class Particles {
	constructor(amount,  vertCount,  noise, forcefield, force, forceFieldForce, attributesoverLifeTime, properties, spawFrequency, maxSpawnCount, spawnOverTime, waitingtime, burstCount, additionalBurstCount, evenFunctions, particleEventFunctions, instance, childParticles, childSpawnTimer,particleBirthFunction,particleKillFunction,spawnOfset,indexSlide) {
	this.amount = amount
	this.vertCount = vertCount
	this.noise = noise
	this.forcefield = forcefield
	this.force = force
	this.forceFieldForce = forceFieldForce
	this.attributesoverLifeTime = attributesoverLifeTime
	this.properties = properties
	this.spawFrequency = spawFrequency
	this.maxSpawnCount = maxSpawnCount
	this.spawnOverTime = spawnOverTime
	this.waitingtime = waitingtime
	this.burstCount = burstCount
	this.additionalBurstCount = additionalBurstCount
	this.evenFunctions = evenFunctions
	this.particleEventFunctions = particleEventFunctions
	this.instance = instance
	this.childParticles = childParticles
	this.childSpawnTimer = childSpawnTimer
	this.particleKillFunction=particleKillFunction
	this.particleBirthFunction=particleBirthFunction
	this.spawnOfset=spawnOfset
	this.indexSlide=indexSlide
	this.individualForceField = false // Initialize here

	}

	//occlusion culling mitels active/inactive item propertie und vertexshader position*visibilityAttr
	/**
	 *
	 * @param {*} particleSysthem
	 * the child-PS
	 * @param {*} spawnOverLifeTime
	 * range:0-1. controlls the amount of childparticles will be spawned.
	 * if you set it to 1: the spawnCount per particle increases over the lifeTime of the parent particle, till it reaches the burstCount of the childParticle.
	 * if you set it to 0: the burstcount wont change over the lifeTime. and the amount of spawned particles per burst will be equal to the childs burstCount
	 * @param {*} spawnFrequencyOverLifeTime
	 * sets the spawnFrequence over the lifeTime of the parent particle
	 * if you set it to 1: the spawnFrequency of the childParticles increases over the lifeTime of the parent particle,  till it reaches the childs spawnFrequency
	 * if you set it to 0: the parent PS will spawn  particles every updateSTep. AVOID THAT!
	 */
	addChildParticleSysthem(particleSysthem, spawnOverLifeTime, spawnFrequencyOverLifeTime) {
		particleSysthem.instance.instanceCount=0;
		this.childParticles.set(this.childParticles.size, {
			ps: particleSysthem,
			spawnOverLifeTime: spawnOverLifeTime,
			spawnFrequencyOverLifeTime: spawnFrequencyOverLifeTime,
			tempIndex:0
		})
	}
	/**
	 * sets  the morphtargets and updates the attribute array
	 * @param {*} morphTargets
	 * array of the morphtargets
	 */
	setMorphTargets(morphTargets) {
		for (let i = 0; i < morphTargets.length; i++) {
			this.properties.set("morphTargets", parseInt(morphTargets[i]))
		}
		this.properties.get("morphTargetInfluences").attribute.needsUpdate = true
	}
	setMaxLifeTime(maxLifeTime,random,minRange,maxRange,updateWorker=true) {
		const temp=this.properties.get("sourceValues").get("maxLifeTime")
		if(typeof random !=undefined){
			temp.random=random
			temp.minRange=minRange
			temp.maxRange=maxRange

		}else{
			temp.random=false
		}
		temp.values=maxLifeTime
		if(this.workerIndex&&updateWorker)
		{
			updateWorkerSourceAttribute(this.workerIndex,"maxLifeTime", temp)
		}

	}

	setMaxLifeTimes(lifetime, updateWorker = true) {
		const lifeTimeArray = this.properties.get("lifeTime").array;
		for (let i = 0; i < this.amount; i++) {
			lifeTimeArray[i * 2 + 1] = lifetime;
			setWorkerMaxLifeTimes(this.workerIndex, lifetime);
		}
	}

	setLifeTimes(lifetime, updateWorker = true) {
		const lifeTimeArray = this.properties.get("lifeTime").array;
		for (let i = 0; i < this.amount; i++) {
			lifeTimeArray[i * 2 + 1] = lifetime;
		}
		if (this.isWorker && updateWorker) {
			updateWorkerProperty(this.workerIndex, "lifeTimes", lifeTimeArray);
		}
	}

	resetParticleOnWorker(particleIndex) {
		if (this.isWorker) {
			workerResetParticle(this.workerIndex, particleIndex);
		} else {
			this.resetParticle(particleIndex);
		}
	}
	setNoise(strength, updateWorker = true) {
		this.noise = strength
		if (this.isWorker && updateWorker) {
			updateWorkerProperty(this.workerIndex, "noise", strength);
		}
	}
	setScale(x, y, z, index, updateWorker = true) {
		if (!this.individualScale && index !== 0) {
			console.warn("Attempted to set individual scale for a unified scale particle system. Setting scale for index 0 instead.");
			index = 0;
		}
		const scaleArray = this.properties.get("scale").array;
		const i = index * 3;
		scaleArray[i] = x;
		scaleArray[i + 1] = y;
		scaleArray[i + 2] = z;
		if (this.isWorker && updateWorker) {
			updateWorkerParticleAttribute(this.workerIndex, "scale", index, [x, y, z]);
		}
	}
	setRotation(x, y, z, index, updateWorker = true) {
		if (!this.individualRotation && index !== 0) {
			console.warn("Attempted to set individual rotation for a unified rotation particle system. Setting rotation for index 0 instead.");
			index = 0;
		}
		const rotationArray = this.properties.get("rotation").array;
		const i = index * 3;
		rotationArray[i] = x;
		rotationArray[i + 1] = y;
		rotationArray[i + 2] = z;
		if (this.isWorker && updateWorker) {
			updateWorkerParticleAttribute(this.workerIndex, "rotation", index, [x, y, z]);
		}
	}
	setTransform(x, y, z, index, updateWorker = true) {
		if (!this.individualTransform && index !== 0) {
			console.warn("Attempted to set individual transform for a unified transform particle system. Setting transform for index 0 instead.");
			index = 0;
		}
		const transformArray = this.properties.get("transform").array;
		const i = index * 3;
		transformArray[i] = x;
		transformArray[i + 1] = y;
		transformArray[i + 2] = z;
		if (this.isWorker && updateWorker) {
			updateWorkerParticleAttribute(this.workerIndex, "transform", index, [x, y, z]);
		}
	}
	setStartDirection(x, y, z,random,minRange,maxRange, updateWorker = true){
		direc=this.properties.get("sourceValues").get("direction")
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
		if (this.isWorker && updateWorker) {
			updateWorkerSourceAttribute(this.workerIndex, "direction", direc);
        }
	}
	setDirection(x, y, z, index) {
		if (!this.individualDirection && index !== 0) {
			console.warn("Attempted to set individual direction for a unified direction particle system. Setting direction for index 0 instead.");
			index = 0;
		}
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
	getScale(index) {
		const i = index * 3;
		const scaleArray = this.properties.get("scale").array;
		return [scaleArray[i], scaleArray[i + 1], scaleArray[i + 2]];
	}
	getRotation(index) {
		const i = index * 3;
		const rotationArray = this.properties.get("rotation").array;
		return [rotationArray[i], rotationArray[i + 1], rotationArray[i + 2]];
	}
	getTransform(index) {
				const transformArray = this.properties.get("transform").array;
		if(index!=undefined){
		const i = index * 3;
		return [transformArray[i], transformArray[i + 1], transformArray[i + 2]];
		}
		else {return transformArray}
	}
	setForceFieldForce(forceFieldForce, updateWorker = true) {
		this.forceFieldForce = forceFieldForce;
		if (this.isWorker && updateWorker) {
			updateWorkerProperty(this.workerIndex, "forceFieldForce", this.forceFieldForce);
		}
	}
	setForce(force, updateWorker = true) {
		this.force = force;
		this.properties.get("sourceValues").set("force", force);
		if (this.isWorker && updateWorker) {
			updateWorkerSourceAttribute(this.workerIndex, "force", force);
		}
	}
	setBurstCount(count, updateWorker = true) {
		if(this.maxSpawnCount<count){
			this.burstCount=this.maxSpawnCount
		}else{
			this.burstCount = count
		}
		if (this.isWorker && updateWorker) {
			updateWorkerProperty(this.workerIndex, "burstCount", this.burstCount);
		}
	}
	burstParticlesManually(count) {
		this.properties.additionalBurstCount = count
	}
	setSpawnOverTime(bool, updateWorker = true) {
		this.spawnOverTime = bool;
		if (this.isWorker && updateWorker) {
			updateWorkerProperty(this.workerIndex, "spawnOverTime", this.spawnOverTime);
		}
	}
	setSpawnFrequency(freq, updateWorker = true) {
		this.spawFrequency = freq;
		if (this.isWorker && updateWorker) {
			updateWorkerProperty(this.workerIndex, "spawFrequency", this.spawFrequency);
		}
	}
	setMaxSpawnCount(count, updateWorker = true) {
		if (count > this.amount) {
			count = this.amount
		}
		this.maxSpawnCount = count;
		this.instance.instanceCount = 0;
		if (this.isWorker && updateWorker) {
			updateWorkerProperty(this.workerIndex, "maxSpawnCount", this.maxSpawnCount);
		}
	}
	setStartPositionFromGeometry(geometry, step, random, minRange, maxRange, updateWorker = true) {
		const sourceTransform = this.properties.get("sourceValues").get("transform");

		const pc = this.createPointCloud(geometry, false, true, false, step);
		sourceTransform.values = pc; // Set the generated points directly
		
		if (this.spawnOverTime == false) {
			for (let i = 0; i < this.amount; i++) {
				this.setTransform(
					sourceTransform.values[(i * 3)],
					sourceTransform.values[(i * 3) + 1],
					sourceTransform.values[(i * 3) + 2], i,
					false // No need to update worker for each particle
				);
			}
		}
		
		if (random) {
			sourceTransform.random = random;
			sourceTransform.minRange = minRange;
			sourceTransform.maxRange = maxRange;
		} else {
			sourceTransform.random = false;
		}

		if (this.isWorker && updateWorker) {
			updateWorkerSourceAttribute(this.workerIndex, "transform", sourceTransform);
			resetWorkerParticles(this.workerIndex);
		} else {
			for (let i = 0; i < this.amount; i++) {
				this.resetParticle(i, this.attributesoverLifeTime);
			}
		}
	}
	/**
	 * Sets the start positions of particles by sampling points from a given geometry,
	 * filling the shape with particles.
	 * @param {THREE.BufferGeometry} geometry - The Three.js geometry to sample points from.
	 * @param {number} particleCount - The number of particles to generate.
	 * @param {boolean} [random=false] - Whether to apply random offsets to positions.
	 * @param {number} [minRange=0] - Minimum random offset.
	 * @param {number} [maxRange=0] - Maximum random offset.
	 * @param {boolean} [updateWorker=true] - Whether to update the worker.
	 */
	positionFromGeometryVoxelized(geometry, boxSize, setStartPosition = false, updateWorker = true) {
		const points = voxelize(geometry, boxSize);
		const particleCount = points.length / 3;

		if (setStartPosition) {
			// Ensure the particle system can hold all the voxels.
			if (particleCount > this.amount) {
				console.warn(`Voxelization produced ${particleCount} particles, but the system is initialized with a maximum of ${this.amount}. Some voxels will be omitted.`);
			}
			this.setStartPositionFromArray(points, false, 0, 0, updateWorker);
		}
		
		// Return both points and count for external use if needed.
		return { points, particleCount };
	}


	setStartPositionFromArray(array,random,minRange,maxRange, updateWorker=true) {
		const pos = this.properties.get("sourceValues").get("transform");
		pos.values = array; // Set the array directly

		if(random){
			pos.random=random
			pos.minRange=minRange
			pos.maxRange=maxRange
		} else {
			pos.random=false
		}

		if(updateWorker && this.workerIndex){
			// Removed updateWorkerProperty for pointCloud and startPositionFromgeometry
			updateWorkerSourceAttribute(this.workerIndex,"transform",pos);
			resetWorkerParticles(this.workerIndex);
		} else {
			for(let i=0;i<this.amount;i++){
				this.resetParticle(i,this.attributesoverLifeTime)
			}
		}
	}
	setForceFieldFromArray(array) {
		this.forcefield = this.createPointCloud(array, true, false, true)
		this.individualForceField = this.forcefield.length > 3;
	}
	setForceFieldFromGeomtry(geometry) {
		this.forcefield = this.createPointCloud(geometry, true, false, false)
		this.individualForceField = this.forcefield.length > 3;
	}
	setStartPosition(position,random,minRange,maxRange, updateWorker=true) {
		this.startPositionFromgeometry = false
		pos=this.properties.get("sourceValues").get("transform")
		pos.values = position
		if(random){
		pos.random=random
		pos.minRange=minRange
		pos.maxRange=maxRange
		}
		else{
			pos.random=false
		}
		if (this.isWorker && updateWorker) {
			updateWorkerSourceAttribute(this.workerIndex, "transform", pos);
		}
	}
	createPointCloud(geometry,fromArray, step) {
		let amount = this.amount
		let height, width, depth, stepY, stepX, stepZ
		let xMin = 100.0
		let yMin = 100.0
		let zMin = 100.0
		let xMax = -100.0
		let yMax = -100.0
		let zMax = -100.0

		let tempArr = fromArray == false ? geometry.attributes.position.array : [].concat(geometry)
		const positions = new Array(tempArr.length)
		const pc = new Array(tempArr.length)
		for (let i = 0; i < positions.length; i++) {
			positions[i] = tempArr[i]
		}
		//indexPCStep= parseInt((this.amount/(positions.length/3))<0?-this.amount/(positions.length)/3:this.amount/(positions.length/3))
		//console.log(geometry)
		let nextIndex = 0
		init()
		create()
		function init() {
			for (let i = 0; i < positions.length / 3; i++) {

				if (positions[i] <= xMin) {
					xMin = positions[i]
				}
				else if (positions[i] > xMax) {
					xMax = positions[i]
				}
				if (positions[i + 1] < yMin) {
					yMin = positions[i + 1]
				}
				else if (positions[i + 1] > yMax) {
					yMax = positions[i + 1]
				}
				if (positions[i + 2] < zMin) {
					zMin = positions[i + 2]
				}
				else if (positions[i + 2] > zMax) {
					zMax = positions[i + 2]
				}
				//console.log()
			}
			width = xMax - xMin
			height = yMax - yMin
			depth = zMax - zMin
			stepY = height / step
			stepX = width / step
			stepZ = depth / step
		}
		function findNearest(point, index) {
			let nearestDist = Infinity
			let nearestIndex = 0

			for (let i = 0; i < positions.length / 3; i++) {
				const distTemp = Math.sqrt(Math.abs(((positions[i] - point[0]) ^ 3) + ((positions[i + 1] - point[1]) ^ 3) + ((positions[i + 3] - point[2]) ^ 3)))
				//alert("dist" + distTemp)
				if (distTemp < nearestDist) {
					nearestDist = distTemp
					nearestIndex = i * 3
				}
			}

			pc[nextIndex * 3] = positions[nearestIndex]
			pc[(nextIndex * 3) + 1] = positions[nearestIndex + 1]
			pc[(nextIndex * 3) + 2] = positions[nearestIndex + 2]
			positions.splice(nextIndex * 3, 3)
			nextIndex += 1
		}
		function create() {
			let x, y, z = 0
			for (let i = 0; i < step; i++) {
				x += stepX
				for (let i2 = 0; i2 < step; i2++) {
					y += stepY
					for (let i3 = 0; i3 < step; i3++) {
						z += stepY
						findNearest([stepX, stepY, stepZ], i)
						/** * findet den nächsten punkt zu point aus den quads */

					}
				}
			}
		}

		return pc
	}
	/**
	 *  @returns * this function returns an array of the values if length>0
	 * for example attribute=transform will return an array array with length=3
	  * @param {*} attribute
	 * so far you can get rotation,scale, color, emission, textures and morphtargets
	 * * * @param {*} length
	 * the length of the of the attribute array representing the stride
	 */
	getAttribute(attribute, index, length) {
		if (length > 1) {
			let values = new Array(length)
			for (let i = index; i < length; i++) {
				values[i] = this.properties.get(attribute).array[i * length]
			}
			return {
				values
			}
		} else {
			return (
				this.properties.get(attribute).array[index * length])
		}
	}
	/**
	 * sets the Source values of the attribute, to which the particle will be reseted after its lifecycle
	 * @param {*} attributes
	 * string, or array of strings
	 * @param {*} values
	 * the value of the attribute. pls consider the stride length. if attributes stride lengths bigger than 0, you need to pass in an array
	 * @param {*} random
	 * a boolean that. if set to true, minRange and maxrange will be used to calculate a Random value.
	 * pass in a array if you wanna set mor than 1 attribute
	 * @param {*} minRange
	 * @param {*} maxRange
	 */
	setSourceAttributes(attributes, values, random, minRange, maxRange, updateWorker = true) {
		const sourceValues = this.properties.get("sourceValues");
		if (typeof attributes !== "string") {
			for (let i = 0; i < attributes.length; i++) {
				const temp = sourceValues.get(attributes[i]);
				if (temp) {
					temp.values = values[i];
					temp.random = random[i];
					temp.minRange = minRange[i];
					temp.maxRange = maxRange[i];
					if (this.isWorker && updateWorker) {
						updateWorkerSourceAttribute(this.workerIndex, attributes[i], temp);
					}
				}
			}
		} else {
			const temp = sourceValues.get(attributes);
			if (temp) {
				temp.values = values;
				temp.random = random;
				temp.minRange = minRange;
				temp.maxRange = maxRange;
				if (this.isWorker && updateWorker) {
					updateWorkerSourceAttribute(this.workerIndex, attributes, temp);
				}
			}
		}
	}
	/**
	 * sets the attributes of the shader. use update() to make the changes present.
	 * if you want to set the transform use setTransform(),setRotation(),or setScale().
	 * if you want to set the forces use setForce(),or setForceFieldForce().
	 * @param {*} attribute
	 * pass a string of the attribute
	 * so far you can set color, emission, textures and morphtargets
	  * @param {*} values
	 * an array holding the data
	  * @param {*} index
	 *the index of the meshPartikel ranges from 0 to instanceAmount
	 */
	setShaderAttribute(attribute, index, values) {
		const attributeI = this.properties.get(attribute).array


		for (let i = 0; i < attribute.length; i++) {

			attributeI[(index * values.length) + i] = values[i]

		}

		////console.log("setting  index " +index+ " attr "+)
	}
	/**
	 * @param {*} attribute
	 * pass a string of the attribute or an array of strings
	 *  adds the attributes over lifeTime . possible attributes: "force","size","color","transform","scale","emission","rotation"
	  * @param {*} values
	 * an array holding the data. elements must be numbers be from 0-1
	  * @param {*} index
	 *the index of the meshPartikel ranges from 0 to instanceAmount
	 */
	setAttributeOverLifeTime(attribute, values, end, bezier, bezierControllPointA, bezierControllPointB, updateWorker = true) {
		let attributeData;
		if (typeof bezier === "boolean") {
			attributeData = {
				values: values,
				end: end,
				bezier: bezier,
				bezierControllPointA: bezierControllPointA,
				bezierControllPointB: bezierControllPointB
			};
		} else {
			attributeData = { values: values, end: end, bezier: false };
		}
		this.attributesoverLifeTime.set(attribute, attributeData);

		if (this.isWorker && updateWorker) {
			updateWorkerAttributeOverLifeTime(this.workerIndex, attribute, attributeData);
		}
	}
			checkType(element) {
	    //boxPositi
		//boxSize',
		//rotation'
		//boxRadius
		if (element == "transform") {
			//console.log("updating "+ "transform")
			this.properties.get("transform").attribute[0].needsUpdate = true
			return (true)
		}
		else if (element == "rotation") {

			this.properties.get("rota").attribute[2].needsUpdate = true
			return (true)
			console.log("updating " + "rot")
		}
		else if (element == "scale") {
			//console.log("updating " + "scale")
			this.properties.get("transform").attribute[1].needsUpdate = true

			return (true)
		}
		else {
			return (false)
		}
	}
	/**
	 * update the attributes
	 * @param {*} attributes
	 * either pass a single string, or an array of strings.
	 * pass "transform","scale", or"rotation" if you want to update the transformMatrix
	 */
	updateValues(attributes) {
		if (typeof attributes == "object") {
			for (const attribute of attributes) {
				try {
					this.properties.get(attribute).attribute.needsUpdate = true;
				} catch {
					console.warn(
						attribute +
							" is not defined, pls check your spelling, or check if the attribute exist"
					);
				}
			}
		}
	}
	resetTransform(index, directly) {
		const start = this.properties.get("sourceValues").get("transform");
		const pos1 = new Array(start.values.length).fill(0);
		const individualTransform = start.values.length > 3; // Derived from the length

		if (individualTransform) {
			const i = index * 3;
			pos1[0] = start.values[i]; // Access values array
			pos1[1] = start.values[i + 1];
			pos1[2] = start.values[i + 2];
		} else {
			pos1[0] = start.values[0];
			pos1[1] = start.values[1];
			pos1[2] = start.values[2];
		}

		if (directly) {
			this.setTransform(pos1[0], pos1[1], pos1[2], index);
		}
		return pos1;
	}
	getAliveCount(){
		return(this.instance.instanceCount)
	}
	setAliveCount(count){
		this.instance.instanceCount=count
	}
	/**
	 * this function will call the given function with given arguments at the birth of the particle
	 * the index of the particle will be added as the last argument
	 * @param {*} func
	 * the function that is called
	 * @param {*} args
	 * the arguments that will be passed intoo the constructor of the func function
	 */
	onParticleBirth(func, args, updateWorker = true) {
		const obj ={ func: func, args: args };
		this.particleBirthFunction = obj
		if (this.isWorker && updateWorker) {
			updateWorkerProperty(this.workerIndex, "setEventHandler", ["onParticleBirth",func,args]);
		}
	}
	/**
	 * this function will call the given function with given arguments at the end of the particles lifeSpan.
	 * the index of the particle will be added as the last argument.
	 * @param {*} func
	 * the function that is called
	 * @param {*} args
	 * the arguments that will be passed intoo the constructor of the func function
	 */
	onParticleKill(func, args, updateWorker = true) {
		const obj ={ func: func, args: args };
		this.particleKillFunction = obj
		if (this.isWorker && updateWorker) {
			updateWorkerProperty(this.workerIndex, "setEventHandler", ["onParticleKill",func,args]);
		}
	}
		createEventFunction() {

	}

burst(amount1,position1){
		if (this.isWorker) {
			workerBurst(this.workerIndex, amount1, position1);
		} else {
			
	const lifeTime=this.properties.get("lifeTime").array
	const overFlow =this.maxSpawnCount-(this.instance.instanceCount+amount1)
	let start

	if( overFlow>=0&&(lifeTime[this.instance.instanceCount]==0)){
		start=this.instance.instanceCount
	}else{

		start=0
	}

	for (let i=start;i<=(start+amount1);i++){
		if(overFlow>=0){
			this.instance.instanceCount+=1
		}
		else{
			lifeTime[i]=0
		}

		this.resetParticle(i,this.attributesoverLifeTime)
		this.setTransform(position1[0],position1[1],position1[2],i)
			console.warn("Burst called but no worker is attached to the particle system. Bursting is only supported in worker mode.");
					console.log(overFlow+"func"+i,this.getTransform(i))

		}



	}
}
	// burst(amount, position) {
	// 	if (this.isWorker) {
	// 		workerBurst(this.workerIndex, amount, position);
	// 	} else {
	// 		// Main-thread burst logic would need to be implemented here.
	// 		// For now, we just warn that it's only supported in worker mode.
	// 		console.warn("Burst called but no worker is attached to the particle system. Bursting is only supported in worker mode.");
	// 	}
	// }
	startPS(){
	const	lifeTime=this.properties.get("lifeTime").array
	const max=this.properties.get("sourceValues").get("maxLifeTime")
	const sourceValues = this.properties.get("sourceValues")
	const col=sourceValues.get("color")
	const collArr =this.properties.get("color").array
	const emm=sourceValues.get("emission")
	const emmArr =this.properties.get("emission").array
	const op=sourceValues.get("opacity")
	const opArr =this.properties.get("opacity").array
	for (let i =0;i<this.amount;i++){
		const index=i*3
		opArr[index]=op.values[0]
		for (let i=0;i<3;i++){
			collArr[index+i]=col.values[i]
			emmArr[index+i]=emm.values[i]
		}
		if(col.random==true){
		collArr[index]+=range(0,1,col.minRange,col.maxRange,Math.random())
		collArr[index]+=range(0,1,col.minRange,col.maxRange,Math.random())
		collArr[index]+=range(0,1,col.minRange,col.maxRange,Math.random())
		}
		if(emm.random==true){
			emmArr[index]+=range(0,1,emm.minRange,emm.maxRange,Math.random())
			emmArr[index]+=range(0,1,emm.minRange,emm.maxRange,Math.random())
			emmArr[index]+=range(0,1,emm.minRange,emm.maxRange,Math.random())
			}
				lifeTime[i*2]=0
				lifeTime[(i*2)+1]=max.values
				if(max.random==true){
					lifeTime[(i*2)+1]+=range(0,1,max.minRange,max.maxRange,Math.random())
				}
		}
		  this.instance.instanceCount=this.burstCount
	}
	resetParticle(index) {
		const attributesoverLifeTimeValues = this.attributesoverLifeTime;
		const vec3Index = index * 3;
		const sourceValues = this.properties.get("sourceValues");

		const pos = sourceValues.get("transform");
		const rot = sourceValues.get("rotation");
		const scale = sourceValues.get("scale");
		const direc = sourceValues.get("direction");


		const newPosition = this.properties.get("transform").array;
		const rotation = this.properties.get("rotation").array;
		const scaleTemp = this.properties.get("scale").array;
		const direc1 = this.properties.get("direction").array;

		if(direc1===undefined){ return console.error("cant reset particle cause one of the required arrays is not yet iniialized")}
		const pos1 = this.resetTransform(index, false);
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
			if (attribute !== "transform" && attribute !== "rotation" && attribute !== "scale" && attribute !== "force" && attribute !== "direction" && attribute !== "position") {
				try {
					const sourceAttribute = sourceValues.get(attribute);
					const attrArray = this.properties.get(attribute).array;
					const stride = sourceAttribute.values.length;
					const attrIndex = index * stride;

					for (let i = 0; i < stride; i++) {
						let randomVal = 0;
						if (sourceAttribute.random) {
							randomVal = range(0, 1, sourceAttribute.minRange, sourceAttribute.maxRange, Math.random());
						}
						attrArray[attrIndex + i] = sourceAttribute.values[i] + randomVal;
					}
				} catch (e) {
					// Ignore errors for attributes without a source value
				}
			}
		});
	}
	/**
	 * this updates the physics transformation and overlifetime delta
	 * this function requires a maxlifetime value != infinity
	 * @param {*} delta
	 * the deltaTime of your frameRate
	 * @param {*} reset
	 * if true, the simulation will resets  the particle attributes after its lifetimeCyclus, including its lifetime
	 * set this to false if you want to perform a burst.
	 * for bursting, see the manual under burst
	 */

	updateSimulation(delta,respawn,reset,kill,translate) {
		//alert(this.instance.instanceCount)
		//console.log(this.instance.instanceCount)
		reset =typeof reset ==undefined?true:reset
		reset =typeof reset ==undefined?true:reset
		kill =typeof kill ==undefined?true:translate
		translate =typeof translate ==undefined?false:translate

		if(this.maxSpawnCount==0){
			return(console.warn("noo need to update the PS! => macSpawnCount is 0"))
		}
		//reset = reset==undefined?true:false
		//childParticle = childParticle==undefined?false:true
		//todo: set i by i/range
		//todo disable aatributes that are not reached by i/range
		const attributesoverLifeTimeValues = this.attributesoverLifeTime
		const overlifetimeSize = this.attributesoverLifeTime.size
		if( respawn==true) {
			//	console.log("wait " + this.waitingTime)
			if (this.waitingTime < this.spawFrequency) {
				this.waitingTime += delta
			} else {
				this.waitingTime = 0
				//const maxBurst = this.burstCount + this.additionalBurstCount
				//const überschuss = this.maxSpawnCount - (maxBurst + this.instance.instanceCount)
			//	const burstCount = überschuss > 0 ? maxBurst : maxBurst - überschuss
				//console.log("----------------------------------------------")
				let burstCountOfset = this.maxSpawnCount-((this.burstCount+this.instance.instanceCount))
					if(burstCountOfset<=0){
						this.instance.instanceCount += (this.burstCount+burstCountOfset)
					}
					else if(burstCountOfset>0){
						this.instance.instanceCount += (this.burstCount)
					}
				//console.log((this.burstCount+burstCountOfset)+ " " + this.instance.instanceCount + "  " +	burstCountOfset
				//+ " " + this.burstCount)
		//
		//console.log("newCount" + this.instance.instanceCount)
		//console.log(lifeTime)
		//console.log(this.properties.get("transform"))
	if(this.particleBirthFunction!=undefined){
				// Pass the current instance count as the index for the birth function
				// The actual particle index will be determined by the worker logic
				this.particleBirthFunction.args.index = this.instance.instanceCount;
				this.particleBirthFunction.func(this.particleBirthFunction.args);
			}
	}
		}
	//	console.log(this.instance.instanceCount)
		let force = [].concat(this.force)
		for (let count=this.instance.instanceCount;count>0;count--) {
			const index =(this.instance.instanceCount-count)
			const lifeTime= this.properties.get("lifeTime").array
			const lifeTimeIndex=index*2
			lifeTime[lifeTimeIndex]+=delta
			if (lifeTime[lifeTimeIndex]<= lifeTime[(lifeTimeIndex+1)]) {
				let direction=this.properties.get("direction").array
				const lifeTimedelta = (lifeTime[(lifeTimeIndex)]/lifeTime[lifeTimeIndex+1] )
			     indexA0=index*3
			     indexA1=indexA0+1
			     indexA2=indexA1+ 1
				 isScaling=false
				 isRotating=false
				 isTransforming=false
				//this.properties.get("opacity").array[i]=0
				//this.properties.get("opacity").attribute.needsUpdate=true;

			//	console.log("upedate " + count +" plus ofs " + (index) + " life " +  lifeTime[index] + " delta " + lifeTimedelta+  " max " + lifeTime[lifeTimeIndex+1] )
				const step = lifeTimedelta
			const trans0 =this.properties.get("transform").array
				for (let ip =0;ip<3;ip++){
						directionVector[ip]=0

				}
				 function bezier(out, a, b, c, d, t) {
					let inverseFactor = 1 - t;
					let inverseFactorTimesTwo = inverseFactor * inverseFactor;
					let factorTimes2 = t * t;
					let factor1 = inverseFactorTimesTwo * inverseFactor;
					let factor2 = 3 * t * inverseFactorTimesTwo;
					let factor3 = 3 * factorTimes2 * inverseFactor;
					let factor4 = factorTimes2 * t;
					out[indexA0] += a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
					if(a.length>1){
						out[indexA0+1] += a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
						if(a.length>2){
							out[indexA0+2] += a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
						}
					}
				  }
				   function lerp(out, a, b, t,index) {
					out[indexA0] += a[0] + t * (b[0] - a[0]);
					if(a.length>1){
						out[indexA0+1] += a[1] + t * (b[1] - a[1]);
						if(a.length>2){
						out[indexA0+2] += a[2] + t * (b[2] - a[2]);
						}
					}

				  }
	//glMatrix.vec3.transformMat4(positionVector,positionVector,matrix4)

	//console.log(matrix4)
				let forceFieldForceValues = new Float32Array(this.properties.get("sourceValues").get("forceFieldForce").values);
				if (attributesoverLifeTimeValues.has("position")) {
					const value = attributesoverLifeTimeValues.get("position");
					const arr = this.properties.get("transform").array;
					arr[indexA0] = 0;
					arr[indexA1] = 0;
					arr[indexA2] = 0;
					if (value.bezier === true) {
						bezier(arr, value.values, value.bezierControllPointA, value.bezierControllPointB, value.end, step, indexA0);
					} else {
						lerpAttribute(arr, value.values, value.end, step, indexA0);
					}
				}

				attributesoverLifeTimeValues.forEach((value,attribute) => {
					if (attribute === "position") return;
					if (attribute == "forceFieldForce") {

						if(value.bezier==true){
						forceFieldForceValues = [
					(value.values[0]*forceFieldForceValues[0] * step),
					(value.values[1]* forceFieldForceValues[1] * step),
					(value.values[2]* forceFieldForceValues[2] * step)]
						}else{
							forceFieldForceValues = [
							value.values[0]+(forceFieldForceValues[0] * step),
							value.values[1]+( forceFieldForceValues[1] * step),
							value.values[2]+( forceFieldForceValues[2] * step)]
						}
					}
					else if (attribute == "force") {
						if(value.bezier==true){
						force[0]+=	(step*value.values[0])
						force[1]+=	(step*value.values[1])
						force[2]+=	(step*value.values[2])
						}else{
							force[0]+=	(value.values[0])
							force[1]+=	(value.values[1])
							force[2]+=	(value.values[2])
						}
					}
					else if(attribute == "direction"){
						if(value.bezier==true){
						direction[indexA0]+=direction[indexA0] *(value.values[0]*(step))
						direction[indexA1]+=direction[indexA1] *(value.values[1]*(step))
						direction[indexA2]+=direction[ indexA2] *(value.values[2]*(step))
						}else{
						direction[indexA0]+= (value.values[0])
						direction[indexA1]+= (value.values[1])
						direction [indexA2]+=(value.values[2])
						}
					}
					else {

							//console.log(value)
							const arr = this.properties.get(attribute).array
							if(value.bezier==true){
							bezier(arr,	value.values,value.bezierControllPointA,value.bezierControllPointB,value.end,step)
						}else{
							lerp(arr,value.values,value.end,step)
						}
					}
				})
				//todo: forcefield force mit kreutzprodukt berechnen
				if (forceFieldForceValues[0] > 0 || forceFieldForceValues[1] > 0 || forceFieldForceValues[2] > 0) {
					if (this.forcefield && this.forcefield.length > 0) {
						if (this.individualForceField) {
							const ffIndex = index * 3;
							directionVector[0] += this.forcefield[ffIndex];
							directionVector[1] += this.forcefield[ffIndex + 1];
							directionVector[2] += this.forcefield[ffIndex + 2];
						} else {
							directionVector[0] += forceFieldForceValues[0];
							directionVector[1] += forceFieldForceValues[1];
							directionVector[2] += forceFieldForceValues[2];
						}
						isTransforming = true;
					}
				}
				directionVector[0] +=(direction[indexA0]!==0?(force[0]*direction[indexA0]):force[0])
				directionVector[1] +=(direction[indexA1]!==0?(force[1]*direction[indexA1]):force[1])
				directionVector[2] +=(direction[indexA2]!==0?(force[2]*direction[indexA2]):force[2])
				if (this.noise > 0) {
					const noise = Math.sin(delta * 10 * this.noise)
					directionVector[0] += noise
					directionVector[1] += noise
					directionVector[2] += noise
				}
				if(translate){
					glMatrix.vec3.normalize(rotationVector,rotationVector)
				directionVector[0]+=rotationVector[0]
				directionVector[1]+=rotationVector[1]
				directionVector[2]+=rotationVector[2]
			}
			//	alert(directionVector)
				for (let i=0;i<3;i++){
			trans0[indexA0+i]+=directionVector[i]
												}

	//console.log(positionVector)

			//	//console.log("newPosition " + newPosition + " force "+ force	)

	//	this.setTransform(x, y, z, index)
				//+++++++++++++++++++++++++++++++++++	childParticles  +++++++++++++++++++++++++++++++++++++++++++++
			//if(this.childParticles.size>0){
			//	for (const [key, value] of this.childParticles.entries()) {
			//			const tempTimerMax=value.spawnFrequencyOverLifeTime>0?(value.ps.spawFrequency * lifeTimedelta):value.ps.spawFrequency
			//		if (this.childSpawnTimer <tempTimerMax ) {
			//				this.childSpawnTimer += delta
			//			}
			//			else {
			//				this.childSpawnTimer = 0;
			//				spawn()
			//			}
			//		function spawn() {
			//			const currentBurstCount = value.spawnOverLifeTime != 0? (value.ps.burstCount * lifeTimedelta):value.ps.burstCount
			//			//value.ps.instanceCount+currentBurstCount<value.ps.maxSpawnCount?currentBurstCount:value.ps.maxSpawnCount
			//			value.ps.resetParticle(value.tempIndex,value.ps.attributesoverLifeTime)
			//			value.ps.setTransform(newPosition[indexB0],positionVector[1],positionVector[2],value.tempIndex)
			//			if(value.ps.particleBirthFunction!=undefined){
			//				value.ps.particleBirthFunction.args.index=index
			//				value.ps.particleBirthFunction.func (value.ps.particleBirthFunction.args)
			//			}
			//			////console.log("tempindex: " +value.tempIndex + " " +value.ps.getTransform(value.tempIndex))
			//			if(value.tempIndex<value.ps.maxSpawnCount){
			//				value.tempIndex+=1
			//				if(value.ps.instance.instanceCount<value.ps.maxSpawnCount){
			//					value.ps.instance.instanceCount +=1
			//				}
			//			}
			//			else{
			//				value.tempIndex=0
			//			}
			//			for (let iChild =0; iChild <=3 ; iChild++) {
			//				//value.ps.setSourceAttributes("transform",[x,y,z])
			//			}
			//		}
			//
			//	}
		//	}

		}
			else  {
			//for (const [key, value] of this.childParticles.entries()) {
			//	if(value.ps.instance.instanceCount>0){

			//		value.ps.instance.instanceCount -= value.ps.burstCount
			//	}

				//}
				const max=this.properties.get("sourceValues").get("maxLifeTime")
				lifeTime[lifeTimeIndex]=0
				lifeTime[lifeTimeIndex+1]=max.values
							if(max.random==true){
								lifeTime[lifeTimeIndex+1]	+=range(0,1,max.minRange,max.maxRange,Math.random())
							}
						//	console.log("lifeTime ")

					if(kill==true)
					{killCount+=1}
					//console.log("kill " + index + " killcount " +killCount)

					if(reset)
					{
						// Call the kill function before resetting the particle
						if(this.particleKillFunction!=undefined){
							// Pass the current particle index to the kill function
							this.particleKillFunction.args.index = index;
							this.particleKillFunction.func(this.particleKillFunction.args);
						}
						this.resetParticle(index,attributesoverLifeTimeValues)
					}

						//console.log("kill " + index)
				}


		}
		this.instance.instanceCount-=killCount
			killCount=0

	}
	    setParticleColors(colors) {
        const colorAttribute = this.properties.get("color").attribute;
        colorAttribute.array.set(colors);
        colorAttribute.needsUpdate = true;
    }
	InitializeParticles(scene, mesh, amount, maxLifeTime, burstCount, spawnOverTime, spawnFrequency, maxSpawnCount, startPosition, startScale, startRotation,startDirection, startOpacity,startColor, startForce, startForceFieldForce) {
		this.spawnOfset=0
		this.indexSlide=false
		//+++++++++++++++++++++++++++++++++  >> initialize instancesObject <<  +++++++++++++++++++++++++++++++
		//setting the init values to default if not set
		amount = typeof amount != "number" && amount < 0 ? 100 : amount
		maxLifeTime = typeof maxLifeTime != "number" ? {values:10,random:false } : maxLifeTime
		startPosition = typeof startPosition != "object" || startPosition == undefined ? {values:[0, 0, 0],random:false }: startPosition
		startScale = typeof startScale != "object" ? {values:[100, 100, 100],random:false } : startScale
		startRotation = typeof startRotation != "object" ? {values:[0, 0, 0],random:false } : startRotation
		startColor = typeof startColor != "object" ? {values:[0, 0, 0],random:false } : startColor
		startForce = typeof startForce != "object" ? {values:[0, 0, 0] } : startForce
		startForceFieldForce = typeof startForceFieldForce != "object" ? {values:[0, 0, 0],random:false } : startForceFieldForce
		spawnFrequency = typeof spawnFrequency != "number" ? 1 : spawnFrequency
		maxSpawnCount = typeof maxSpawnCount != "number" ? 1 : maxSpawnCount
		spawnOverTime = typeof spawnOverTime != "boolean" ? false : maxSpawnCount
		burstCount = typeof burstCount != "number" ? 100 : (burstCount>maxSpawnCount?maxSpawnCount:burstCount)
		startDirection = typeof startDirection != "object" ? {values:[0, 0, 0],random:false } : startDirection
		startOpacity=typeof startOpacity!="number"?{values:[1],random:false}:startOpacity
		//direction = typeof direction="object"?
		this.childParticles = new Map()
		const fill = ( value, arr, stride) => {
			for (let i = 0; i < arr.length; i++) {
				for (let i2=0; i2<stride;i2++){
					arr[i+i2] = value[i2]
				}

			}
			return arr;
		}
		this.amount = amount

		this.vertCount = 4
		this.noise = 0
		// this.pointCloud = [] // Removed as per user feedback
		// this.startPositionFromgeometry = false // Removed as per user feedback
		this.forcefield = []
		this.force = new Array(startForce)
		this.forceFieldForce = new Array(startForceFieldForce)
		this.attributesoverLifeTime = new Map()
		this.properties = new Map()
		this.spawFrequency = 1
		this.maxSpawnCount = maxSpawnCount
		this.spawnOverTime = true
		this.waitingtime = 0
		this.burstCount = burstCount
		this.additionalBurstCount = 0
		this.evenFunctions = new Map()
		this.particleEventFunctions = new Map()
		const dictionaryItemAttributes = {
			distance: -1,
			parent: null
		}
		const geometry = mesh.geometry
		//++++++++++++++++++++++++++++  >>initialize objects<<  ++++++++++++++++++++++++++++++++++++
		const instancedGeometry = new THREE.InstancedBufferGeometry()
		this.instance = instancedGeometry
		instancedGeometry.index = geometry.index
		// instancedGeometry.maxInstancedCount = this.amount; // This is deprecated

		//instancedGeometry.instanceCount = spawnOverTime == true ? maxSpawnCount : Infinity
		//+++++++++++++++++ >>passing the data to the dictionary<< ++++++++++++++++++++++++++++++
		const emissionArray = new Uint8Array(this.amount * 3)
		const colorArray = new Uint8Array(this.amount * 3)
		const morphtargetsArray = new Float32Array(71)
		const morphtargetsInfluencesArray = new Float32Array(this.amount)
		const matrixAttributeArray = []
		const directionArray = new Float32Array(this.amount*3)
		const opacityArray = new Float32Array(this.amount)
		const matArraySize = this.amount * 3
		const lifeTimeArray = new Float32Array(amount*2)
		const matrixArray = [
			new Float32Array(matArraySize),
			new Float32Array(matArraySize),
			new Float32Array(matArraySize),
		]
		//+++++++++++++++++++++++ >>creating the instanceAttributes<<  +++++++++++++++++++++++++++++++++
		const emissiveAttribute = new THREE.InstancedBufferAttribute(emissionArray, 3, true)
		const colorAttribute = new THREE.InstancedBufferAttribute(colorArray, 3, true)
		const morphTargetsAttribute = new THREE.InstancedBufferAttribute(morphtargetsArray, 3, true)
		const morphTargetsinfluencesAttriute = new THREE.InstancedBufferAttribute(morphtargetsInfluencesArray, 1, true)
		const opacityAttribute = new THREE.InstancedBufferAttribute(opacityArray, 1, true)
		const boxPositionAttribute=	new THREE.InstancedBufferAttribute( matrixArray[0], 3 )
		const boxSizeAttribute=   	new THREE.InstancedBufferAttribute( matrixArray[1], 3 )
		const rotatioAttributen= 	new THREE.InstancedBufferAttribute( matrixArray[2], 3 )
		emissiveAttribute.dynamic = true
		colorAttribute.dynamic = true
		morphTargetsinfluencesAttriute.dynamic = true
		morphTargetsAttribute.dynamic = true
		opacityAttribute.dynamic=true
		instancedGeometry.instanceCount = 0; // Set initial instance count to 0
		instancedGeometry.setAttribute('morphTargetinfluences',morphTargetsinfluencesAttriute)
		instancedGeometry.setAttribute('morphTargets',morphTargetsAttribute)
		instancedGeometry.setAttribute('aInstanceColor',colorAttribute)
		instancedGeometry.setAttribute('aInstanceEmissive',emissiveAttribute)
		instancedGeometry.setAttribute('opacity1',opacityAttribute)
		instancedGeometry.setAttribute( 'boxPosition', boxPositionAttribute);
		instancedGeometry.setAttribute( 'boxSize',boxSizeAttribute );
		instancedGeometry.setAttribute( 'rotation', rotatioAttributen);
		Object.keys(geometry.attributes).forEach(attributeName => {
			instancedGeometry.attributes[attributeName] = geometry.attributes[attributeName]
		})
		const intersectsScene = new THREE.Scene()
		//+++++++++++++++++++++ >>create subMesh<< +++++++++++++++++++++++++++
		//instancedGeometry.morphAttributes.position = [ morphTargetsAttribute ];
		const sourceValues = new Map()
		sourceValues.set("transform", startPosition)
		sourceValues.set("color", startColor)
		sourceValues.set("emission", {values:[0,0,0],random:false,minRange:0,maxRange:0})
		sourceValues.set("morphTargets", {values:[].concat(morphtargetsArray),random:false,minRange:0,maxRange:0})
		sourceValues.set("morphTargetInfluences", {values:[].concat(morphtargetsInfluencesArray),random:false,minRange:0,maxRange:0})
		sourceValues.set("rotation", startRotation)
		sourceValues.set("scale", startScale)
		sourceValues.set("forceFieldForce", {values:startForceFieldForce,random:false,minRange:0,maxRange:0})
		sourceValues.set("force", startForce);
		sourceValues.set("direction", startDirection);
		sourceValues.set("opacity",startOpacity)
		sourceValues.set("maxLifeTime",maxLifeTime)
		this.properties.set("sourceValues", sourceValues)
		this.properties.set("transform", { array: matrixArray[0], attribute: boxPositionAttribute })
		this.properties.set("rotation", { array: matrixArray[2], attribute: rotatioAttributen})
		this.properties.set("scale", { array: matrixArray[1], attribute: boxSizeAttribute })
		this.properties.set("color", { array: colorArray, attribute: colorAttribute })
		this.properties.set("emission", { array: emissionArray, attribute: emissiveAttribute })
		this.properties.set("morphTargets", { array: morphtargetsArray, attribute: morphTargetsAttribute })
		this.properties.set("morphTargetInfluences", { array: morphtargetsInfluencesArray, attribute: morphTargetsinfluencesAttriute })
		this.properties.set("direction",{array:directionArray})
		this.properties.set("lifeTime",{array:lifeTimeArray})
		this.properties.set("opacity",{array:opacityArray,attribute:opacityAttribute})



		this.individualTransform = this.properties.get("sourceValues").has("transform") && (this.properties.get("sourceValues").get("transform").values.length > 3);
		this.individualRotation = this.properties.get("sourceValues").has("rotation") && (this.properties.get("sourceValues").get("rotation").values.length > 3);
		this.individualScale = this.properties.get("sourceValues").has("scale") && (this.properties.get("sourceValues").get("scale").values.length > 3);
		this.individualDirection = this.properties.get("sourceValues").has("direction") && (this.properties.get("sourceValues").get("direction").values.length > 3);
		console.log("individualTransform", this.individualTransform);
		console.log("individualRotation", this.individualRotation);
		console.log("individualScale", this.individualScale);
		console.log("individualDirection", this.individualDirection);
		this.individualForceField = this.properties.get("sourceValues").has("forceFieldForce") && (this.properties.get("sourceValues").get("forceFieldForce").values.length > 3);
		console.log("individualForceField", this.individualForceField);

		intersectsScene.updateMatrixWorld(true)
		const instanceMaterial = new THREE.ShaderMaterial({
			vertexShader: `
				attribute vec3 boxPosition;
				attribute vec3 boxSize;
				attribute vec3 rotation;
				attribute vec3 aInstanceColor;
				attribute float opacity1;
		
				varying vec3 vInstanceColor;
				varying float vOpacity;
				varying vec3 vNormal;
		
				mat4 rotationMatrix(vec3 axis, float angle) {
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
					return rotationMatrix(vec3(1, 0, 0), rotation.x) * rotationMatrix(vec3(0, 1, 0), rotation.y) * rotationMatrix(vec3(0, 0, 1), rotation.z);
				}
		
				void main() {
					vInstanceColor = aInstanceColor;
					vOpacity = opacity1;
					vNormal = normal;
		
					mat4 rotationMatrix = rotateXYZ();
					mat4 scaleMatrix = mat4(
						boxSize.x, 0.0, 0.0, 0.0,
						0.0, boxSize.y, 0.0, 0.0,
						0.0, 0.0, boxSize.z, 0.0,
						0.0, 0.0, 0.0, 1.0
					);
		
					vec3 transformed = (rotationMatrix * scaleMatrix * vec4(position, 1.0)).xyz + boxPosition;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
				}
			`,
			fragmentShader: `
				varying vec3 vInstanceColor;
				varying float vOpacity;
				varying vec3 vNormal;
		
				void main() {
					vec3 baseColor = vInstanceColor / 255.0; // Normalize color
					float edge = smoothstep(0.45, 0.5, abs(vNormal.x)) + 
								 smoothstep(0.45, 0.5, abs(vNormal.y)) + 
								 smoothstep(0.45, 0.5, abs(vNormal.z));
					edge = clamp(edge, 0.0, 1.0);
		
					vec3 finalColor = mix(vec3(0.0), baseColor, edge);
					gl_FragColor = vec4(finalColor, vOpacity * edge);
				}
			`,
			transparent: true,
			depthWrite: false,
		});
	//this.instance.instanceCount=0; // No longer needed, set earlier
		//++++++++++++ >>add initialized instances to scene <<  ++++++++++++++++++
		const instaneMesh = new THREE.Mesh(
			instancedGeometry,
			instanceMaterial
		)
		//console.log(instaneMesh)
		scene.add(instaneMesh)
		//this.instance.instanceCount=this.burstCount
	}
}
