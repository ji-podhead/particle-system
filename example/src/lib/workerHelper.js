export class WorkerManager {
    constructor(particle) {
        this.particle = particle;
        this.worker = new Worker('worker.bundle.js');
        this.worker.addEventListener('message', this.handleMessage.bind(this));

        // Initial setup message
        this.callMethod('init', { index: 0 }); // Assuming single particle system for now

        // Pass all serializable properties to the worker
        this.callMethod('updateDefaultValues', {
            object: {
                amount: this.particle.amount,
                noise: this.particle.noise,
                pointCloud: this.particle.pointCloud,
                startPositionFromgeometry: this.particle.startPositionFromgeometry,
                forcefield: this.particle.forcefield,
                force: this.particle.force,
                forceFieldForce: this.particle.forceFieldForce,
                // Convert Maps to plain objects for serialization
                attributesoverLifeTime: Object.fromEntries(this.particle.attributesoverLifeTime),
                properties: {
                    ...Object.fromEntries(this.particle.properties),
                    sourceValues: Object.fromEntries(this.particle.properties.get("sourceValues"))
                },
                spawFrequency: this.particle.spawFrequency,
                maxSpawnCount: this.particle.maxSpawnCount,
                spawnOverTime: this.particle.spawnOverTime,
                burstCount: this.particle.burstCount,
                instanceCount: this.particle.instance.instanceCount,
                spawnOfset: this.particle.spawnOfset
            }
        });
    }

    handleMessage(event) {
        const { values } = event.data;
        if (!values) return;

        const { instance } = this.particle;
        instance.instanceCount = values.instanceCount;

        // Update buffer attributes on the main thread
        if (values.transform) {
            instance.attributes.boxPosition.array.set(values.transform);
            instance.attributes.boxPosition.needsUpdate = true;
        }
        if (values.rotation) {
            instance.attributes.rotation.array.set(values.rotation);
            instance.attributes.rotation.needsUpdate = true;
        }
        if (values.scale) {
            instance.attributes.boxSize.array.set(values.scale);
            instance.attributes.boxSize.needsUpdate = true;
        }
        if (values.color) {
            this.particle.properties.get('color').array.set(values.color);
            this.particle.properties.get('color').attribute.needsUpdate = true;
        }
        if (values.emission) {
            this.particle.properties.get('emission').array.set(values.emission);
            this.particle.properties.get('emission').attribute.needsUpdate = true;
        }
        if (values.opacity) {
            this.particle.properties.get('opacity').array.set(values.opacity);
            this.particle.properties.get('opacity').attribute.needsUpdate = true;
        }

        // Also update the CPU-side arrays
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

// This function can be used for cleanup
export function ParticleAutoDisposal(managers) {
    window.addEventListener("beforeunload", function(event) {
        managers.forEach(manager => manager.dispose());
    });
}