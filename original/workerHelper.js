// psList.dataPS.list[0]?.updateSimulation(delta,true,true)
// psList.dataPS.list[0]?.updateValues(["transform", "color", "emission","opacity"])
function postMsgFunction(index, values) {
    const particle = particles[index];
    particle.instance.instanceCount = values.instanceCount;

    // The worker sends back typed arrays. We copy their contents into the
    // existing buffer attributes on the main thread to avoid the Three.js error.
    particle.instance.attributes.boxPosition.array.set(values.transform);
    particle.instance.attributes.boxSize.array.set(values.scale);
    particle.instance.attributes.rotation.array.set(values.rotation);
    particle.instance.attributes.aInstanceColor.array.set(values.color);
    particle.instance.attributes.aInstanceEmissive.array.set(values.emission);
    particle.instance.attributes.opacity1.array.set(values.opacity);

    // Also update the local properties map for lifetime and direction
    particle.properties.get("lifeTime").array.set(values.lifeTime);
    particle.properties.get("direction").array.set(values.direction);

    // Mark attributes for update so Three.js knows to re-upload the data to the GPU.
    // NOTE: The attribute names on the geometry are 'boxPosition' and 'boxSize',
    // but the property names in our map are 'transform' and 'scale'.
    // We must tell `updateValues` to update the *properties* by their map key.
    particle.updateValues(["transform", "scale", "rotation", "color", "emission", "opacity"]);
    
    // We also need to manually flag the attributes themselves for update.
    particle.instance.attributes.boxPosition.needsUpdate = true;
    particle.instance.attributes.boxSize.needsUpdate = true;
    particle.instance.attributes.rotation.needsUpdate = true;
    particle.instance.attributes.aInstanceColor.needsUpdate = true;
    particle.instance.attributes.aInstanceEmissive.needsUpdate = true;
    particle.instance.attributes.opacity1.needsUpdate = true;
}
const workers = []
const events = []
const particles = []
export function startParticleWorker(particle, workerUrl) {
    particles.push(particle)
    let index = particles.length - 1
    workers.push(new Worker(workerUrl))
    events.push(event => { postMsgFunction(event.data.index, event.data.values); })
    workers[index].addEventListener("message", events[index]);
    updateWorkerValues(index)
    return (index)
}
export function updateWorkerValues(index) {
    workers[index].postMessage({
        task: "init", value:{index:index}})
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