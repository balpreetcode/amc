// Test scene extraction logic
const testStory = `**🎞️ Scene 1 (0–5 sec)**
The sun rises over the sacred land of Kurukshetra, casting golden rays on the battlefield. Armies stand poised, chariots gleaming, as the conch shells resonate—a prelude to destiny. In the center, Arjuna, the valiant son of Pandu, grips his bow, his heart heavy with turmoil. Beside him, Lord Krishna, divine charioteer, gazes with serene wisdom.

**⏱️ Scene 2 (5–20 sec)**
Arjuna's gaze sweeps over the opposing ranks, spotting beloved kin and venerable teachers. His hands tremble; the bow slips, the arrows fall. "How can I strike my own blood?" he laments, voice cracking with anguish. Krishna, unwavering, speaks of duty: "In battle lies your dharma. A warrior must stand firm. Seek the righteous path." The wind stirs, the tension sharpens. Arjuna nods, resolve igniting like a flame—he rises, bow drawn, ready to fulfill his fateful role.

**⏱️ Scene 3 (20–30 sec)**
As the first arrow flies, a moment freezes—time hangs heavy with the weight of choices made. The clash of fate echoes; the ground trembles beneath the warriors' feet. The camera pulls back, revealing the vastness of the battlefield. The sun sets, casting shadows of conflict—dharma and adharma entwined. A single tear falls from Arjuna's eye, a testament to sacrifice and the burden of righteousness. The screen fades to black, leaving only the sound of the conch, a haunting reminder of the eternal struggle.`;

function extractSceneFromText(rawText) {
    const text = String(rawText || '').trim();
    if (!text) {
        return [];
    }

    // Try to detect and extract scenes with markdown formatting
    // Patterns like: **Scene 1**, **🎞️ Scene 1**, **⏱️ Scene 2**
    // Split by scene markers and reconstruct
    const lines = text.split('\n');
    const segments = [];
    let currentScene = null;
    let currentIndex = -1;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Check if line contains a scene marker like **Scene 1** or **🎞️ Scene 1 (0–5 sec)**
        const sceneMarkerMatch = line.match(/\*\*[^\*]*?(?:Scene|SCENE)\s*(\d+)[^\*]*?\*\*/i);

        if (sceneMarkerMatch) {
            // Save previous scene if exists
            if (currentScene !== null && currentScene.text.trim()) {
                segments.push(currentScene);
            }

            // Extract duration if present
            const durationMatch = line.match(/\((\d+)[–\-](\d+)\s*sec\)/i);
            const duration = durationMatch ? parseInt(durationMatch[2]) - parseInt(durationMatch[1]) : 10;

            currentIndex++;
            currentScene = {
                index: currentIndex,
                text: line.trim(),
                duration: duration
            };
        } else if (currentScene !== null && line.trim()) {
            // Add content to current scene
            currentScene.text += '\n' + line;
        }
    }

    // Don't forget the last scene
    if (currentScene !== null && currentScene.text.trim()) {
        segments.push(currentScene);
    }

    if (segments.length > 0) {
        return segments;
    }

    return [];
}

console.log('Testing scene extraction...\n');
const result = extractSceneFromText(testStory);

console.log(`Found ${result.length} scenes:\n`);
result.forEach((scene, idx) => {
    console.log(`Scene ${idx + 1}:`);
    console.log(`  Index: ${scene.index}`);
    console.log(`  Duration: ${scene.duration} seconds`);
    console.log(`  Text (first 100 chars): ${scene.text.substring(0, 100)}...`);
    console.log('');
});

if (result.length === 3) {
    console.log('✅ SUCCESS: Extracted 3 scenes correctly!');
} else {
    console.log(`❌ FAILURE: Expected 3 scenes, got ${result.length}`);
}
