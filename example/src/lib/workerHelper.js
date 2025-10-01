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
        pointCloud: particle.pointCloud,
        startPositionFromgeometry: particle.startPositionFromgeometry,
        forcefield: particle.forcefield,
        force: particle.force,
        forceFieldForce: particle.forceFieldForce,
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
        this.worker = new Worker('/dist/worker.bundle.js'); // Correct path to the bundled worker
        this.worker.addEventListener('message', this.handleMessage.bind(this));

        // Initial setup message
        this.callMethod('init', { index: 0 });

        // Pass all serializable properties to the worker
        this.callMethod('updateDefaultValues', {
            object: serializeState(this.particle)
        });
    }

    handleMessage(event) {
        const { values } = event.data;
        if (!values) return;

        const { instance } = this.particle;
        instance.instanceCount = values.instanceCount;

        // Update buffer attributes on the main thread
        const attributeMap = {
            transform: instance.attributes.boxPosition,
            rotation: instance.attributes.rotation,
            scale: instance.attributes.boxSize,
            color: this.particle.properties.get('color').attribute,
            emission: this.particle.properties.get('emission').attribute,
            opacity: this.particle.properties.get('opacity').attribute,
            direction: this.particle.properties.get('direction'), // Not a buffer attribute, but needs update
            lifeTime: this.particle.properties.get('lifeTime'), // Not a buffer attribute, but needs update
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
    }

    callMethod(task, value) {
        this.worker.postMessage({ task, value });
    }

    dispose() {
        console.log("Terminating particle worker.");
        this.worker.terminate();
    }
}

// This function can be used for cleanup
export function ParticleAutoDisposal(managers) {
    window.addEventListener("beforeunload", function(event) {
        if(Array.isArray(managers)) {
            managers.forEach(manager => manager.dispose());
        }
    });
}