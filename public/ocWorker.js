

const lerp = (x, y, a) => x * (1 - a) + y * a;
const clamp = (a, min = 0, max = 1) => Math.min(max, Math.max(min, a));
const invlerp = (x, y, a) => clamp((a - x) / (y - x));
const range = (x1, y1, x2, y2, a) => lerp(x2, y2, invlerp(x1, y1, a));
let rot = new Array(3)
let scale = new Array(3)
let col = new Array(3)
let pos = new Array(3)
let direc = new Array(3)
let rot1, scale1, col1, pos1, direc1
let killCount = 0
let op = 1.0
const tempArr0 = []
const tempArr1 = new Array(2)
const tempArr2 = new Array(3)
let dirIndex0
let dirIndex1
let dirIndex2
let index0, index1, index2
let waitingTime = 0
let index = 0
let object1 ={}
let delta

self.onmessage = function (input) {
  switch (input.data.task) {
    case ("init"): {
      index = input.data.value.index
      break;
    }
    case ("updateDefaultValues"): {
      console.log(object1)
      object1 = input.data.value.object
      console.log("updateValues")
      console.log(object1)
      break;
    }
    case ("updateSimulation"): {
    //  console.log(object1)
      delta = input.data.value.delta
  
      // console.log(input.data.value.delta)
      updateSimulation(delta,true,true)
      function resetTransform(index, directly) {
        const sourceAttributes = object1.properties.startPosition
        pos1 = new Array(3)
        if (object1.startPositionFromgeometry == true) {
          pos1[0] = object1.pointCloud[(index * 3)]
          pos1[1] = object1.pointCloud[(index * 3) + 1]
          pos1[2] = object1.pointCloud[(index * 3) + 2]
        } else {
          const start = pos = object1.properties.get("sourceValues").get("transform")
          pos1[0] = start.values[0]
          pos1[1] = start.values[1]
          pos1[2] = start.values[2]
        }
        if (directly) {
          setTransform(pos1[0], pos1[2], pos1[2], index)
        }
        else {
          return (pos1)
        }
      }
      function setTransform(x, y, z, index) {
        object1.properties.get("transform").array[3][(index * 4)] = x
        object1.properties.get("transform").array[3][(index * 4) + 1] = y
        object1.properties.get("transform").array[3][(index * 4) + 2] = z
      }
      function setShaderAttribute(attribute, index, values) {
        const attributeI = object1.properties.get(attribute).array


        for (let i = 0; i < attribute.length; i++) {

          attributeI[(index * values.length) + i] = values[i]

        }

        ////console.log("setting  index " +index+ " attr "+)
      }
      function resetParticle(index, attributesoverLifeTimeValues) {
        index0 = index * 4
        let dirIndex0 = index * 3
        const sourceValues = object1.properties.get("sourceValues")
        //pos1=[object1.properties.get("transform").array[3][index * 4],
        //object1.properties.get("transform").array[3][(index * 4) + 1],
        //object1.properties.get("transform").array[3][(index * 4) + 2]]
        rot = sourceValues.get("rotation")
        col = sourceValues.get("color")
        scale = sourceValues.get("scale")
        pos = sourceValues.get("transform")
        direc = sourceValues.get("direction")
        const newPosition = object1.properties.get("transform").array[3]
        const rotation = object1.properties.get("transform").array[1]
        const scaleTemp = object1.properties.get("transform").array[2]
        const color = object1.properties.get("color").array
        pos1 = resetTransform(index, false)
        rot1 = rot.values
        scale1 = scale.values
        col1 = col.values

        direc1 = object1.properties.get("direction")
        for (let ir = 0; ir < 3; ir++) { //ugly as shit
          if (pos.random == true) {
            //pos1 wird in resetTransform gesetzt

            newPosition[index0 + ir] = pos1[ir] + range(0, 1, pos.minRange, pos.maxRange, Math.random())
          }
          direc1.array[(dirIndex0 + ir)] = direc.values[ir]
          if (direc.random == true) {
            direc1.array[(dirIndex0 + ir)] += range(0, 1, direc.minRange, direc.maxRange, Math.random())

          }
          if (rot.random == true) {
            rotation[index0 + ir] = rot1[ir] + (0, 1, rot.minRange, rot.maxRange, Math.random())
          }
          if (scale.random == true) {
            scaleTemp[index0 + ir] = scale1[ir] + range(0, 1, scale.minRange, scale.maxRange, Math.random())
          }
        }
        //	alert(object1.properties.get("direction").array)
        //	todo: set values not really nescessary
        //object1.setRotation(rot1.values[0], rot1.values[1], rot1.values[2], index)
        //object1.setScale(scale1.values[0], scale1.values[1], scale1.values[2], index)
        //object1.setTransform(pos1[0],pos1[2],pos1[2], index)
        //	object1.setDirection(direc1[0],direc1[1],direc1[2],index)

        attributesoverLifeTimeValues.forEach((value, attribute) => {
          //console.log("reset"  +  attribute)
          if (attribute != "transform" && attribute != "rotation" && attribute != "scale" && attribute != "force" && attribute != "direction") {
            try {
              //console.log("rest")
              const sourceAttribute = sourceValues.get(attribute)
              //console.log("set " + attribute)
              //console.log(sourceAttribute)
              const random = (attr)=>{
                if(attr.random==true){
                return range(0, 1, scale.minRange, scale.maxRange, Math.random())
               }else{
                return 0
               }
              }
              switch (sourceAttribute.values.length) {
                case (3): {
                  setShaderAttribute(attribute, index, [sourceAttribute.values[index * 3]+random(sourceAttribute), sourceAttribute.values[(index * 3) + 1]+random(sourceAttribute), sourceAttribute.values[(index * 3) + 2]+random(sourceAttribute)])
                  break;
                }
                case (2): {
                  setShaderAttribute(attribute, index, [sourceAttribute.values[index * 2]+random(sourceAttribute), sourceAttribute.values[(index * 2) + 1]]+random(sourceAttribute))
                  break;
                }
                case (1): {
                  setShaderAttribute(attribute, index, sourceAttribute.values)+random(sourceAttribute)
                  break;
                }
              }

              //	console.log(object1.getAttribute(attribute,index,1))
            }
            catch {
              console.warn(attribute + " is not defined")
            }
          }
        })
      }
     function updateSimulation(delta, reset, kill) {
        //alert(object1.instanceCount)
        if (object1.maxSpawnCount == 0) {
          return (console.warn("noo need to update the PS! => macSpawnCount is 0"))
        }
        //reset = reset==undefined?true:false
        //childParticle = childParticle==undefined?false:true
        //todo: set i by i/range
        //todo disable aatributes that are not reached by i/range
        const attributesoverLifeTimeValues = object1.attributesoverLifeTime
        const overlifetimeSize = object1.attributesoverLifeTime.size
        //console.log(":MAAAAXSPAWNCOUNT:" + object1.maxSpawnCount)
        //console.log("SPAWNCOUNT:" + object1.spawnCount)
        //console.log("spawnfreq:" + object1.spawFrequency)

        if (reset == true) {
          //	console.log("wait " + object1.waitingTime)
          if (waitingTime < object1.spawFrequency) {
            waitingTime += delta
          } else {
            waitingTime = 0
            //const maxBurst = object1.burstCount + object1.additionalBurstCount
            //const überschuss = object1.maxSpawnCount - (maxBurst + object1.instanceCount)
            //	const burstCount = überschuss > 0 ? maxBurst : maxBurst - überschuss

            //console.log("----------------------------------------------")

            
            const burstCountNew = object1.maxSpawnCount-(object1.burstCount+object1.instanceCount)
                        object1.instanceCount = burstCountNew>0?burstCountNew:0
          console.log(object1.instanceCount)
            //  for (let i = 0; i < object1.burstCount; i++) {

            //  if (object1.instanceCount < object1.maxSpawnCount) {
            //    
               // console.log(object1.instanceCount)
                //object1.resetParticle(object1.instanceCount,attributesoverLifeTimeValues)
              //  object1.lifeTime[object1.instanceCount + 1] = 0

        //     } else {
        //     }
        //     if (object1.particleBirthFunction != undefined) {
        //       object1.particleBirthFunction.args.index = object1.instanceCount
        //       object1.particleBirthFunction.func(object1.particleBirthFunction.args)
        //     }
        //   }
            //console.log("newCount" + object1.instanceCount)
            //console.log(object1.lifeTime)
            //console.log(object1.properties.get("transform"))
            //	alert("neRound")
          }
        }
        let force = [].concat(object1.force)
        for (let i = object1.instanceCount - 1; i > 0; i--) {
          const index = ((object1.instanceCount - 1) - (i))
          //    console.log("i " + i  + " index " + index)
          object1.lifeTime[index] += delta
          if (object1.lifeTime[index] <= object1.maxLifeTime) {
            let direction = object1.properties.get("direction").array
            const lifeTimedelta = (object1.lifeTime[index] / object1.maxLifeTime)
            index0 = index * 4
            index1 = index0 + 1
            index2 = index1 + 1
            dirIndex0 = index * 3
            dirIndex1 = dirIndex0 + 1
            dirIndex2 = dirIndex1 + 1
            //object1.properties.get("opacity").array[i]=0
            //object1.properties.get("opacity").attribute.needsUpdate=true;
           //  	console.log("upedate " + i +" plus ofs " + (index) + " life " +  object1.lifeTime[index] + " delta " + lifeTimedelta )
            const step = lifeTimedelta
            const newPosition = object1.properties.get("transform").array[3]
            const rotation = object1.properties.get("transform").array[1]
            const scaleTemp = object1.properties.get("transform").array[2]
            const sourceRot = object1.properties.get("sourceValues").get("rotation").values
            let forceFieldForce = new Float32Array(object1.forceFieldForce)
            attributesoverLifeTimeValues.forEach((value, attribute) => {
              if (attribute == "transform") {
                if (attribute.multiply == true) {
                  newPosition[index0] = (newPosition[index0] * (value.values[0] * step))
                  newPosition[index1] = (newPosition[index1] * (value.values[1] * step))
                  newPosition[index2] = (newPosition[index2] * (value.values[2] * step))
                } else {
                  newPosition[index0] = (newPosition[index0] += (value.values[0] * step))
                  newPosition[index1] = (newPosition[index1] += (value.values[1] * step))
                  newPosition[index2] = (newPosition[index2] += (value.values[2] * step))
                }

              }
              else if (attribute == "rotation") {
                if (attribute.multiply == true) {
                  rotation[index0] = value.values[0] * step * rotation[index0]
                  rotation[index1] = value.values[1] * step * rotation[index1]
                  rotation[index2] = value.values[2] * step * rotation[index2]
                } else {
                  rotation[index0] = (value.values[0] * step) + rotation[index0]
                  rotation[index1] = (value.values[1] * step) + rotation[index1]
                  rotation[index2] = (value.values[2] * step) + rotation[index2]
                }
              }
              else if (attribute == "scale") {
                if (attribute.multiply == true) {
                  scaleTemp[index0] = value.values[0] * step * scaleTemp[index0]
                  scaleTemp[index1] = value.values[1] * step * scaleTemp[index1]
                  scaleTemp[index2] = value.values[2] * step * scaleTemp[index2]
                } else {
                  scaleTemp[index0] = (value.values[0] * step) + scaleTemp[index0]
                  scaleTemp[index1] = (value.values[1] * step) + scaleTemp[index1]
                  scaleTemp[index2] = (value.values[2] * step) + scaleTemp[index2]
                }
              }
              else if (attribute == "forceFieldForce") {
                if (attribute.multiply == true) {
                  forceFieldForce = [
                    (value.values[0] * forceFieldForce[0] * step),
                    (value.values[1] * forceFieldForce[1] * step),
                    (value.values[2] * forceFieldForce[2] * step)]
                } else {
                  forceFieldForce = [
                    value.values[0] + (forceFieldForce[0] * step),
                    value.values[1] + (forceFieldForce[1] * step),
                    value.values[2] + (forceFieldForce[2] * step)]
                }
              }
              else if (attribute == "force") {
                if (attribute.multiply == true) {
                  force[0] = force[0] * (step * value.values[0])
                  force[1] = force[1] * (step * value.values[1])
                  force[2] = force[2] * (step * value.values[2])
                } else {
                  force[0] = force[0] + (step * value.values[0])
                  force[1] = force[1] + (step * value.values[1])
                  force[2] = force[2] + (step * value.values[2])
                }
              }
              else if (attribute == "direction") {

                if (attribute.multiply == true) {
                  direction[dirIndex0] = direction[dirIndex0] * (value.values[0] * (step))
                  direction[dirIndex1] = direction[dirIndex1] * (value.values[1] * (step))
                  direction[dirIndex2] = direction[dirIndex2] * (value.values[2] * (step))
                } else {
                  direction[dirIndex0] = direction[dirIndex0] + (value.values[0] * (step))
                  direction[dirIndex1] = direction[dirIndex1] + (value.values[1] * (step))
                  direction[dirIndex2] = direction[dirIndex2] + (value.values[2] * (step))
                }
              }
              else {
                try {
                  const arr = object1.properties.get(attribute).array
                  if (value.multiply == true) {
                    for (let i2 = 0; i2 < value.values.length; i2++) {
                      arr[((index) * value.values.length) + i2] = arr[((index) * value.values.length) + i2] * (value.values[i2] * step)
                      ////console.log(arr[i+i2])
                    }
                  } else {
                    for (let i2 = 0; i2 < value.values.length; i2++) {
                      arr[((index) * value.values.length) + i2] = arr[((index) * value.values.length) + i2] + (value.values[i2] * step)
                      ////console.log(arr[i+i2])
                    }
                  }
                }
                catch {
                  console.warn(attribute + " is not defined")
                }
              }
            })
            //todo: forcefield force mit kreutzprodukt berechnen
            if (forceFieldForce[0] > 0 || forceFieldForce[1] > 0 || forceFieldForce[2] > 0) {
              if (object1.startPositionFromgeometry == true) {
                newPosition[index0] += forceFieldForce[0]
                newPosition[index1] += forceFieldForce[1]
                newPosition[index2] += forceFieldForce[2]
                if (
                  object1.instances.properties.transform.array[3][(index) * 4] != object1.forceField[(index) * 3]
                  && object1.instances.properties.transform.array[3][(index) * 4 + 1] != object1.forceField[(index) * 3 + 1]
                  && object1.instances.properties.transform.array[3][(index) * 4 + 2] != object1.forceField[(index) * 3 + 2]) {
                  newPosition[index0] += forceFieldForce
                  newPosition[index1] += forceFieldForce
                  newPosition[index2] += forceFieldForce
                }
              }
            }
            newPosition[index0] += (direction[index0] !== 0 ? (force[0] * direction[index0]) : force[0])
            newPosition[index1] += (direction[index1] !== 0 ? (force[1] * direction[index1]) : force[1])
            newPosition[index2] += (direction[index2] !== 0 ? (force[2] * direction[index2]) : force[2])
            //direction[0]!==0&&	(force[0] *=direction[0])
            //direction[1]!==0&&	(force[1] *=direction[1])
            //direction[2]!==0&&	(force[2] *=direction[2])
            //newPosition[0] +=
            //newPosition[1] +=
            //newPosition[2] +=

            ////console.log(force)
            if (object1.noise > 0) {
              const noise = Math.sin(delta * 10 * object1.noise)
              newPosition[index0] += noise
              newPosition[index1] += noise
              newPosition[index2] += noise
            }



            //	//console.log("newPosition " + newPosition + " force "+ force	)

            //	object1.setTransform(x, y, z, index)
            //+++++++++++++++++++++++++++++++++++	childParticles  +++++++++++++++++++++++++++++++++++++++++++++
            //  if(object1.childParticles.size>0){
            // for (const [key, value] of object1.childParticles.entries()) {
            //    const tempTimerMax=value.spawnFrequencyOverLifeTime>0?(value.ps.spawFrequency * lifeTimedelta):value.ps.spawFrequency
            //  if (object1.childSpawnTimer <tempTimerMax ) {
            //      object1.childSpawnTimer += delta
            //    }
            //    else {
            //      object1.childSpawnTimer = 0;
            //      spawn()
            //    }
            //  function spawn() {
            // const currentBurstCount = value.spawnOverLifeTime != 0? (value.ps.burstCount * lifeTimedelta):value.ps.burstCount
            // //value.ps.instanceCount+currentBurstCount<value.ps.maxSpawnCount?currentBurstCount:value.ps.maxSpawnCount
            // value.ps.resetParticle(value.tempIndex,value.ps.attributesoverLifeTime)
            // value.ps.setTransform(newPosition[index0],newPosition[index1],newPosition[index2],value.tempIndex)
            // if(value.ps.particleBirthFunction!=undefined){
            //  value.ps.particleBirthFunction.args.index=index
            //  value.ps.particleBirthFunction.func (value.ps.particleBirthFunction.args)
            // }
            // ////console.log("tempindex: " +value.tempIndex + " " +value.ps.getTransform(value.tempIndex))
            // if(value.tempIndex<value.ps.maxSpawnCount){
            //  value.tempIndex+=1
            //  if(value.ps.instanceCount<value.ps.maxSpawnCount){
            // value.ps.instanceCount +=1
            //  }
            // }
            // else{
            //     value.tempIndex=0
            // }
            // for (let iChild =0; iChild <=3 ; iChild++) {
            //value.ps.setSourceAttributes("transform",[x,y,z])
            // }
            //  }
            //  
            // }
            //  }

          }
          else if (kill == true) {
            //for (const [key, value] of object1.childParticles.entries()) {
            //	if(value.ps.instanceCount>0){

            //		value.ps.instanceCount -= value.ps.burstCount
            //	}
            //}			
            killCount += 1
            object1.lifeTime[index] = 0
            resetParticle(index, attributesoverLifeTimeValues)
            //console.log("kill " + index)
            //	if(object1.particleKillFunction!=undefined){
            //	let args =object1.particleKillFunction.args
            //	args.index=i
            //object1.particleKillFunction.func(args)
            //}
          }
        }
        object1.instanceCount -= killCount
        killCount = 0
        postMessage({index: index, values: {
          transformArrays: [
            object1.properties.get("transform").array[1],
            object1.properties.get("transform").array[2],
            object1.properties.get("transform").array[3]],
          lifeTime: object1.lifeTime,
          colorArray: object1.properties.get("color").array,
          emissionArray: object1.properties.get("emission").array,
          opacityArray: object1.properties.get("opacity").array,
          directionArray: object1.properties.get("direction").array,
          instanceCount:object1.instanceCount
        }
        
      })
      return
      }
      
      return
      
      // object?.updateValues(["transform", "color", "emission","opacity"])
 
    }
  }
}


