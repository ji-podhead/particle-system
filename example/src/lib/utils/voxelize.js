import * as THREE from 'three';

const raycaster = new THREE.Raycaster();
const _position = new THREE.Vector3();
const _direction = new THREE.Vector3(0, -1, 0); // Raycast downwards

/**
 * Checks if a given position is inside a mesh.
 * @param {THREE.Vector3} pos - The position to check.
 * @param {THREE.Mesh} mesh - The mesh to check against.
 * @returns {boolean} - True if the position is inside the mesh, false otherwise.
 */
function isInsideMesh(pos, mesh) {
    raycaster.set(pos, _direction);
    const intersections = raycaster.intersectObject(mesh, false);
    // If the number of intersections is odd, the point is inside.
    return intersections.length % 2 === 1;
}

/**
 * Voxelizes a geometry based on a specified grid size.
 * @param {THREE.BufferGeometry} geometry - The geometry to voxelize.
 * @param {number} gridSize - The size of each voxel, used as the grid step.
 * @returns {Float32Array} - An array of voxel positions.
 */
export function voxelize(geometry, gridSize) {
    const voxels = [];
    
    // Ensure the geometry has a bounding box.
    if (!geometry.boundingBox) {
        geometry.computeBoundingBox();
    }

    // The raycaster requires a mesh, so we create a temporary one.
    // The material must be DoubleSide for the raycaster to detect intersections from inside the mesh.
    const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.updateMatrixWorld(); // Ensure the mesh's matrix is up to date

    const box = geometry.boundingBox;

    // Iterate through the bounding box using the grid size as a step.
    for (let i = box.min.x; i < box.max.x; i += gridSize) {
        for (let j = box.min.y; j < box.max.y; j += gridSize) {
            for (let k = box.min.z; k < box.max.z; k += gridSize) {
                _position.set(i, j, k);
                if (isInsideMesh(_position, mesh)) {
                    voxels.push(_position.x, _position.y, _position.z);
                }
            }
        }
    }

    return new Float32Array(voxels);
}