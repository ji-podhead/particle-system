# JS Particle System

A pure JavaScript particle system library designed for use with Three.js. It supports both single-threaded and multi-threaded (Web Worker) operation for high-performance particle simulations.

## Architecture

This library can be run in two modes: single-threaded and multi-threaded.

### Single-Threaded

In this mode, the particle simulation and rendering both run on the main browser thread. This is the simplest setup and is suitable for less demanding simulations. All calculations happen synchronously within the `requestAnimationFrame` loop.

- **Pros:** Easy to set up and debug. Direct access to all Three.js objects.
- **Cons:** Can block the main thread and cause UI jank or stuttering with a large number of particles.

### Multi-Threaded (Web Worker)
![Bildschirmfoto von 2025-10-01 12-43-05](https://github.com/user-attachments/assets/016ad5ae-ceda-4255-b0d7-b13d1709716c)

For heavy simulations, the system can offload all particle physics calculations to a Web Worker. The main thread is responsible only for initializing the system and updating the Three.js buffer attributes with the data calculated by the worker.

- **Pros:** Keeps the main thread free, resulting in a smooth UI and higher performance for complex scenes.
- **Cons:** More complex setup. Data transfer between the main thread and the worker has overhead. Direct access to Three.js objects from the worker is not possible.

#### Workflow Diagram

```mermaid
    sequenceDiagram
    participant Main Thread
    participant Web Worker

    Main Thread->>Web Worker: Initialize with particle data (properties, attributes, etc.)
    loop Animation Loop
        Main Thread->>Web Worker: Post message: 'updateSimulation' with delta time
        Web Worker->>Main Thread: Run physics calculations...
        Web Worker-->>Main Thread: Post message with updated TypedArrays (position, color, etc.)
        Main Thread->>Main Thread: Receive updated data and copy it to Three.js BufferAttributes
    end
```

## API

The core of the library is the `Particles` class.

### `Particles` Class (Main Thread)

This class, defined in `workerParticles.js`, is used to create and manage a particle system.

**Initialization:**
- `InitializeParticles(scene, mesh, amount, ...)`: Creates an `InstancedBufferGeometry` and initializes the particle system.

**Configuration:**
- `setSourceAttributes(attribute, values, random, minRange, maxRange)`: Sets the initial state of particle attributes (e.g., `color`, `scale`).
- `setAttributeOverLifeTime(attribute, startValues, endValues, ...)`: Defines how an attribute changes over a particle's lifetime.
- `setMaxLifeTime(max, random, min, max)`: Sets the lifetime of particles.
- `setSpawnOverTime(boolean)`: Enables or disables continuous particle spawning.
- `setSpawnFrequency(number)`: Sets the delay between particle spawns.
- `setBurstCount(number)`: Sets how many particles are emitted in a single burst.
- `setForce(vec3)`: Applies a constant global force to all particles.
- `setStartDirection(x, y, z, random, ...)`: Sets the initial velocity direction for particles.
- `...and many more.`

**Updating the Simulation:**
- `updateSimulation(delta, respawn, reset, kill, translate)`: Runs the physics simulation for one frame. **This should only be used in the single-threaded version.**
- `updateValues(attributes)`: Flags the specified buffer attributes for a GPU update.

### Multi-Threaded API (`workerHelper.js`)

The multi-threaded API has been streamlined. Instead of manually managing the worker, you now simply enable it during initialization.

- `InitializeParticles(..., useWorker = false)`: The `InitializeParticles` method now accepts a final boolean argument, `useWorker`. If set to `true`, the `Particles` class will automatically create a `WorkerManager` to handle the simulation in a separate thread.
- `WorkerManager`: This class is now used internally by the `Particles` class to manage the worker's lifecycle and communication. You do not need to interact with it directly.
- `ParticleAutoDisposal(managers)`: A helper that can automatically terminate workers when the page is closed. This is now less critical since the worker is tied to the `Particles` instance.

## Usage Examples

Here are basic examples of how to set up and run the particle system in both modes.

### Single-Threaded Example

This setup is simpler and runs entirely on the main thread. It's ideal for smaller, less intensive particle effects.

```javascript
import * as THREE from 'three';
import { Particles } from './lib'; // Adjust path as needed

// 1. Basic Three.js Scene Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 2. Create a Particle System Instance
const particleSystem = new Particles();
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const mesh = new THREE.Mesh(geometry, material);

// 3. Initialize the Particles
// The last argument `useWorker` is false by default.
particleSystem.InitializeParticles(scene, mesh, 10000, /* other params */, false);

// 4. Configure Particle Properties
particleSystem.setForce([0, -9.8, 0]); // Apply gravity
particleSystem.setMaxLifeTime(5, true, 2, 8); // Random lifetime between 2 and 8 seconds
// ... add other configurations ...
particleSystem.startPS(); // Start the particle system simulation

// 5. Animation Loop
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // Update the simulation on the main thread
    particleSystem.updateSimulation(delta);

    renderer.render(scene, camera);
}

animate();
```

### Multi-Threaded Example

This setup offloads physics calculations to a Web Worker. The API is now almost identical to the single-threaded version.

```javascript
import * as THREE from 'three';
import { Particles } from './lib';

// 1. Basic Three.js Scene Setup (Same as above)
// ...

// 2. Create a Particle System Instance
const particleSystem = new Particles();
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const mesh = new THREE.Mesh(geometry, material);

// 3. Initialize the Particles with the worker enabled
// Simply set the last argument of InitializeParticles to `true`.
particleSystem.InitializeParticles(scene, mesh, 50000, /* other params */, true);

// 4. Configure Particle Properties (Same as single-threaded)
// Any changes made here are automatically synced with the worker.
particleSystem.setForce([0, -9.8, 0]);
particleSystem.setMaxLifeTime(5, true, 2, 8);
// ...
particleSystem.startPS();

// 5. Animation Loop
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // The API call is the same! The Particles class handles delegating to the worker.
    particleSystem.updateSimulation(delta);

    renderer.render(scene, camera);
}

animate();
```

## Data Structures

The particle system relies on `TypedArray`s for efficient data storage and transfer. Key arrays include:

- **`transform` (`Float32Array`):** Stores the (x, y, z) position of each particle. Stride of 3.
- **`scale` (`Float32Array`):** Stores the (x, y, z) scale of each particle. Stride of 3.
- **`rotation` (`Float32Array`):** Stores the (x, y, z) euler rotation of each particle. Stride of 3.
- **`color` (`Uint8Array`):** Stores the (r, g, b) color of each particle. Stride of 3.
- **`lifeTime` (`Float32Array`):** This array is critical for managing particle lifecycles. It has a **stride of 2**. For each particle, it stores:
    - `[0]`: The particle's current age.
    - `[1]`: The particle's maximum lifetime.
    The array is therefore twice the length of the total number of particles.

## Limitations of the Multi-Threaded Version

Due to the nature of Web Workers, certain features that require direct access to main-thread objects (like the Three.js `scene` or `material` objects) are not available in the worker simulation.

- **Complex Callbacks:** Functions like `onParticleBirth` and `onParticleKill` cannot be used with callbacks that reference objects or scope outside of the worker.
- **Child Particle Systems:** The `addChildParticleSysthem` feature is not supported in the multi-threaded version, as it's not possible to pass complex `Particles` objects between threads.
- **Direct Object Manipulation:** Any logic that attempts to directly manipulate the `THREE.InstancedMesh` or its material from within the simulation loop will not work. All visual updates must be achieved by modifying the data in the `TypedArray`s, which are then copied to the GPU buffers on the main thread.
