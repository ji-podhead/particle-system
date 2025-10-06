function postMsgFunction(index, values) {
    const particle = particles[index];
    if (!particle || !particle.instance) {
        console.error(`Particle or particle instance at index ${index} is not available.`);
        return;
    }

    particle.instance.instanceCount = values.instanceCount;
    const attributes = particle.instance.attributes;

    if (values.lifeTimes) {
        particle.properties.get("lifeTime").array.set(values.lifeTimes);
    }

    // The main data payload from the worker's updateSimulation
    if (values.transform) {
        try {
            attributes.boxPosition.array.set(values.transform);
            attributes.boxPosition.needsUpdate = true;

            attributes.rotation.array.set(values.rotation);
            attributes.rotation.needsUpdate = true;

            attributes.boxSize.array.set(values.scale);
            attributes.boxSize.needsUpdate = true;

            if (values.color) {
                attributes.aInstanceColor.array.set(values.color);
                attributes.aInstanceColor.needsUpdate = true;
            }
            if (values.emission) {
                attributes.aInstanceEmissive.array.set(values.emission);
                attributes.aInstanceEmissive.needsUpdate = true;
            }
            if (values.opacity) {
                attributes.opacity1.array.set(values.opacity);
                attributes.opacity1.needsUpdate = true;
            }
            if (values.direction) {
                particle.properties.get("direction").array.set(values.direction);
            }
             if (values.lifeTime) {
                particle.properties.get("lifeTime").array.set(values.lifeTime);
            }

        } catch (error) {
            console.error(`Error updating particle attributes for index ${index}:`, error);
            console.error(`Received values:`, values);
        }
    } else if (!values.lifeTimes) { // Avoid warning if only lifeTimes is sent
        console.warn("worker received no values to update");
    }
}
const workers = []
const events = []
const particles = []
export function startParticleWorker(particle, worker, config = {}) {
    return new Promise((resolve) => {
        particles.push(particle);
        let index = particles.length - 1;
        particle.isWorker = true;
        particle.workerIndex = index;
        workers.push(new Worker(worker));

        const eventHandler = event => {
            if (event.data.task === 'initialized') {
                resolve(index);
            } else {
                postMsgFunction(event.data.index, event.data.values);
            }
        };

        events.push(eventHandler);
        workers[index].addEventListener("message", events[index]);
        updateAllWorkerValues(index, config);
    });
}

function _sendWorkerUpdate(index, type, data) {
    workers[index].postMessage({
        task: "update",
        type: type,
        data: data
    });
}

export function updateWorkerProperty(index, propertyName, value) {
    _sendWorkerUpdate(index, "property", { propertyName, value });
}

export function updateWorkerSourceAttribute(index, attributeName, values) {
    _sendWorkerUpdate(index, "sourceAttribute", { attributeName, values });
}

export function updateWorkerAttributeOverLifeTime(index, attributeName, values) {
    _sendWorkerUpdate(index, "attributeOverLifeTime", { attributeName, values });
}

export function updateWorkerPropertiesMapEntry(index, key, value) {
    _sendWorkerUpdate(index, "propertiesMapEntry", { key, value });
}

export function updateWorkerParticleAttribute(index, attributeName, particleIndex, value) {
    _sendWorkerUpdate(index, "particleAttribute", { attributeName, particleIndex, value });
}

export function workerBurst(index, amount, position) {
    workers[index].postMessage({
        task: 'burst',
        value: {
            amount: amount,
            position: position
        }
    });
}

export function workerResetParticle(index, particleIndex) {
    workers[index].postMessage({
        task: 'resetParticle',
        value: {
            index: particleIndex,
        }
    });
}

export function setWorkerMaxLifeTimes(index, lifetime) {
    workers[index].postMessage({
        task: 'setMaxLifeTimes',
        value: { lifetime: lifetime }
    });
}


export function resetWorkerParticles(index) {
    workers[index].postMessage({ task: "resetParticles" });
}

export function workerResetAllParticles(index) {
    workers[index].postMessage({ task: "resetAllParticles" });
}

export function updateAllWorkerValues(index, config = {}) {
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
export function workerUpdateSimulation(index, delta,respawn,kill) {
    workers[index].postMessage({ task: "updateSimulation", value: { delta: delta, respawn:respawn,kill:kill}});

}

export function setWorkerEventHandler(index, handlerName, functionKey, args) {
    workers[index].postMessage({
        task: "setEventHandler",
        value: { handlerName, functionKey, args }
    });
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
