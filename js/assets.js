/* js/assets.js - Cinnamon Bakery Asset Manager & Game Data */

// Global object to hold our loaded images and audio instances
const ASSETS = {
    sprites: {},
    sounds: {}
};

/* ---------- Game Data ---------- */

const CRUSTS = [
    { n: 'Flaky Butter', i: '🧈', spriteKey: 'crust-butter' },
    { n: 'Spiced Graham', i: '🌾', spriteKey: 'crust-graham' },
    { n: 'Dark Cocoa', i: '🍫', spriteKey: 'crust-cocoa' }
];

const FILLINGS = [
    { n: 'Spiced Pumpkin', i: '🎃', spriteKey: 'fill-pumpkin' },
    { n: 'Honey Apple', i: '🍎', spriteKey: 'fill-apple' },
    { n: 'Wild Blackberry', i: '🍇', spriteKey: 'fill-blackberry' },
    { n: 'Tart Cherry', i: '🍒', spriteKey: 'fill-cherry' }
];

const LIDS = [
    { n: 'None', i: '🚫', spriteKey: null },
    { n: "Jack-o'-Lantern", i: '🎃', spriteKey: 'lid-jack' },
    { n: 'Lattice', i: '🕸️', spriteKey: 'lid-lattice' },
    { n: 'Star Field', i: '✨', spriteKey: 'lid-stars' }
];

const DONENESS = [
    ['Light', 38, 48, '🌤️'],
    ['Golden', 62, 72, '🔥'],
    ['Dark', 85, 95, '🌑']
];

const CUSTOMERS = [
    ['Finn Fox', '🦊', "I'd love a crisp autumn slice!"],
    ['Hazel Hedgehog', '🦔', 'Extra warm and sweet, please!'],
    ['Barnaby Bear', '🐻', 'A big hearty pie for a cozy night.'],
    ['Ollie Owl', '🦉', 'A golden masterpiece for the harvest moon!'],
    ['Willow the Witch', '🧙', 'Something enchanting for my cauldron supper.'],
    ['Sir Acorn', '🐿️', 'Hurry, the first frost is coming!'],
    ['Moss the Deer', '🦌', 'Make it pretty, I am showing it off.'],
    ['Pumpkin King', '🎃', 'Only the finest for my royal patch.']
];

const DAILY_QUOTES = [
    "A pie is a hug you can eat.",
    "Baking is love made visible.",
    "Keep calm and bake on.",
    "Autumn carries more gold in its pocket than all the other seasons.",
    "Life is what you bake of it.",
    "Good apple pies are a considerable part of our domestic happiness.",
    "Count the memories, not the calories.",
    "Pie makes everything better.",
    "Stressed is desserts spelled backwards.",
    "Bake the world a better place."
];

const DAILY_MESSAGES = [
    'Welcome to Cinnamon Bakery! Take your time, get used to the recipes.',
    'Customers now lose patience. Watch the timer!',
    'The order text is gone. You must match the picture!',
    'The oven thermometer broke! Watch the crust color closely.',
    'Infinite Bake-off! Survive as long as you can.'
];

const PATIENCE_LEVELS = [0, 60, 45, 35, 25]; 

/* ---------- Asset Manifests ---------- */

const spriteManifest = {
    // Crusts
    'crust-butter': 'assets/sprites/crusts/crust-butter.png',
    'crust-graham': 'assets/sprites/crusts/crust-graham.png',
    'crust-cocoa': 'assets/sprites/crusts/crust-cocoa.png',
    
    // Fillings
    'fill-pumpkin': 'assets/sprites/fillings/fill-pumpkin.png',
    'fill-apple': 'assets/sprites/fillings/fill-apple.png',
    'fill-blackberry': 'assets/sprites/fillings/fill-blackberry.png',
    'fill-cherry': 'assets/sprites/fillings/fill-cherry.png',
    
    // Lids
    'lid-jack': 'assets/sprites/lids/lid-jack.png',
    'lid-maple': 'assets/sprites/lids/lid-maple.png',
    'lid-lattice': 'assets/sprites/lids/lid-lattice.png',
    'lid-stars': 'assets/sprites/lids/lid-stars.png',
    
    // UI Elements (Optional for later expansion)
    'plate': 'assets/sprites/ui/plate.png',

    // Leaf Sprites for Background
    'leaf-1': 'assets/sprites/bg/leaf-1.png',
    'leaf-2': 'assets/sprites/bg/leaf-2.png',
    'leaf-3': 'assets/sprites/bg/leaf-3.png'
};

const soundManifest = {
    'click-crust': 'assets/audio/sfx/click-crust.wav',
    'click-fill': 'assets/audio/sfx/click-fill.wav',
    'click-lid': 'assets/audio/sfx/click-lid.wav',
    'click-tab': 'assets/audio/sfx/click-tab.wav',
    'oven-hiss': 'assets/audio/sfx/oven-hiss.wav',
    'oven-done': 'assets/audio/sfx/oven-done.wav',
    'trash': 'assets/audio/sfx/trash.wav',
    'success-perfect': 'assets/audio/sfx/success-perfect.wav',
    'success-good': 'assets/audio/sfx/success-good.wav',
    'fail': 'assets/audio/sfx/fail.wav',
    'bgm': 'assets/audio/bgm/autumn-acoustic.wav'
};

/* ---------- Preloader Logic ---------- */

/**
 * Loads all assets into memory.
 * @param {Function} onProgress - Callback fired as assets load, passing a percentage (0 to 1).
 * @param {Function} onComplete - Callback fired when all assets are fully loaded.
 */
function preloadAssets(onProgress, onComplete) {
    const spriteKeys = Object.keys(spriteManifest);
    const soundKeys = Object.keys(soundManifest);
    const totalAssets = spriteKeys.length + soundKeys.length;
    let loadedAssets = 0;

    // Helper to update progress and check completion
    const assetLoaded = () => {
        loadedAssets++;
        if (onProgress) onProgress(loadedAssets / totalAssets);
        if (loadedAssets === totalAssets) {
            if (onComplete) onComplete();
        }
    };

    // Wraps assetLoaded so it only ever fires once per asset, even if both
    // the real load event and the timeout fallback below end up calling it.
    const settleOnce = () => {
        let settled = false;
        return () => {
            if (settled) return;
            settled = true;
            assetLoaded();
        };
    };

    // Edge case: If there are no assets to load
    if (totalAssets === 0) {
        if (onComplete) onComplete();
        return;
    }

    // Safety net: some mobile browsers won't buffer audio (so 'canplaythrough'
    // never fires) until the player has interacted with the page. Rather than
    // hang on the loading screen forever, give up on a slow asset after this
    // long and move on; it'll still load lazily once it's actually needed.
    const ASSET_TIMEOUT_MS = 8000;

    // Load Sprites
    spriteKeys.forEach(key => {
        const img = new Image();
        const settle = settleOnce();
        // Attach handlers BEFORE setting src. Assigning src first risks the
        // load firing (e.g. for an already browser-cached image) before a
        // handler is listening, which would silently stall the preloader.
        img.onload = settle;
        img.onerror = () => {
            console.error(`Failed to load sprite: ${spriteManifest[key]}`);
            settle(); // Still continue so the game doesn't hang forever
        };
        setTimeout(settle, ASSET_TIMEOUT_MS);
        img.src = spriteManifest[key];
        ASSETS.sprites[key] = img;
    });

    // Load Sounds
    soundKeys.forEach(key => {
        const audio = new Audio();
        const settle = settleOnce();
        // For Audio, 'canplaythrough' indicates it's ready to play without buffering
        audio.oncanplaythrough = settle;
        audio.onerror = () => {
            console.warn(`Failed to load or decode audio: ${soundManifest[key]} - Note: Some browsers block audio loading until interaction.`);
            settle(); // Continue on error
        };
        setTimeout(settle, ASSET_TIMEOUT_MS);
        audio.src = soundManifest[key];

        // Some browsers won't fire canplaythrough reliably without interaction,
        // so we force a load() call.
        audio.load();

        ASSETS.sounds[key] = audio;
    });
}