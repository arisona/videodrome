import type { CompositeFunction } from './ipc-types';

/**
 * Composite Functions Library for Hydra
 *
 * Template variables:
 * - {{levelA}}: Pre-gain for source A (0-1)
 * - {{levelB}}: Pre-gain for source B (0-1)
 * - {{master}}: Master output level (0-2, default 1)
 * - {{param1}}, {{param2}}, etc.: Extra parameters
 *
 * All templates assume:
 * - src(s0) is canvas A
 * - src(s1) is canvas B
 */

// ============================================================================
// BASIC BLEND MODES
// ============================================================================

export const COMPOSITE_FUNCTIONS: Array<CompositeFunction> = [
  {
    id: 'add',
    name: 'Add',
    description: 'Simple additive blending',
    doc: 'Adds the color values of both sources together, creating a brightening effect. This is useful for layering light sources or creating glow effects. Values are clamped at 1.0, so very bright areas will clip to white.\n**Use cases**\n- Combining light sources\n- Creating glow and bloom effects\n- Layering bright elements\n**Parameters**\n- **Level A**: Controls the brightness/gain of source A before blending\n- **Level B**: Controls how much of source B is added to A\n- **Master**: Final output gain control (can exceed 1.0 for overbright effects)',
    category: 'blend',
    params: [
      {
        key: 'levelA',
        label: 'Level A',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'levelB',
        label: 'Level B',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'master',
        label: 'Master',
        type: 'range',
        min: 0.0,
        max: 2.0,
        default: 1.0,
        step: 0.01,
      },
    ],
    codeTemplate: `src(s0)
  .color(() => hydra.vd.levelA, () => hydra.vd.levelA, () => hydra.vd.levelA)
  .add(src(s1), () => hydra.vd.levelB)
  .color(() => hydra.vd.master, () => hydra.vd.master, () => hydra.vd.master)
  .out()`,
  },

  {
    id: 'blend',
    name: 'Blend',
    description: 'Alpha blending (crossfade)',
    doc: 'Smoothly crossfades between source A and source B using linear interpolation. At crossfade=0, only source A is visible; at crossfade=1, only source B is visible; at crossfade=0.5, both sources are mixed equally.\n**Use cases**\n- Smooth transitions between sources\n- Mixing two videos/images\n- Creating dissolve effects\n**Parameters**\n- **Level A**: Pre-gain for source A before crossfading\n- **Crossfade**: Blend ratio (0=all A, 1=all B, 0.5=50/50 mix)\n- **Master**: Final output gain control',
    category: 'blend',
    params: [
      {
        key: 'levelA',
        label: 'Level A',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'crossfade',
        label: 'Crossfade',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 0.5,
        step: 0.01,
      },
      {
        key: 'master',
        label: 'Master',
        type: 'range',
        min: 0.0,
        max: 2.0,
        default: 1.0,
        step: 0.01,
      },
    ],
    codeTemplate: `src(s0)
  .color(() => hydra.vd.levelA, () => hydra.vd.levelA, () => hydra.vd.levelA)
  .blend(src(s1), () => hydra.vd.crossfade)
  .color(() => hydra.vd.master, () => hydra.vd.master, () => hydra.vd.master)
  .out()`,
  },

  {
    id: 'mult',
    name: 'Multiply',
    description: 'Multiplicative blending (darkens)',
    doc: 'Multiplies the color values of both sources together, creating a darkening effect. Black in either source produces black, white has no effect. This mode is useful for applying darkness, shadows, or using one source as a luminance mask.\n**Use cases**\n- Creating shadow effects\n- Darkening scenes\n- Using textures as luminance masks\n- Simulating colored lighting\n**Parameters**\n- **Level A**: Pre-gain for source A\n- **Level B**: Controls how much source B affects the multiplication\n- **Master**: Final output gain (useful to compensate for darkening)',
    category: 'blend',
    params: [
      {
        key: 'levelA',
        label: 'Level A',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'levelB',
        label: 'Level B',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'master',
        label: 'Master',
        type: 'range',
        min: 0.0,
        max: 2.0,
        default: 1.0,
        step: 0.01,
      },
    ],
    codeTemplate: `src(s0)
  .color(() => hydra.vd.levelA, () => hydra.vd.levelA, () => hydra.vd.levelA)
  .mult(src(s1), () => hydra.vd.levelB)
  .color(() => hydra.vd.master, () => hydra.vd.master, () => hydra.vd.master)
  .out()`,
  },

  {
    id: 'sub',
    name: 'Subtract',
    description: 'Subtractive blending',
    doc: 'Subtracts source B from source A, creating a darkening effect with color inversion characteristics. Values below 0 are clamped to black. Unlike `diff`, this is not an absolute difference - it can produce different results depending on which source is brighter.\n**Use cases**\n- Creating inverted/negative effects\n- Removing bright elements\n- Color correction\n- Creating contrast effects\n**Parameters**\n- **Level A**: Pre-gain for source A (the base)\n- **Level B**: Controls how much of B is subtracted from A\n- **Master**: Final output gain',
    category: 'blend',
    params: [
      {
        key: 'levelA',
        label: 'Level A',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'levelB',
        label: 'Level B',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'master',
        label: 'Master',
        type: 'range',
        min: 0.0,
        max: 2.0,
        default: 1.0,
        step: 0.01,
      },
    ],
    codeTemplate: `src(s0)
  .color(() => hydra.vd.levelA, () => hydra.vd.levelA, () => hydra.vd.levelA)
  .sub(src(s1), () => hydra.vd.levelB)
  .color(() => hydra.vd.master, () => hydra.vd.master, () => hydra.vd.master)
  .out()`,
  },

  {
    id: 'diff',
    name: 'Difference',
    description: 'Absolute difference between sources',
    doc: 'Calculates the absolute difference between source A and source B: `|A - B|`. This creates high-contrast, inverted effects where similar colors become dark and different colors become bright. Identical content produces black.\n**Use cases**\n- Motion detection effects\n- Creating psychedelic/inverted visuals\n- Highlighting differences between sources\n- Edge detection when used with offset copies\n**Parameters**\n- **Level A**: Pre-gain for source A\n- **Level B**: Controls the intensity of source B in the difference calculation\n- **Master**: Final output gain',
    category: 'blend',
    params: [
      {
        key: 'levelA',
        label: 'Level A',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'levelB',
        label: 'Level B',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'master',
        label: 'Master',
        type: 'range',
        min: 0.0,
        max: 2.0,
        default: 1.0,
        step: 0.01,
      },
    ],
    codeTemplate: `src(s0)
  .color(() => hydra.vd.levelA, () => hydra.vd.levelA, () => hydra.vd.levelA)
  .diff(src(s1), () => hydra.vd.levelB)
  .color(() => hydra.vd.master, () => hydra.vd.master, () => hydra.vd.master)
  .out()`,
  },

  {
    id: 'layer',
    name: 'Layer',
    description: 'Layer B over A',
    doc: 'Composites source B on top of source A, similar to Photoshop\'s "Normal" blend mode with opacity. The layer operation performs alpha compositing where B is placed over A. Bright areas of B will be more opaque.\n**Use cases**\n- Overlaying graphics or text\n- Picture-in-picture effects\n- Compositing multiple layers\n- Adding foreground elements\n**Parameters**\n- **Level A**: Pre-gain for the background source A\n- **Level B**: Controls the opacity/strength of the overlay source B\n- **Master**: Final output gain control',
    category: 'blend',
    params: [
      {
        key: 'levelA',
        label: 'Level A',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'levelB',
        label: 'Level B',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'master',
        label: 'Master',
        type: 'range',
        min: 0.0,
        max: 2.0,
        default: 1.0,
        step: 0.01,
      },
    ],
    codeTemplate: `src(s0)
  .color(() => hydra.vd.levelA, () => hydra.vd.levelA, () => hydra.vd.levelA)
  .layer(src(s1).color(() => hydra.vd.levelB, () => hydra.vd.levelB, () => hydra.vd.levelB))
  .color(() => hydra.vd.master, () => hydra.vd.master, () => hydra.vd.master)
  .out()`,
  },

  {
    id: 'mask',
    name: 'Mask',
    description: 'Use B as alpha mask for A',
    doc: 'Uses the luminance of source B as an alpha mask for source A. Bright areas in B allow A to show through, while dark areas in B hide A (revealing black). This is useful for creating cutouts, revealing effects, or applying animated masks.\n**Use cases**\n- Creating shape cutouts\n- Animated reveal effects\n- Text masking\n- Stencil effects\n**Parameters**\n- **Level A**: Pre-gain for the source being masked\n- **Level B**: Controls the intensity/strength of the mask\n- **Master**: Final output gain control',
    category: 'blend',
    params: [
      {
        key: 'levelA',
        label: 'Level A',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'levelB',
        label: 'Level B',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'master',
        label: 'Master',
        type: 'range',
        min: 0.0,
        max: 2.0,
        default: 1.0,
        step: 0.01,
      },
    ],
    codeTemplate: `src(s0)
  .color(() => hydra.vd.levelA, () => hydra.vd.levelA, () => hydra.vd.levelA)
  .mask(src(s1), () => hydra.vd.levelB)
  .color(() => hydra.vd.master, () => hydra.vd.master, () => hydra.vd.master)
  .out()`,
  },

  // ============================================================================
  // ADVANCED BLEND MODES WITH EXTRA PARAMETERS
  // ============================================================================

  {
    id: 'screen',
    name: 'Screen',
    description: 'Screen blending (lightens) with gamma control',
    doc: 'Screen blend mode is the opposite of multiply - it creates a lightening effect. The formula is: `A + B - A×B`. Dark colors have little effect, while light colors brighten significantly. Includes gamma control for additional tone adjustment.\n**Mathematical formula:** `(A×levelA + B×levelB - A×B×levelB²)^gamma × master`\n**Use cases**\n- Lightening and brightening effects\n- Combining light sources realistically\n- Creating glow and haze effects\n- Dodging/lightening specific areas\n**Parameters**\n- **Level A**: Pre-gain for source A\n- **Level B**: Controls how much source B lightens the result\n- **Gamma**: Adjusts the tone curve (>1 brightens mids, <1 darkens mids)\n- **Master**: Final output gain control',
    category: 'blend',
    params: [
      {
        key: 'levelA',
        label: 'Level A',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'levelB',
        label: 'Level B',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'gamma',
        label: 'Gamma',
        type: 'range',
        min: 0.1,
        max: 4.0,
        default: 1.0,
        step: 0.1,
      },
      {
        key: 'master',
        label: 'Master',
        type: 'range',
        min: 0.0,
        max: 2.0,
        default: 1.0,
        step: 0.01,
      },
    ],
    codeTemplate: `src(s0)
  .color(() => hydra.vd.levelA, () => hydra.vd.levelA, () => hydra.vd.levelA)
  .add(src(s1), () => hydra.vd.levelB)
  .sub(
    src(s0).mult(src(s1), () => hydra.vd.levelB),
    () => hydra.vd.levelB
  )
  .color(() => hydra.vd.gamma, () => hydra.vd.gamma, () => hydra.vd.gamma)
  .color(() => hydra.vd.master, () => hydra.vd.master, () => hydra.vd.master)
  .out()`,
  },

  {
    id: 'overlay',
    name: 'Overlay',
    description: 'Overlay blending with threshold',
    doc: 'An approximation of overlay blend mode that combines multiply and screen based on a threshold. This creates contrast-enhancing effects where dark areas get darker (multiply) and light areas get lighter (screen). The threshold parameter controls the balance between these two modes.\n**Use cases**\n- Increasing contrast\n- Creating dramatic lighting effects\n- Texture overlay with contrast preservation\n- Enhancing details\n**Parameters**\n- **Level A**: Pre-gain for source A\n- **Level B**: Controls the final intensity of the effect\n- **Threshold**: Balance between multiply (low values) and screen (high values) modes\n- **Master**: Final output gain control',
    category: 'blend',
    params: [
      {
        key: 'levelA',
        label: 'Level A',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'levelB',
        label: 'Level B',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'threshold',
        label: 'Threshold',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 0.5,
        step: 0.01,
      },
      {
        key: 'master',
        label: 'Master',
        type: 'range',
        min: 0.0,
        max: 2.0,
        default: 1.0,
        step: 0.01,
      },
    ],
    codeTemplate: `src(s0)
  .color(() => hydra.vd.levelA, () => hydra.vd.levelA, () => hydra.vd.levelA)
  .blend(
    src(s0).mult(src(s1), 2),
    () => hydra.vd.threshold
  )
  .blend(
    src(s0).add(src(s1)).sub(src(s0).mult(src(s1), 2)),
    () => 1 - hydra.vd.threshold
  )
  .color(() => hydra.vd.levelB, () => hydra.vd.levelB, () => hydra.vd.levelB)
  .color(() => hydra.vd.master, () => hydra.vd.master, () => hydra.vd.master)
  .out()`,
  },

  // ============================================================================
  // MODULATION MODES
  // ============================================================================

  {
    id: 'modulate',
    name: 'Modulate',
    description: 'Use B to modulate A position',
    doc: "Uses the pixel values of source B to distort the texture coordinates of source A, creating displacement/warping effects. Brighter areas in B push pixels in one direction, darker areas push in another. This creates organic, flowing distortion effects.\n**Technical** The RGB values of B are used as 2D displacement vectors for sampling A's texture coordinates.\n**Use cases**\n- Creating liquid/water distortion effects\n- Warping and displacement mapping\n- Organic animation effects\n- Simulating heat waves or refraction\n**Parameters**\n- **Level A**: Pre-gain for source A (being displaced)\n- **Level B**: Pre-gain for source B (displacement map)\n- **Amount**: Intensity of the displacement effect\n- **Master**: Final output gain control",
    category: 'modulation',
    params: [
      {
        key: 'levelA',
        label: 'Level A',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'levelB',
        label: 'Level B',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'amount',
        label: 'Amount',
        type: 'range',
        min: 0.0,
        max: 2.0,
        default: 0.5,
        step: 0.01,
      },
      {
        key: 'master',
        label: 'Master',
        type: 'range',
        min: 0.0,
        max: 2.0,
        default: 1.0,
        step: 0.01,
      },
    ],
    codeTemplate: `src(s0)
  .color(() => hydra.vd.levelA, () => hydra.vd.levelA, () => hydra.vd.levelA)
  .modulate(
    src(s1).color(() => hydra.vd.levelB, () => hydra.vd.levelB, () => hydra.vd.levelB),
    () => hydra.vd.amount
  )
  .color(() => hydra.vd.master, () => hydra.vd.master, () => hydra.vd.master)
  .out()`,
  },

  {
    id: 'modulateScale',
    name: 'Modulate Scale',
    description: 'Use B to modulate A scale',
    doc: "Uses the luminance of source B to control the zoom/scale of source A. Bright areas in B cause A to zoom in, while dark areas cause zoom out. This creates dynamic, responsive scaling effects driven by another visual source.\n**Technical** B's brightness values modulate A's texture coordinate scaling from the center.\n**Use cases**\n- Audio-reactive zoom effects\n- Pulsing/breathing animations\n- Dynamic focus effects\n- Rhythm-based scaling\n**Parameters**\n- **Level A**: Pre-gain for source A (being scaled)\n- **Level B**: Pre-gain for source B (scale control)\n- **Amount**: Intensity/range of the scale modulation\n- **Master**: Final output gain control",
    category: 'modulation',
    params: [
      {
        key: 'levelA',
        label: 'Level A',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'levelB',
        label: 'Level B',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'amount',
        label: 'Amount',
        type: 'range',
        min: 0.0,
        max: 2.0,
        default: 0.5,
        step: 0.01,
      },
      {
        key: 'master',
        label: 'Master',
        type: 'range',
        min: 0.0,
        max: 2.0,
        default: 1.0,
        step: 0.01,
      },
    ],
    codeTemplate: `src(s0)
  .color(() => hydra.vd.levelA, () => hydra.vd.levelA, () => hydra.vd.levelA)
  .modulateScale(
    src(s1).color(() => hydra.vd.levelB, () => hydra.vd.levelB, () => hydra.vd.levelB),
    () => hydra.vd.amount
  )
  .color(() => hydra.vd.master, () => hydra.vd.master, () => hydra.vd.master)
  .out()`,
  },

  {
    id: 'modulateRotate',
    name: 'Modulate Rotate',
    description: 'Use B to modulate A rotation',
    doc: "Uses the luminance of source B to control the rotation of source A. Bright areas in B rotate clockwise, dark areas rotate counter-clockwise. This creates swirling, dynamic rotation effects driven by another visual source.\n**Technical** B's brightness values modulate A's rotation angle in radians around the center point.\n**Use cases**\n- Audio-reactive spinning effects\n- Vortex and swirl effects\n- Dynamic rotation based on content\n- Creating kaleidoscopic motion\n**Parameters**\n- **Level A**: Pre-gain for source A (being rotated)\n- **Level B**: Pre-gain for source B (rotation control)\n- **Amount**: Intensity/range of rotation (in radians)\n- **Master**: Final output gain control",
    category: 'modulation',
    params: [
      {
        key: 'levelA',
        label: 'Level A',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'levelB',
        label: 'Level B',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'amount',
        label: 'Amount',
        type: 'range',
        min: 0.0,
        max: 4.0,
        default: 1.0,
        step: 0.1,
      },
      {
        key: 'master',
        label: 'Master',
        type: 'range',
        min: 0.0,
        max: 2.0,
        default: 1.0,
        step: 0.01,
      },
    ],
    codeTemplate: `src(s0)
  .color(() => hydra.vd.levelA, () => hydra.vd.levelA, () => hydra.vd.levelA)
  .modulateRotate(
    src(s1).color(() => hydra.vd.levelB, () => hydra.vd.levelB, () => hydra.vd.levelB),
    () => hydra.vd.amount
  )
  .color(() => hydra.vd.master, () => hydra.vd.master, () => hydra.vd.master)
  .out()`,
  },

  {
    id: 'modulateKaleid',
    name: 'Modulate Kaleid',
    description: 'Use B to modulate A kaleidoscope',
    doc: "Uses source B to control the number of kaleidoscope segments applied to source A. Creates dynamic, symmetrical patterns where the complexity changes based on B's brightness. Brighter areas create more segments.\n**Technical** B's brightness values modulate the number of radial symmetry segments applied to A.\n**Use cases**\n- Audio-reactive kaleidoscope effects\n- Dynamic symmetry patterns\n- Creating complex mandalas\n- Transitioning between different segment counts\n**Parameters**\n- **Level A**: Pre-gain for source A (being kaleidoscoped)\n- **Level B**: Pre-gain for source B (segment count control)\n- **Sides**: Base number of kaleidoscope segments (1-32)\n- **Master**: Final output gain control",
    category: 'modulation',
    params: [
      {
        key: 'levelA',
        label: 'Level A',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'levelB',
        label: 'Level B',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'nSides',
        label: 'Sides',
        type: 'range',
        min: 1,
        max: 32,
        default: 4,
        step: 1,
      },
      {
        key: 'master',
        label: 'Master',
        type: 'range',
        min: 0.0,
        max: 2.0,
        default: 1.0,
        step: 0.01,
      },
    ],
    codeTemplate: `src(s0)
  .color(() => hydra.vd.levelA, () => hydra.vd.levelA, () => hydra.vd.levelA)
  .modulateKaleid(
    src(s1).color(() => hydra.vd.levelB, () => hydra.vd.levelB, () => hydra.vd.levelB),
    () => hydra.vd.nSides
  )
  .color(() => hydra.vd.master, () => hydra.vd.master, () => hydra.vd.master)
  .out()`,
  },

  {
    id: 'modulatePixelate',
    name: 'Modulate Pixelate',
    description: 'Use B to modulate A pixelation',
    doc: "Uses source B to control the pixelation amount applied to source A. Creates variable resolution effects where different areas can have different levels of pixelation based on B's content.\n**Technical** B's values modulate the pixel grid size applied to A, creating dynamic mosaic effects.\n**Use cases**\n- Audio-reactive pixelation\n- Privacy/censorship effects\n- Retro/8-bit aesthetic\n- Glitch art effects\n- Variable resolution based on content\n**Parameters**\n- **Level A**: Pre-gain for source A (being pixelated)\n- **Level B**: Pre-gain for source B (pixelation control)\n- **Multiple**: Base pixelation grid size\n- **Offset**: Additional offset for the pixelation grid\n- **Master**: Final output gain control",
    category: 'modulation',
    params: [
      {
        key: 'levelA',
        label: 'Level A',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'levelB',
        label: 'Level B',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'multiple',
        label: 'Multiple',
        type: 'range',
        min: 1,
        max: 100,
        default: 10,
        step: 1,
      },
      {
        key: 'offset',
        label: 'Offset',
        type: 'range',
        min: 0,
        max: 10,
        default: 3,
        step: 0.1,
      },
      {
        key: 'master',
        label: 'Master',
        type: 'range',
        min: 0.0,
        max: 2.0,
        default: 1.0,
        step: 0.01,
      },
    ],
    codeTemplate: `src(s0)
  .color(() => hydra.vd.levelA, () => hydra.vd.levelA, () => hydra.vd.levelA)
  .modulatePixelate(
    src(s1).color(() => hydra.vd.levelB, () => hydra.vd.levelB, () => hydra.vd.levelB),
    () => hydra.vd.multiple,
    () => hydra.vd.offset
  )
  .color(() => hydra.vd.master, () => hydra.vd.master, () => hydra.vd.master)
  .out()`,
  },

  {
    id: 'modulateScrollX',
    name: 'Modulate Scroll X',
    description: 'Use B to modulate A horizontal scroll',
    doc: "Uses source B to control horizontal scrolling/panning of source A. Bright areas in B scroll right, dark areas scroll left. Creates dynamic, flowing horizontal movements driven by another visual source.\n**Technical** B's brightness values modulate A's horizontal texture coordinate offset.\n**Use cases**\n- Audio-reactive panning\n- Liquid horizontal flow effects\n- Content-driven camera movements\n- Creating wave-like horizontal distortions\n**Parameters**\n- **Level A**: Pre-gain for source A (being scrolled)\n- **Level B**: Pre-gain for source B (scroll control)\n- **Speed**: Base scrolling speed/amount (-2 to 2)\n- **Frequency**: How often the scrolling pattern repeats\n- **Master**: Final output gain control",
    category: 'modulation',
    params: [
      {
        key: 'levelA',
        label: 'Level A',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'levelB',
        label: 'Level B',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'scrollX',
        label: 'Speed',
        type: 'range',
        min: -2,
        max: 2,
        default: 0.5,
        step: 0.01,
      },
      {
        key: 'speed',
        label: 'Frequency',
        type: 'range',
        min: 0,
        max: 10,
        default: 1,
        step: 0.1,
      },
      {
        key: 'master',
        label: 'Master',
        type: 'range',
        min: 0.0,
        max: 2.0,
        default: 1.0,
        step: 0.01,
      },
    ],
    codeTemplate: `src(s0)
  .color(() => hydra.vd.levelA, () => hydra.vd.levelA, () => hydra.vd.levelA)
  .modulateScrollX(
    src(s1).color(() => hydra.vd.levelB, () => hydra.vd.levelB, () => hydra.vd.levelB),
    () => hydra.vd.scrollX,
    () => hydra.vd.speed
  )
  .color(() => hydra.vd.master, () => hydra.vd.master, () => hydra.vd.master)
  .out()`,
  },

  {
    id: 'modulateScrollY',
    name: 'Modulate Scroll Y',
    description: 'Use B to modulate A vertical scroll',
    doc: "Uses source B to control vertical scrolling/panning of source A. Bright areas in B scroll up, dark areas scroll down. Creates dynamic, flowing vertical movements driven by another visual source.\n**Technical** B's brightness values modulate A's vertical texture coordinate offset.\n**Use cases**\n- Audio-reactive vertical panning\n- Liquid vertical flow effects\n- Content-driven vertical camera movements\n- Creating wave-like vertical distortions\n**Parameters**\n- **Level A**: Pre-gain for source A (being scrolled)\n- **Level B**: Pre-gain for source B (scroll control)\n- **Speed**: Base scrolling speed/amount (-2 to 2)\n- **Frequency**: How often the scrolling pattern repeats\n- **Master**: Final output gain control",
    category: 'modulation',
    params: [
      {
        key: 'levelA',
        label: 'Level A',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'levelB',
        label: 'Level B',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'scrollY',
        label: 'Speed',
        type: 'range',
        min: -2,
        max: 2,
        default: 0.5,
        step: 0.01,
      },
      {
        key: 'speed',
        label: 'Frequency',
        type: 'range',
        min: 0,
        max: 10,
        default: 1,
        step: 0.1,
      },
      {
        key: 'master',
        label: 'Master',
        type: 'range',
        min: 0.0,
        max: 2.0,
        default: 1.0,
        step: 0.01,
      },
    ],
    codeTemplate: `src(s0)
  .color(() => hydra.vd.levelA, () => hydra.vd.levelA, () => hydra.vd.levelA)
  .modulateScrollY(
    src(s1).color(() => hydra.vd.levelB, () => hydra.vd.levelB, () => hydra.vd.levelB),
    () => hydra.vd.scrollY,
    () => hydra.vd.speed
  )
  .color(() => hydra.vd.master, () => hydra.vd.master, () => hydra.vd.master)
  .out()`,
  },

  // ============================================================================
  // GLITCH / CREATIVE MODES
  // ============================================================================

  {
    id: 'pixelate',
    name: 'Pixelate Blend',
    description: 'Pixelated blending',
    doc: 'Applies pixelation to both sources before blending them together. Creates a blocky, mosaic effect with adjustable resolution. Both sources are pixelated with the same grid size, then crossfaded 50/50.\n**Technical** Applies `.pixelate()` transformation to both A and B with matching grid sizes, then performs `.blend()` at 50% mix.\n**Use cases**\n- Retro/8-bit aesthetic\n- Lo-fi video effects\n- Censorship/privacy effects\n- Artistic mosaic effects\n- Reducing visual detail uniformly\n**Parameters**\n- **Level A**: Pre-gain for source A before pixelation\n- **Level B**: Pre-gain for source B before pixelation\n- **Pixel X**: Horizontal pixel/block size (1-200)\n- **Pixel Y**: Vertical pixel/block size (1-200)\n- **Master**: Final output gain control',
    category: 'glitch',
    params: [
      {
        key: 'levelA',
        label: 'Level A',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'levelB',
        label: 'Level B',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'pixelX',
        label: 'Pixel X',
        type: 'range',
        min: 1,
        max: 200,
        default: 20,
        step: 1,
      },
      {
        key: 'pixelY',
        label: 'Pixel Y',
        type: 'range',
        min: 1,
        max: 200,
        default: 20,
        step: 1,
      },
      {
        key: 'master',
        label: 'Master',
        type: 'range',
        min: 0.0,
        max: 2.0,
        default: 1.0,
        step: 0.01,
      },
    ],
    codeTemplate: `src(s0)
  .color(() => hydra.vd.levelA, () => hydra.vd.levelA, () => hydra.vd.levelA)
  .pixelate(() => hydra.vd.pixelX, () => hydra.vd.pixelY)
  .blend(
    src(s1)
      .color(() => hydra.vd.levelB, () => hydra.vd.levelB, () => hydra.vd.levelB)
      .pixelate(() => hydra.vd.pixelX, () => hydra.vd.pixelY)
  )
  .color(() => hydra.vd.master, () => hydra.vd.master, () => hydra.vd.master)
  .out()`,
  },

  {
    id: 'kaleidBlend',
    name: 'Kaleidoscope Blend',
    description: 'Blend with kaleidoscope effect',
    doc: 'Applies kaleidoscope symmetry to both sources before blending them together. Creates radial, mandala-like symmetrical patterns. Both sources get the same number of kaleidoscope segments, then are crossfaded 50/50.\n**Technical** Applies `.kaleid()` transformation to both A and B with matching segment counts, then performs `.blend()` at 50% mix.\n**Use cases**\n- Psychedelic visuals\n- Creating mandala patterns\n- Symmetrical compositions\n- Trippy, hypnotic effects\n- VJ performances\n**Parameters**\n- **Level A**: Pre-gain for source A before kaleidoscope\n- **Level B**: Pre-gain for source B before kaleidoscope\n- **Sides**: Number of kaleidoscope segments (1-32)\n- **Master**: Final output gain control',
    category: 'glitch',
    params: [
      {
        key: 'levelA',
        label: 'Level A',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'levelB',
        label: 'Level B',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'nSides',
        label: 'Sides',
        type: 'range',
        min: 1,
        max: 32,
        default: 4,
        step: 1,
      },
      {
        key: 'master',
        label: 'Master',
        type: 'range',
        min: 0.0,
        max: 2.0,
        default: 1.0,
        step: 0.01,
      },
    ],
    codeTemplate: `src(s0)
  .color(() => hydra.vd.levelA, () => hydra.vd.levelA, () => hydra.vd.levelA)
  .kaleid(() => hydra.vd.nSides)
  .blend(
    src(s1)
      .color(() => hydra.vd.levelB, () => hydra.vd.levelB, () => hydra.vd.levelB)
      .kaleid(() => hydra.vd.nSides)
  )
  .color(() => hydra.vd.master, () => hydra.vd.master, () => hydra.vd.master)
  .out()`,
  },

  {
    id: 'colorama',
    name: 'Colorama',
    description: 'Color cycling blend',
    doc: 'Applies color cycling/rotation to source A, then blends it 50/50 with source B. The colorama effect shifts hues continuously, creating psychedelic rainbow effects. The amount parameter controls the intensity of color cycling.\n**Technical** Applies `.colorama()` to A (which rotates colors through hue space), then blends with unmodified B at 50%.\n**Use cases**\n- Psychedelic color effects\n- Rainbow/prismatic visuals\n- Hue cycling animations\n- Creating color variety from monochrome sources\n- VJ color treatments\n**Parameters**\n- **Level A**: Pre-gain for source A before colorama\n- **Level B**: Pre-gain for source B in the blend\n- **Amount**: Intensity of color cycling/rotation\n- **Master**: Final output gain control',
    category: 'color',
    params: [
      {
        key: 'levelA',
        label: 'Level A',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'levelB',
        label: 'Level B',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'amount',
        label: 'Amount',
        type: 'range',
        min: 0.0,
        max: 2.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'master',
        label: 'Master',
        type: 'range',
        min: 0.0,
        max: 2.0,
        default: 1.0,
        step: 0.01,
      },
    ],
    codeTemplate: `src(s0)
  .color(() => hydra.vd.levelA, () => hydra.vd.levelA, () => hydra.vd.levelA)
  .colorama(() => hydra.vd.amount)
  .blend(
    src(s1).color(() => hydra.vd.levelB, () => hydra.vd.levelB, () => hydra.vd.levelB),
    0.5
  )
  .color(() => hydra.vd.master, () => hydra.vd.master, () => hydra.vd.master)
  .out()`,
  },

  {
    id: 'lumaKey',
    name: 'Luma Key',
    description: 'Luminance-based keying',
    doc: 'Uses luminance thresholding on source A to key out (remove) areas based on brightness, then blends with source B. Similar to chroma keying but based on brightness instead of color. Areas within the threshold range become transparent, revealing B underneath.\n**Technical** Applies `.luma()` to A to create an alpha mask based on brightness threshold and tolerance, then blends with B.\n**Use cases**\n- Removing bright or dark backgrounds\n- Creating transparency based on luminance\n- Compositing over specific brightness ranges\n- Simulating green screen with brightness\n- Light/shadow keying\n**Parameters**\n- **Level A**: Pre-gain for source A before luma keying\n- **Level B**: Pre-gain for source B (shows through keyed areas)\n- **Threshold**: Luminance value to key out (0-1)\n- **Tolerance**: Range around threshold to soften edges\n- **Master**: Final output gain control',
    category: 'color',
    params: [
      {
        key: 'levelA',
        label: 'Level A',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'levelB',
        label: 'Level B',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'threshold',
        label: 'Threshold',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 0.5,
        step: 0.01,
      },
      {
        key: 'tolerance',
        label: 'Tolerance',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 0.1,
        step: 0.01,
      },
      {
        key: 'master',
        label: 'Master',
        type: 'range',
        min: 0.0,
        max: 2.0,
        default: 1.0,
        step: 0.01,
      },
    ],
    codeTemplate: `src(s0)
  .color(() => hydra.vd.levelA, () => hydra.vd.levelA, () => hydra.vd.levelA)
  .luma(() => hydra.vd.threshold, () => hydra.vd.tolerance)
  .blend(
    src(s1).color(() => hydra.vd.levelB, () => hydra.vd.levelB, () => hydra.vd.levelB)
  )
  .color(() => hydra.vd.master, () => hydra.vd.master, () => hydra.vd.master)
  .out()`,
  },

  {
    id: 'chromaShift',
    name: 'Chromatic Aberration',
    description: 'RGB channel separation effect',
    doc: 'Separates and shifts the red, green, and blue channels of source A independently, creating a chromatic aberration/prism effect similar to cheap lenses or glitch aesthetics. Then blends with source B.\n**Technical** Uses `.r()`, `.g()`, `.b()` to shift individual color channels in texture space, creating RGB separation.\n**Use cases**\n- Glitch aesthetics\n- Simulating lens chromatic aberration\n- Creating 3D-glasses effects\n- Analog video distortion\n- Psychedelic color separation\n**Parameters**\n- **Level A**: Pre-gain for source A before channel shifting\n- **Level B**: Pre-gain for source B in the blend\n- **R Offset**: Horizontal shift for red channel (-0.1 to 0.1)\n- **G Offset**: Horizontal shift for green channel (-0.1 to 0.1)\n- **B Offset**: Horizontal shift for blue channel (-0.1 to 0.1)\n- **Master**: Final output gain control',
    category: 'glitch',
    params: [
      {
        key: 'levelA',
        label: 'Level A',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'levelB',
        label: 'Level B',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'rOffset',
        label: 'R Offset',
        type: 'range',
        min: -0.1,
        max: 0.1,
        default: 0.01,
        step: 0.001,
      },
      {
        key: 'gOffset',
        label: 'G Offset',
        type: 'range',
        min: -0.1,
        max: 0.1,
        default: 0.0,
        step: 0.001,
      },
      {
        key: 'bOffset',
        label: 'B Offset',
        type: 'range',
        min: -0.1,
        max: 0.1,
        default: -0.01,
        step: 0.001,
      },
      {
        key: 'master',
        label: 'Master',
        type: 'range',
        min: 0.0,
        max: 2.0,
        default: 1.0,
        step: 0.01,
      },
    ],
    codeTemplate: `src(s0)
  .scrollX(() => hydra.vd.rOffset)
  .r()
  .color(1, 0, 0, 1)
  .add(
    src(s0)
      .scrollX(() => hydra.vd.gOffset)
      .g()
      .color(0, 1, 0, 1),
    1
  )
  .add(
    src(s0)
      .scrollX(() => hydra.vd.bOffset)
      .b()
      .color(0, 0, 1, 1),
    1
  )
  .color(() => hydra.vd.levelA, () => hydra.vd.levelA, () => hydra.vd.levelA)
  .blend(
    src(s1).color(() => hydra.vd.levelB, () => hydra.vd.levelB, () => hydra.vd.levelB),
    0.5
  )
  .color(() => hydra.vd.master, () => hydra.vd.master, () => hydra.vd.master)
  .out()`,
  },

  {
    id: 'feedback',
    name: 'Feedback Loop',
    description: 'Recursive feedback blending',
    doc: 'Creates a feedback loop by reading the previous output frame, scaling and rotating it slightly, then mixing it back with the current sources. This creates trails, echoes, and recursive visual effects that build over time.\n**Technical** Uses `src(o0)` to read the output buffer, applies `.scale()` and `.rotate()` transformations, then blends with current sources using `.blend()` and `.add()`. The output feeds back into itself each frame.\n**Warning:** High scale or long feedback can cause exponential buildup. Keep scale close to 1.0.\n**Use cases**\n- Creating visual trails and echoes\n- Recursive/fractal-like effects\n- Infinite zoom/tunnel effects\n- Psychedelic spiraling patterns\n- Building up complexity over time\n**Parameters**\n- **Level A**: Pre-gain for source A\n- **Level B**: Controls how much fresh content (source B) is added each frame\n- **Scale**: Zoom factor for feedback (>1 zooms in, <1 zooms out)\n- **Rotation**: Rotation amount per frame for feedback spiral\n- **Master**: Final output gain control',
    category: 'glitch',
    params: [
      {
        key: 'levelA',
        label: 'Level A',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'levelB',
        label: 'Level B',
        type: 'range',
        min: 0.0,
        max: 1.0,
        default: 1.0,
        step: 0.01,
      },
      {
        key: 'scale',
        label: 'Scale',
        type: 'range',
        min: 0.9,
        max: 1.1,
        default: 1.01,
        step: 0.001,
      },
      {
        key: 'rotation',
        label: 'Rotation',
        type: 'range',
        min: -0.1,
        max: 0.1,
        default: 0.01,
        step: 0.001,
      },
      {
        key: 'master',
        label: 'Master',
        type: 'range',
        min: 0.0,
        max: 2.0,
        default: 1.0,
        step: 0.01,
      },
    ],
    codeTemplate: `src(s0)
  .color(() => hydra.vd.levelA, () => hydra.vd.levelA, () => hydra.vd.levelA)
  .blend(src(o0).scale(() => hydra.vd.scale).rotate(() => hydra.vd.rotation), 0.9)
  .add(
    src(s1).color(() => hydra.vd.levelB, () => hydra.vd.levelB, () => hydra.vd.levelB),
    0.1
  )
  .color(() => hydra.vd.master, () => hydra.vd.master, () => hydra.vd.master)
  .out()`,
  },
];

/**
 * Get composite function by ID
 */
export function getCompositeFunction(id: string): CompositeFunction | undefined {
  return COMPOSITE_FUNCTIONS.find((fn) => fn.id === id);
}

/**
 * Get all composite functions in a category
 */
export function getCompositeFunctionsByCategory(
  category: CompositeFunction['category'],
): Array<CompositeFunction> {
  return COMPOSITE_FUNCTIONS.filter((fn) => fn.category === category);
}

/**
 * Get all categories with their functions
 */
export function getCompositeFunctionCategories(): Record<string, Array<CompositeFunction>> {
  return COMPOSITE_FUNCTIONS.reduce<Record<string, Array<CompositeFunction>>>((acc, fn) => {
    acc[fn.category] ??= [];
    acc[fn.category].push(fn);
    return acc;
  }, {});
}
