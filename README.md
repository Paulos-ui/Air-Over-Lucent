# Dead Air Over Lucent

A browser-based 3D driving game. Play as harbour courier Mara Vale and guide Lucent Bay's last ferry to safety by tuning in three emergency transmissions as the storm breaks at dawn.

## Play

Open `index.html` in a modern browser. The game uses compatibility graphics automatically when its WebGL renderer cannot start. Double-clicking the file also works offline. Use the **Sound off** button to start the original synth score and sound effects.

- PC: WASD or Arrow keys to drive, Space to drift, R to reset, Escape to pause.
- Phone: hold **Drive** with your right thumb and steer with your left. Hold **Brake** to slow down or reverse. Tap the pause control to restart. Landscape gives you a wider view.
- Mission: drive through each cyan beacon. Sweep the radio dial until you see **Locked**, then press **Lock signal**. You can drag the dial or use the plus and minus buttons.
- Graphics: use **Low** on slower devices, **Medium** for general play, and **High** for higher render resolution and environment reflections. Choose the graphics button again after High to switch to Compatibility mode.

## Deploy from GitHub to Vercel

1. Push the contents of this folder to a GitHub repo. Put `index.html` at the repository root.
2. Import the repo in Vercel. Use the **Other** framework preset, enable the Build Command override, and leave its field blank. Leave the Output Directory at its default and use the repository root as the Root Directory. See [Vercel’s static build settings](https://vercel.com/docs/builds/configure-a-build#skip-build-step).
3. Deploy, then open the live URL on desktop and on iPhone and Android. Test the first radio stop, steering while accelerating, audio after tapping the sound button, and play at Low graphics.

Everything needed to play is bundled locally. The folder has no npm install step, external assets, API keys, or backend. Three.js is distributed under the MIT license in `three-LICENSE.txt`.

## Art assets

The local `assets/` folder contains optimized WebP artwork made with built-in ImageGen. Keep the folder next to `index.html` when publishing. Both renderers use the artwork.

Prompts covered a straight-on six-material atlas (wet asphalt, stained concrete, weathered brick, office glass, corrugated steel, granite paving), a transparent rain-soaked petrol-blue coupe from the chase-camera angle, a natural portrait of Mara Vale inside her car, and a sky-only coastal sunrise through storm clouds.
