/* js/audio.js - Cinnamon Bakery Audio Controller */

let isMuted = false;
// Music defaults to on. It can't actually start playing until the player's
// first real tap/click, though — browsers block audio-with-sound before a
// user gesture — so startMusic() below is called from that first click.
let isMusicPlaying = true;

// Call this when the bake button is pressed down. Unlike playSound(), this
// plays the actual shared Audio element (not a throwaway clone) so it can be
// stopped later - and sets it to loop, so it sustains for as long as the
// player holds the button rather than always playing to its full length.
function startOvenHiss() {
    const hiss = ASSETS.sounds['oven-hiss'];
    if (isMuted || !hiss) return;
    hiss.loop = true;
    hiss.volume = 0.5;
    hiss.currentTime = 0;
    hiss.play().catch(e => console.warn("Failed to play oven-hiss:", e));
}

// Call this the moment holding stops (release, bake completing, changing
// steps, etc.) so the hiss never keeps playing past the actual hold.
function stopOvenHiss() {
    const hiss = ASSETS.sounds['oven-hiss'];
    if (!hiss) return;
    hiss.pause();
    hiss.currentTime = 0;
}

function playSound(key, volume = 1.0) {
    if (isMuted || !ASSETS.sounds[key]) return;
    
    const soundClone = ASSETS.sounds[key].cloneNode();
    soundClone.volume = volume;
    soundClone.play().catch(e => console.warn("Failed to play sound:", e));
}

function toggleMute() {
    isMuted = !isMuted;
    document.getElementById('muteBtn').textContent = isMuted ? '🔇 SFX: OFF' : '🔊 SFX: ON';
    if (isMuted) stopOvenHiss(); // in case they mute while mid-hold
    if (!isMuted) playSound('click-tab', 0.5);
}

function toggleMusic() {
    isMusicPlaying = !isMusicPlaying;
    const bgm = ASSETS.sounds['bgm'];
    const musicBtn = document.getElementById('musicBtn');
    
    musicBtn.textContent = isMusicPlaying ? '🎵 Music: ON' : '🔇 Music: OFF';
    
    if (!bgm) return;
    
    if (isMusicPlaying) {
        bgm.loop = true;
        bgm.volume = 0.3;
        bgm.play().catch(e => {
            console.warn("Failed to start music:", e);
            isMusicPlaying = false;
            musicBtn.textContent = '🔇 Music: OFF';
        });
    } else {
        bgm.pause();
    }
}

// Call this once, from the very first click/tap on the page (e.g. the
// "Open the bakery" button), to actually start music playing by default.
// A page-load attempt would be silently blocked by autoplay restrictions,
// but a real user gesture like this one satisfies them.
function startMusic() {
    if (!isMusicPlaying) return;
    const bgm = ASSETS.sounds['bgm'];
    if (!bgm) return;
    bgm.loop = true;
    bgm.volume = 0.3;
    bgm.play().catch(e => {
        console.warn("Failed to start music:", e);
        isMusicPlaying = false;
        document.getElementById('musicBtn').textContent = '🔇 Music: OFF';
    });
}