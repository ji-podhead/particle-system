function serializeState(particle) {
    const serializableProperties = {};
    for (const [key, value] of particle.properties.entries()) {
        if (key === 'sourceValues') {
            serializableProperties[key] = Object.fromEntries(value);
        } else if (value.array) {
            serializableProperties[key] = { array: value.array };
        }
    }

    return {
        amount: particle.amount,
        noise: particle.noise,
        force: particle.force,
        attributesoverLifeTime: Object.fromEntries(particle.attributesoverLifeTime),
        properties: serializableProperties,
        spawFrequency: particle.spawFrequency,
        maxSpawnCount: particle.maxSpawnCount,
        spawnOverTime: particle.spawnOverTime,
        burstCount: particle.burstCount,
        instanceCount: particle.instance.instanceCount,
    };
}


export class WorkerManager {
    constructor(particle) {
        this.particle = particle;
        this.worker = new Worker('worker.bundle.js');
        this.worker.addEventListener('message', this.handleMessage.bind(this));

        this.callMethod('init', { index: 0 });
        this.callMethod('updateDefaultValues', {
            object: serializeState(this.particle)
        });
    }

    handleMessage(event) {
        const { values } = event.data;
        if (!values) return;

        const { instance } = this.particle;
        instance.instanceCount = values.instanceCount;

        const attributeMap = {
            transform: instance.attributes.boxPosition,
            rotation: instance.attributes.rotation,
            scale: instance.attributes.boxSize,
            color: this.particle.properties.get('color').attribute,
            emission: this.particle.properties.get('emission').attribute,
            opacity: this.particle.properties.get('opacity').attribute,
        };

        for (const key in values) {
            if (values.hasOwnProperty(key) && attributeMap[key]) {
                const attribute = attributeMap[key];
                if (attribute.array) {
                    attribute.array.set(values[key]);
                }
                if (attribute.needsUpdate !== undefined) {
                    attribute.needsUpdate = true;
                }
            }
        }

        // Also update the CPU-side arrays that are not THREE.js attributes
        this.particle.properties.get('direction').array.set(values.direction);
        this.particle.properties.get('lifeTime').array.set(values.lifeTime);
    }

    callMethod(task, value) {
        this.worker.postMessage({ task, value });
    }

    dispose() {
        console.log("Terminating particle worker.");
        this.worker.terminate();
    }
}

export function ParticleAutoDisposal(managers) {
    window.addEventListener("beforeunload", function(event) {
        if(Array.isArray(managers)) {
            managers.forEach(manager => manager.dispose());
        }
    });
}