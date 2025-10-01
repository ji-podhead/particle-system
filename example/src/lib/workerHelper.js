// psList.dataPS.list[0]?.updateSimulation(delta,true,true)
// psList.dataPS.list[0]?.updateValues(["transform", "color", "emission","opacity"])
function postMsgFunction(index, values) {
    console.log("lifetime array")
    console.log(values.lifeTime)
  //  console.log(particles[index].instance)
  //  alert("aaaaaa")
    particles[index].instance.instanceCount = values.instanceCount; // Log instanceCount
    console.log(`Particle ${index} instanceCount: ${values.instanceCount}`);

    if (values.transform) {
        try {
            particles[index].instance.attributes.boxPosition.array = values.transform;
            particles[index].instance.attributes.rotation.array = values.rotation;
            particles[index].instance.attributes.boxSize.array = values.scale;
        } catch (error) {
            console.error(`Error assigning transform arrays for particle ${index}:`, error);
            console.error(`Received transformArrays:`, values);
            // Optionally, you could try to assign default empty arrays or skip assignment here
            // to prevent the application from crashing, but logging the error is crucial for debugging.
        }
    } else {
        console.warn("worker received no values");
    }

    particles[index].lifeTime=values.lifeTime
    particles[index].properties.get("direction").array=values.directionArray
   // console.log(index + " got value")
    particles[index].updateValues(["transform", "color", "emission","opacity"])
}
const workers = []
const events = []
const particles = []
export function startParticleWorker(particle) {
    particles.push(particle)
    let index = particles.length - 1
    workers.push(new Worker("ocWorker.js"))
    events.push(event => { postMsgFunction(event.data.index, event.data.values); })
    workers[index].addEventListener("message", events[index]);
    updateWorkerValues(index)
    return (index)
}
export function updateWorkerValues(index) {
    console.log("default particles values")
    console.log(particles[index])

    workers[index].postMessage({
        task: "init", index:index})
    workers[index].postMessage({
        task: "updateDefaultValues", value: {
            object: {
            
                amount: particles[index].amount,
                noise: particles[index].noise,
                pointCloud: particles[index].pointCloud,
                startPositionFromgeometry: particles[index].startPositionFromgeometry,
                forcefield: particles[index].forcefield,
                force: particles[index].force,
                forceFieldForce: particles[index].forceFieldForce,
                attributesoverLifeTime: particles[index].attributesoverLifeTime,
                properties: particles[index].properties,
                spawFrequency: particles[index].spawFrequency,
                maxSpawnCount: particles[index].maxSpawnCount,
                spawnOverTime: particles[index].spawnOverTime,
                burstCount: particles[index].burstCount,
                instanceCount: particles[index].instance.instanceCount,
                spawnOfset: particles[index].spawnOfset
                
            }
        }
    });
    console.log("updated worker")
}
export function killWorker(index) {
    console.log("terminate ocWorker")
    workers[index].removeEventListener("error", events[index]);
    workers[index].terminate();
}
export function workerUpdateSimulation(index, delta) {
    workers[index].postMessage({ task: "updateSimulation", value: { delta: delta} });

}
export  function ParticleAutoDisposal(){
    window.addEventListener("beforeunload", function(event) {
        for(let i=0;i<particles.length;i++){
            killWorker(i)
            particles[i].instance.dispose()
        }  
       
    //  event.returnValue = "pls stay"; //"Any text"; //true; //false;
      //return null; //"Any text"; //true; //false;
    });
}
