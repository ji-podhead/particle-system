import * as THREE from 'three';
import * as glMatrix from "gl-matrix";

export const lerp = (x, y, a) => x * (1 - a) + y * a;
export const clamp = (a, min = 0, max = 1) => Math.min(max, Math.max(min, a));
export const invlerp = (x, y, a) => clamp((a - x) / (y - x));
export const range = (x1, y1, x2, y2, a) => lerp(x2, y2, invlerp(x1, y1, a));
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
	constructor(amount,  vertCount,  noise, pointCloud, startPositionFromgeometry, forcefield, force, forceFieldForce, attributesoverLifeTime, properties, spawFrequency, maxSpawnCount, spawnOverTime, waitingtime, burstCount, additionalBurstCount, evenFunctions, particleEventFunctions, instance, childParticles, childSpawnTimer,particleBirthFunction,particleKillFunction,spawnOfset,indexSlide) {
	this.amount = amount
	this.vertCount = vertCount
	this.noise = noise
	this.pointCloud = pointCloud
	this.startPositionFromgeometry = startPositionFromgeometry
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
	setMaxLifeTime(maxLifeTime,random,minRange,maxRange) {
		const temp=this.properties.get("sourceValues").get("maxLifeTime")
		if(typeof random !=undefined){
			temp.random=random
			temp.minRange=minRange
			temp.maxRange=maxRange

		}else{
			temp.random=false
		}
		temp.values=maxLifeTime
	}
	setNoise(strength) {
		this.noise = strength
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
		indexA0=index*3
		const trans= this.properties.get("transform")
		trans.array[0][index*3]= x
		trans.array[1][index*3+1]= y
		trans.array[2][index*3+2]= z
		//this.properties.get("transform").array[3][(index * 4)] =
		//this.properties.get("transform").array[3][(index * 4) + 1] = y
		//this.properties.get("transform").array[3][(index * 4) + 2] = z
	}
	setStartDirection(x, y, z,random,minRange,maxRange){
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
	getScale(index) {
		return ([
			this.properties.get("transform").array[1][index * 4],
			this.properties.get("transform").array[1][(index * 4) + 1],
			this.properties.get("transform").array[1][(index * 4) + 2]])
	}
	getRotation(index) {
		return ([
			this.properties.get("transform").array[2][index * 4],
			this.properties.get("transform").array[2][(index * 4) + 1],
			this.properties.get("transform").array[2][(index * 4) + 2]])
	}
	getTransform(index) {
		return ([
			this.properties.get("transform").array[3][index * 4],
			this.properties.get("transform").array[3][(index * 4) + 1],
			this.properties.get("transform").array[3][(index * 4) + 2]])
	}
	setForceFieldForce(forceFieldForce) {
		this.forceFieldForce = (forceFieldForce[0])
		this.forceFieldForce = (forceFieldForce[1])
		this.forceFieldForce = (forceFieldForce[2])
	}
	setForce(force) {
		this.force = force
		this.properties.get("sourceValues").set("force", force)
	}
	setBurstCount(count) {
		if(this.maxSpawnCount<count){
			this.burstCount=this.maxSpawnCount
		}else{
			this.burstCount = count
		}
	}
	burstParticlesManually(count) {
		this.properties.additionalBurstCount = count
	}
	setSpawnOverTime(bool) {
		this.spawnOverTime = bool

	}
	setSpawnFrequency(freq) {
		this.spawFrequency = freq

	}
	setMaxSpawnCount(count) {
		if (count > this.amount) {
			count = this.amount
		}
		this.maxSpawnCount=count
		this.instance.instanceCount = 0
	}
	setStartPositionFromGeometry(deactivate, geometry, step,random,minRange,maxRange) {
		if (deactivate == false) {
			this.createPointCloud(geometry, false, true, false, step)
			if (this.spawnOverTime == false)
				for (let i = 0; i < this.amount; i++) {
					this.setTransform(
						this.pointCloud[(i * 3)],
						this.pointCloud[(i * 3) + 1],
						this.pointCloud[(i * 3) + 2], i)
				}
				if(random){
					pos=this.properties.get("sourceValues").get("transform")
					pos.random=random
					pos.minRange=minRange
					pos.maxRange=maxRange
					}
					else{
						pos.random=false
					}
			this.startPositionFromgeometry = true
		} else {
			this.startPositionFromgeometry = false
		}

		for(let i=0;i<this.amount;i++){
			this.resetParticle(i,this.attributesoverLifeTime)
		}
	}
	setStartPositionFromArray(deactivate, array,random,minRange,maxRange) {
		if (deactivate == false) {
			this.createPointCloud(array, false, true, true)
			this.startPositionFromgeometry = true
		} else {
			this.startPositionFromgeometry = false
		}

		if(random){
			pos=this.properties.get("sourceValues").get("transform")
			pos.random=random
			pos.minRange=minRange
			pos.maxRange=maxRange
			}
			else{
				pos.random=false
			}

			for(let i=0;i<this.amount;i++){
				this.resetParticle(i,this.attributesoverLifeTime)
			}
	}
	setForceFieldFromArray(array) {
		this.createPointCloud(array, true, false, true)
		this.startPositionFromgeometry = true
	}
	setForceFieldFromGeomtry(geometry) {
		this.createPointCloud(geometry, true, false, false)
	}
	setStartPosition(position,random,minRange,maxRange) {
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
	}
	getPointCloudAtIndex(index) {
		try {
			return ([
				this.pointCloud[index],
				this.pointCloud[index + 1],
				this.pointCloud[index + 2]
			])
		} catch {
			return ([0, 0, 0])
		}
	}
	createPointCloud(geometry, forceField, startPosition, fromArray, step) {
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

		if (startPosition) {
			this.pointCloud = pc
		}
		else if (forceField) {
			this.forceField = pc
		}


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
	setSourceAttributes(attributes, values,random,minRange,maxRange) {

		const sourceValues = this.properties.get("sourceValues")
		if (typeof attributes != "string") {
			for (let i=0;i< attributes.length;i++) {
				const temp =sourceValues.get(attributes[i])
				temp.values=values[i]
				temp.random=random[i]
				temp.minRange=minRange[i]
				temp.maxRange=maxRange[i]
			}
		} else {
			console.log(attributes)
			console.log(sourceValues.get(attributes))
		const temp =	sourceValues.get(attributes)
		temp.values=values
		temp.random=random
		temp.minRange=minRange
		temp.maxRange=maxRange
		console.log(sourceValues.get(attributes))
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
	setAttributeOverLifeTime(attribute, values,end,bezier,bezierControllPointA,bezierControllPointB) {
		if(typeof bezier == "boolean"){
		this.attributesoverLifeTime.set(attribute, {values:values,end:end,bezier:bezier, bezierControllPointA:bezierControllPointA,bezierControllPointB:bezierControllPointB
		})
		}else{
		this.attributesoverLifeTime.set(attribute, {values:values,end:end,bezier:false})
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
		//console.log(attributes)
		//console.log(typeof attributes)
		if (typeof attributes == "object") {

			for (const attribute of attributes) {
					try {
						//
						this.properties.get(attribute).attribute.needsUpdate = true
					}
					catch { console.warn(attribute + " is not defined, pls check your spelling, or check if the attribute exist") }
				}
		}



	}
	resetTransform(index,directly) {

		 pos1 = new Array(3)
		if (this.startPositionFromgeometry == true) {
			pos1[0]=this.pointCloud[(index * 3)]
			pos1[1]=this.pointCloud[(index * 3) + 1]
			pos1[2]=this.pointCloud[(index * 3) + 2]
		} else {
			const start=pos=this.properties.get("sourceValues").get("transform")
				pos1[0]=start.values[0]
				pos1[1]=start.values[1]
				pos1[2]=start.values[ 2]
		}
		if(directly){
			this.setTransform(pos1[0],pos1[2],pos1[2], index)
		}
		else{
			return(pos1)
		}

	}
	getAliveCount(){
		return(this.instances.instanceCount)
	}
	setAliveCount(count){
		this.instances.instanceCount=count
	}
	/**
	 * this function will call the given function with given arguments at the birth of the particle
	 * the index of the particle will be added as the last argument
	 * @param {*} func
	 * the function that is called
	 * @param {*} args
	 * the arguments that will be passed intoo the constructor of the func function
	 */
	onParticleBirth(func,args){
	 this.particleBirthFunction={func:func,args:args}
	}
	/**
	 * this function will call the given function with given arguments at the end of the particles lifeSpan.
	 * the index of the particle will be added as the last argument.
	 * @param {*} func
	 * the function that is called
	 * @param {*} args
	 * the arguments that will be passed intoo the constructor of the func function
	 */
	onParticleKill(func,args){
		this.particleKillFunction={func:func,args:args}
	}
		createEventFunction() {

	}

//burst(amount1,position1){

//lifeTime=this.properties.get("lifeTime").array
//	const overFlow =this.maxSpawnCount-(this.instance.instanceCount+amount1)
//	let start
//
//	if( overFlow>=0&&(lifeTime[this.instance.instanceCount]==0)){
//		start=this.instance.instanceCount
//	}else{
//
//		start=0
//	}
//
//	for (let i=start;i<=(start+amount1);i++){
//		if(overFlow>=0){
//			this.instance.instanceCount+=1
//		}
//		else{
//			lifeTime[i]=0
//		}
//
//		this.resetParticle(i,this.attributesoverLifeTime)
//		this.setTransform(position1[0],position1[1],position1[2],i)
//
//		console.log(overFlow+"func"+i,this.getTransform(i))
//
//	}
//}
	burst(amount1,position1){
		let iterator=0
	const	lifeTime=this.properties.get("lifeTime").array

	for (let i=0;i< amount1;i++)
	{
		let index
		if(this.instance.instanceCount>=this.maxSpawnCount){
			index=0
			lifeTime[0]=0
		}
		else{
			this.instance.instanceCount+=1
		}
		this.resetParticle(i,this.attributesoverLifeTime)
		this.setTransform(position1[0],position1[1],position1[2],i)
		}
	}
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
	resetParticle(index, ) {
		const attributesoverLifeTimeValues = this. attributesoverLifeTime
		indexA0=index*3
		indexA1=indexA0+1
		indexA2=indexA1+1
		//console.log("reset " + index)
		const sourceValues = this.properties.get("sourceValues")
			//pos1=[this.properties.get("transform").array[3][index * 4],
			//this.properties.get("transform").array[3][(index * 4) + 1],
			//this.properties.get("transform").array[3][(index * 4) + 2]]
			rot=sourceValues.get("rotation")
			scale=sourceValues.get("scale")
			pos =sourceValues.get("transform")
			direc=sourceValues.get("direction")
			pos1=this.resetTransform(index,false)
			rot1=rot.values
			scale1=scale.values
			for (let i=0;i<3;i++){
				positionVector[i]=pos1.values[i]
				rotationVector[i]=rot.values[i]
				scaleVector[i]=scale.values[i]
			}
			if(pos.random==true){
				positionVector[0]=+range(0,1,pos.minRange,pos.maxRange,Math.random())
				positionVector[1]=+range(0,1,pos.minRange,pos.maxRange,Math.random())
				positionVector[2]=+range(0,1,pos.minRange,pos.maxRange,Math.random())
				}
			if(rot.random==true){
				rotationVector[0]+=range(0,1,rot.minRange,rot.maxRange,Math.random())
				rotationVector[1]+=range(0,1,rot.minRange,rot.maxRange,Math.random())
				rotationVector[2]+=range(0,1,rot.minRange,rot.maxRange,Math.random())
				}
				if(scale.random==true){
				scaleVector[0]+=range(0,1,scale.minRange,scale.maxRange,Math.random())
				scaleVector[1]+=range(0,1,scale.minRange,scale.maxRange,Math.random())
				scaleVector[2]+=range(0,1,scale.minRange,scale.maxRange,Math.random())
				}
			const trans0 = this.properties.get("transform").array
			const trans1 =  this.properties.get("scale").array
			const trans2= this.properties.get("rotation").array
	for (let i=0;i<3;i++){
				trans0[indexA0+i]=positionVector[i]
				trans1[indexA0+i]=scaleVector[i]
				trans2[indexA0+i]=rotationVector[i]
			}
			direc1=this.properties.get("direction")
			direc1.array[indexA0]=direc.values[0]
			direc1.array[indexA1]=direc.values[1]
			direc1.array[indexA2]=direc.values[2]
			if(direc.random==true){
				direc1.array[(indexA0)]+=range(0,1,direc.minRange,direc.maxRange,Math.random())
				direc1.array[(indexA1)]+=range(0,1,direc.minRange,direc.maxRange,Math.random())
				direc1.array[(indexA2)]+=range(0,1,direc.minRange,direc.maxRange,Math.random())
			}

			attributesoverLifeTimeValues.forEach((value,attribute) => {
			//console.log("reset"  +  attribute)
			if (attribute != "transform"&&attribute != "rotation"&&attribute != "scale"&&attribute != "force"&&attribute != "direction")
			{
					const sourceAttribute = sourceValues.get(attribute)
					const attrArray = this.properties.get(attribute).array
					randomX=0
					randomY=0
					randomZ=0
					if(sourceAttribute.random){
							randomX=range(0,1,sourceAttribute.minRange,sourceAttribute.maxRange,Math.random())
							randomY=range(0,1,sourceAttribute.minRange,sourceAttribute.maxRange,Math.random())
							randomZ=range(0,1,sourceAttribute.minRange,sourceAttribute.maxRange,Math.random())
						}
					  switch (sourceAttribute.values.length) {
						case (3): {
							attrArray[indexA0]=sourceAttribute.values[0]+randomX
							attrArray[indexA1]=sourceAttribute.values[1]+randomY
							attrArray[indexA2]=sourceAttribute.values[2]+randomZ

							//console.log("attr" + attribute)
							//console.log(sourceAttribute)
							//console.log(attrArray[indexA0]+" " +
							//	attrArray[indexA1]+" " +
							//	attrArray[indexA2])
							break;
						}
						case (2): {
							attrArray[indexA0]=sourceAttribute.values[0]+randomX
							attrArray[indexA1]=sourceAttribute.values[1]+randomY
						}
						case (1): {
							attrArray[indexA0]=sourceAttribute.values[0]+randomZ

						  break;
						}
					  }

			}
		})
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
	//if(this.particleBirthFunction!=undefined){
		//		this.particleBirthFunction.args.index=this.instance.instanceCount
		//		this.particleBirthFunction.func(this.particleBirthFunction.args)
		//	}
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
				let forceFieldForce = new Float32Array(this.forceFieldForce)
				attributesoverLifeTimeValues.forEach((value,attribute) => {
					if (attribute == "forceFieldForce") {

						if(value.bezier==true){
						forceFieldForce = [
					(value.values[0]*forceFieldForce[0] * step),
					(value.values[1]* forceFieldForce[1] * step),
					(value.values[2]* forceFieldForce[2] * step)]
						}else{
							forceFieldForce = [
							value.values[0]+(forceFieldForce[0] * step),
							value.values[1]+( forceFieldForce[1] * step),
							value.values[2]+( forceFieldForce[2] * step)]
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
				if (forceFieldForce[0] > 0 || forceFieldForce[1] > 0 || forceFieldForce[2] > 0) {
					if (this.startPositionFromgeometry == true) {
						directionVector[0] += forceFieldForce[0]
						directionVector[1] += forceFieldForce[1]
						directionVector[2] += forceFieldForce[2]
						if (
							this.instances.properties.transform.array[3][(index) * 4] != this.forceField[(index) * 3]
							&& this.instances.properties.transform.array[3][(index) * 4 + 1] != this.forceField[(index) * 3 + 1]
							&& this.instances.properties.transform.array[3][(index) * 4 + 2] != this.forceField[(index) * 3 + 2]) {
							directionVector[0] += forceFieldForce
							directionVector[1] += forceFieldForce
							directionVector[2] += forceFieldForce

						}
						isTransforming=true
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
					{this.resetParticle(index,attributesoverLifeTimeValues)}

						//console.log("kill " + index)
			//	if(this.particleKillFunction!=undefined){
			//	let args =this.particleKillFunction.args
			//	args.index=i
			//this.particleKillFunction.func(args)
				//}
				}


		}
		this.instance.instanceCount-=killCount
			killCount=0

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
		this.pointCloud = []
		this.startPositionFromgeometry = false
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
		instancedGeometry.maxInstancedCount = this.amount

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
		instancedGeometry.instanceCount = Infinity;
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



		intersectsScene.updateMatrixWorld(true)
		const instanceMaterial = mesh.material
		if(instanceMaterial.transparent==true){
			instanceMaterial.depthWrite=false
		}
			//	mat4 aInstanceMatrix = mat4(aInstanceMatrix0,aInstanceMatrix1,aInstanceMatrix2,aInstanceMatrix3);
		//vec3 transformed = (aInstanceMatrix * vec4( position , 1. )).xyz;
		//++++++++++++  >>shader<<  +++++++++++++
instanceMaterial.onBeforeCompile = shader => {
	shader.vertexShader = `
	attribute vec3 boxPosition;
	attribute vec3 boxSize;
	attribute vec3 rotation;
	attribute vec3 aInstanceColor;
	attribute vec3 aInstanceEmissive;
	attribute vec3 morphTargets;
	attribute float morphTargetInfluences;
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
  varying vec3 vmorphTargets;
  varying float vmorphTargetInfluences;
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
	this.instance.instanceCount=0
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