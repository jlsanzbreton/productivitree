# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Seasonal Theme Customization

`constants.ts` centralizes palette and style options for the tree. Edit the following exports to personalize the look of each season:

- **`TREE_PALETTE`** – base colors and gradients for trunk and leaves.
- **`TREE_SIZES`** – default sizes for trunk width and leaf variants.
- **`TREE_TEXTURES`** – SVG textures applied to trunk and foliage.
- **`treeThemes`** – per-season overrides (spring, summer, autumn, winter) including sky and branch colors.

Animations such as wind sway can be tuned via the `windIntensity` option in `OrganicTreeRenderer`.
