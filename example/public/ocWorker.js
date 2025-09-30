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

// Helper functions moved outside the switch statement
function resetTransform(object1, index, directly) {
  const sourceAttributes = object1.properties.startPosition
  pos1 = new Array(3)
  if (object1.startPositionFromgeometry == true) {
    pos1[0] = object1.pointCloud[(index * 3)]
    pos1[1] = object1.pointCloud[(index * 3) + 1]
    pos1[2] = object1.pointCloud[(index * 3) + 2]
  } else {
    const start = pos = object1.properties.get("transform")
    pos1[0] = start.values[0]
    pos1[1] = start.values[1]
    pos1[2] = start.values[2]
  }
  if (directly) {
    setTransform(object1, pos1[0], pos1[2], pos1[2], index) // Assuming setTransform is also moved
  }
  else {
    return (pos1)
  }
}
function setTransform(object1, x, y, z, index) {
  object1.properties.get("transform").array[3][(index * 4)] = x
  object1.properties.get("transform").array[3][(index * 4) + 1] = y
  object1.properties.get("transform").array[3][(index * 4) + 2] = z
}
function setShaderAttribute(object1, attribute, index, values) {
  const attributeI = object1.properties.get(attribute).array

  for (let i = 0; i < values.length; i++) { // Corrected loop to use values.length
    attributeI[(index * values.length) + i] = values[i]
  }
}
function resetParticle(object1, index, attributesoverLifeTimeValues) {
  index0 = index * 4
  let dirIndex0 = index * 3
  const sourceValues = object1.properties.get("sourceValues")
  rot = sourceValues.get("rotation")
  col = sourceValues.get("color")
  scale = sourceValues.get("scale")
  pos = sourceValues.get("transform")
  direc = sourceValues.get("direction")
  const newPosition = object1.properties.get("transform").array[3]
  const rotation = object1.properties.get("transform").array[1]
  const scaleTemp = object1.properties.get("transform").array[2]
  const color = object1.properties.get("color").array
  pos1 = resetTransform(object1, index, false) // Pass object1
  rot1 = rot.values
  scale1 = scale.values
  col1 = col.values

  direc1 = object1.properties.get("direction")
  for (let ir = 0; ir < 3; ir++) { //ugly as shit
    if (pos.random == true) {
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

  attributesoverLifeTimeValues.forEach((value, attribute) => {
    if (attribute != "transform" && attribute != "rotation" && attribute != "scale" && attribute != "force" && attribute != "direction") {
      try {
        const sourceAttribute = sourceValues.get(attribute)
        const random = (attr)=>{
          if(attr.random==true){
          return range(0, 1, attr.minRange, attr.maxRange, Math.random()) // Corrected range usage
         }else{
          return 0
         }
        }
        switch (sourceAttribute.values.length) {
          case (3): {
            setShaderAttribute(object1, attribute, index, [sourceAttribute.values[index * 3]+random(sourceAttribute), sourceAttribute.values[(index * 3) + 1]+random(sourceAttribute), sourceAttribute.values[(index * 3) + 2]+random(sourceAttribute)])
            break;
          }
          case (2): {
            setShaderAttribute(object1, attribute, index, [sourceAttribute.values[index * 2]+random(sourceAttribute), sourceAttribute.values[(index * 2) + 1]+random(sourceAttribute)]) // Added missing +random(sourceAttribute)
            break;
          }
          case (1): {
            setShaderAttribute(object1, attribute, index, [sourceAttribute.values[0]+random(sourceAttribute)]) // Corrected for single value
            break;
          }
        }
      }
      catch {
        console.warn(attribute + " is not defined")
      }
    }
  })
}

function updateSimulation(object1, delta, reset, kill) { // Added object1 as parameter
  // Ensure maxSpawnCount is a valid number, default to 0 if not set or invalid
  const maxSpawnCount = typeof object1.maxSpawnCount === 'number' ? object1.maxSpawnCount : 0;

  // If maxSpawnCount is 0, we cannot proceed with simulation updates that rely on it.
  if (maxSpawnCount === 0) {
    console.warn("maxSpawnCount is 0, cannot update simulation.");
    return;
  }

  // Initialize object1.lifeTime if it's undefined
  if (object1.lifeTime === undefined) {
    object1.lifeTime = new Array(maxSpawnCount).fill(0);
  }

  // The original check for maxSpawnCount == 0 is now handled by the check above.
  // This block is now redundant if the above check is sufficient.
  // if (object1.maxSpawnCount == 0) {
  //   return (console.warn("noo need to update the PS! => macSpawnCount is 0"))
  // }

  const attributesoverLifeTimeValues = object1.attributesoverLifeTime
  
  if (reset == true) {
    if (waitingTime < object1.spawFrequency) {
      waitingTime += delta
    } else {
      waitingTime = 0
      const burstCountNew = object1.maxSpawnCount-(object1.burstCount+object1.instanceCount)
      object1.instanceCount = burstCountNew>0?burstCountNew:0
    }
  }
  let force = [].concat(object1.force)
  for (let i = object1.instanceCount - 1; i > 0; i--) {
    const index = ((object1.instanceCount - 1) - (i))
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
      
      const step = lifeTimedelta
      const newPosition = object1.properties.get("transform").array[3]
      const rotation = object1.properties.get("transform").array[1]
      const scaleTemp = object1.properties.get("transform").array[2]
      const sourceRot = object1.properties.get("sourceValues").get("rotation").values
      let forceFieldForce = new Float32Array(object1.forceFieldForce) // Assuming forceFieldForce is an array or similar

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
              }
            } else {
              for (let i2 = 0; i2 < value.values.length; i2++) {
                arr[((index) * value.values.length) + i2] = arr[((index) * value.values.length) + i2] + (value.values[i2] * step)
              }
            }
          }
          catch {
            console.warn(attribute + " is not defined")
          }
        }
      })
      
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

      if (object1.noise > 0) {
        const noise = Math.sin(delta * 10 * object1.noise)
        newPosition[index0] += noise
        newPosition[index1] += noise
        newPosition[index2] += noise
      }
    }
    else if (kill == true) {
      killCount += 1
      object1.lifeTime[index] = 0
      resetParticle(object1, index, attributesoverLifeTimeValues) // Pass object1
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
  }})
  return
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
        console.log("updateValues")
        console.log(object1)
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
