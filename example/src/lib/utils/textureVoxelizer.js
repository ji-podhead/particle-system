import * as THREE from 'three';

export function textureVoxelizer(mesh, resolution) {
    mesh.updateMatrixWorld();
    const box = new THREE.Box3().setFromObject(mesh);
    const size = box.getSize(new THREE.Vector3());

    // Normalize the model to a consistent size to manage performance
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 1.0 / maxDim;
    mesh.scale.multiplyScalar(scale);
    mesh.updateMatrixWorld();

    // Recalculate the bounding box after scaling
    const scaledBox = new THREE.Box3().setFromObject(mesh);
    const scaledSize = scaledBox.getSize(new THREE.Vector3());

    const positions = [];
    const colors = [];
    const step = 1 / resolution;

    const raycaster = new THREE.Raycaster();
    const material = mesh.material;
    const texture = material.map;

    if (!texture) {
        console.error("The model's material must have a texture map for color sampling.");
        return { positions: new Float32Array(), colors: new Float32Array() };
    }

    for (let x = 0; x < scaledSize.x; x += step) {
        for (let y = 0; y < scaledSize.y; y += step) {
            for (let z = 0; z < scaledSize.z; z += step) {
                const point = new THREE.Vector3(
                    scaledBox.min.x + x,
                    scaledBox.min.y + y,
                    scaledBox.min.z + z
                );

                const direction = new THREE.Vector3(0, 0, 1);
                raycaster.set(point, direction);
                const intersects = raycaster.intersectObject(mesh, false);

                if (intersects.length > 0 && intersects.length % 2 === 1) {
                    // Point is inside the mesh
                    const intersection = intersects[0];
                    if (intersection.uv) {
                        positions.push(point.x, point.y, point.z);

                        const uv = intersection.uv;
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        const image = texture.image;
                        canvas.width = image.width;
                        canvas.height = image.height;
                        context.drawImage(image, 0, 0, image.width, image.height);

                        const px = context.getImageData(uv.x * image.width, (1 - uv.y) * image.height, 1, 1).data;
                        colors.push(px[0] / 255, px[1] / 255, px[2] / 255);
                    }
                }
            }
        }
    }

    return {
        positions: new Float32Array(positions),
        colors: new Float32Array(colors)
    };
}