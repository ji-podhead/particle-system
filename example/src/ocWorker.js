import { updateSimulation, resetParticle } from './lib/_simulation.js';

class ParticleWorkerLogic {
    constructor(initialData) {
        this.index = initialData.index;
        this.object1 = {};
        this.simulationState = {
            waitingTime: 0,
            killCount: 0,
        };
    }

    // Updates the worker's state with data from the main thread
    updateDefaultValues(data) {
        const propertiesAsMap = new Map(Object.entries(data.object.properties));
        if (propertiesAsMap.has("sourceValues")) {
            propertiesAsMap.set("sourceValues", new Map(Object.entries(propertiesAsMap.get("sourceValues"))));
        }
        data.object.properties = propertiesAsMap;
        data.object.attributesoverLifeTime = new Map(Object.entries(data.object.attributesoverLifeTime));
        this.object1 = { ...this.object1, ...data.object };
    }

    // --- Proxied Methods ---
    setMaxLifeTime(data) { this.object1.properties.get("sourceValues").set("maxLifeTime", data.maxLifeTime); }
    setNoise(data) { this.object1.noise = data.strength; }
    setForce(data) { this.object1.force = data.force.values; this.object1.properties.get("sourceValues").set("force", data.force); }
    setBurstCount(data) { this.object1.burstCount = data.count; }
    setSpawnFrequency(data) { this.object1.spawFrequency = data.freq; }
    setMaxSpawnCount(data) { this.object1.maxSpawnCount = data.count; }
    setSpawnOverTime(data) { this.object1.spawnOverTime = data.value; }
    setSourceAttributes(data) { this.object1.properties.get("sourceValues").set(data.attribute, data.data); }
    setAttributeOverLifeTime(data) { this.object1.attributesoverLifeTime.set(data.attribute, data.data); }

    startPS() {
        if (!this.object1 || !this.object1.properties) return;
        this.object1.instanceCount = this.object1.burstCount;
    }

    updateSimulation(data) {
        if (!this.object1 || !this.object1.properties) return;

        this.simulationState = updateSimulation(this.object1, data.delta, this.simulationState);

        self.postMessage({
            index: this.index,
            values: {
                transform: this.object1.properties.get("transform").array,
                rotation: this.object1.properties.get("rotation").array,
                scale: this.object1.properties.get("scale").array,
                color: this.object1.properties.get("color").array,
                emission: this.object1.properties.get("emission").array,
                opacity: this.object1.properties.get("opacity").array,
                direction: this.object1.properties.get("direction").array,
                lifeTime: this.object1.properties.get("lifeTime").array,
                instanceCount: this.object1.instanceCount,
            },
        });
    }
}

let workerLogic;

self.onmessage = function (event) {
    const { task, value } = event.data;

    if (task === 'init') {
        workerLogic = new ParticleWorkerLogic(value);
        return;
    }

    if (workerLogic && typeof workerLogic[task] === 'function') {
        workerLogic[task](value);
    } else {
        console.error(`Task not found in worker: ${task}`);
    }
};