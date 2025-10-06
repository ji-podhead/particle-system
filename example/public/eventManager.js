function setLifetimeBasedOnComponent(particleAttributes, factor, component = 'y') {
    const positions = particleAttributes.transform;
    const lifetimes = particleAttributes.lifeTime;
    const numParticles = positions.length / 3;

    for (let i = 0; i < numParticles; i++) {
        let posComponent;
        switch (component) {
            case 'x':
                posComponent = positions[i * 3];
                break;
            case 'y':
                posComponent = positions[i * 3 + 1];
                break;
            case 'z':
                posComponent = positions[i * 3 + 2];
                break;
            default:
                posComponent = positions[i * 3 + 1]; // Default to y
        }
        
        const maxLifetime = Math.abs(posComponent) * factor + 0.5;
        lifetimes[i * 2 + 1] = maxLifetime;
        lifetimes[i * 2] = Math.random() * maxLifetime;
    }
}

export const eventFunctions = new Map([
    ['setLifetimeBasedOnComponent', setLifetimeBasedOnComponent]
]);
