



// psList.dataPS.list[0]?.updateSimulation(delta,true,true)
// psList.dataPS.list[0]?.updateValues(["transform", "color", "emission","opacity"])
function postMsgFunction(index, values) {
    
  //  console.log(particles[index].instance)
  //  alert("aaaaaa")
    particles[index].instance.instanceCount =values.instanceCount
    particles[index].instance.attributes.boxPosition.array = values.transformArrays[0]
    particles[index].instance.attributes.rotation.array = values.transformArrays[1]
    particles[index].instance.attributes.boxSize.array = values.transformArrays[2]
    particles[index].instance.attributes.aInstanceColor.array = values.colorArray
    particles[index].instance.attributes.aInstanceEmissive.array = values.emissionArray
    particles[index].instance.attributes.opacity1.array = values.opacityArray
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
export default function ParticleAutoDisposal(){
    window.addEventListener("beforeunload", function(event) {
        for(let i=0;i<particles.length;i++){
            killWorker(i)
            particles[i].instance.dispose()
        }  
       
    //  event.returnValue = "pls stay"; //"Any text"; //true; //false;
      //return null; //"Any text"; //true; //false;
    });
}