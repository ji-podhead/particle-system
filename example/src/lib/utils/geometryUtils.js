import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

/**
 * Generates TextGeometry for an array of letters with specified parameters.
 * @param {string[]} letters - An array of strings to generate geometries for.
 * @param {THREE.Font} font - The loaded THREE.Font object.
 * @param {number} size - The size of the text.
 * @param {number} height - The height (depth) of the text.
 * @param {number} curveSegments - The number of segments for curves.
 * @param {boolean} bevelEnabled - Whether beveling is enabled.
 * @returns {THREE.TextGeometry[]} - An array of generated TextGeometry objects.
 */
export function generateTextGeometries(letters, font, size, height, curveSegments, bevelEnabled) {
    if (!font || !font.generateShapes) {
        console.error("Invalid font provided for geometry generation.");
        return [];
    }

    return letters.map(letter => {
        const textGeometry = new TextGeometry(letter, {
            font: font,
            size: size,
            height: height,
            curveSegments: curveSegments,
            bevelEnabled: bevelEnabled,
        });
        textGeometry.computeBoundingBox();
        textGeometry.center();
        return textGeometry;
    }).filter(g => g !== null);
}
