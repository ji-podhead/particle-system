import { FontLoader } from 'three/addons/loaders/FontLoader.js';

const fontLoader = new FontLoader();

/**
 * Loads a font from the specified URL.
 * @param {string} url - The URL of the font file.
 * @returns {Promise<THREE.Font>} - A promise that resolves with the loaded font.
 */
export function loadFont(url) {
    return new Promise((resolve, reject) => {
        fontLoader.load(url, resolve, undefined, reject);
    });
}