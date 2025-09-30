// psList.dataPS.list[0]?.updateSimulation(delta,true,true)
// psList.dataPS.list[0]?.updateValues(["transform", "color", "emission","opacity"])
function postMsgFunction(index, values) {
    const particle = particles[index];
    if (!particle || !values) {
        console.error("postMsgFunction called with invalid index or values");
        return;
    }

    // Update instance count
    particle.instance.instanceCount = values.instanceCount;

    const {
        boxPosition,
        rotation,
        boxSize,
        aInstanceColor,
        aInstanceEmissive,
        opacity1
    } = particle.instance.attributes;

    // Update buffer data using set() to avoid resizing errors
    if (boxPosition && values.transformArrays && values.transformArrays[0]) {
        boxPosition.array.set(values.transformArrays[0]);
        boxPosition.needsUpdate = true;
    }

    if (rotation && values.transformArrays && values.transformArrays[1]) {
        rotation.array.set(values.transformArrays[1]);
        rotation.needsUpdate = true;
    }

    if (boxSize && values.transformArrays && values.transformArrays[2]) {
        boxSize.array.set(values.transformArrays[2]);
        boxSize.needsUpdate = true;
    }

    if (aInstanceColor && values.colorArray) {
        aInstanceColor.array.set(values.colorArray);
        aInstanceColor.needsUpdate = true;
    }

    if (aInstanceEmissive && values.emissionArray) {
        aInstanceEmissive.array.set(values.emissionArray);
        aInstanceEmissive.needsUpdate = true;
    }

    if (opacity1 && values.opacityArray) {
        opacity1.array.set(values.opacityArray);
        opacity1.needsUpdate = true;
    }

    // Update non-attribute properties
    if (values.lifeTime) {
        particle.lifeTime = values.lifeTime;
    }
    if (values.directionArray) {
        const directionProp = particle.properties.get("direction");
        if (directionProp && directionProp.array) {
            directionProp.array.set(values.directionArray);
        }
    }
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