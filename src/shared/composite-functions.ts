import type { CompositeFunction } from './types';

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
    category: 'blend',
    description: 'Simple additive blending',
    parameters: [
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
    category: 'blend',
    description: 'Alpha blending (crossfade)',
    parameters: [
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
    category: 'blend',
    description: 'Multiplicative blending (darkens)',
    parameters: [
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
    category: 'blend',
    description: 'Subtractive blending (difference)',
    parameters: [
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
    category: 'blend',
    description: 'Absolute difference between sources',
    parameters: [
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
    category: 'blend',
    description: 'Layer B over A',
    parameters: [
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
    category: 'blend',
    description: 'Use B as alpha mask for A',
    parameters: [
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
    category: 'blend',
    description: 'Screen blending (lightens) with gamma control',
    parameters: [
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
    category: 'blend',
    description: 'Overlay blending with threshold',
    parameters: [
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
    category: 'modulation',
    description: 'Use B to modulate A position',
    parameters: [
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
    category: 'modulation',
    description: 'Use B to modulate A scale',
    parameters: [
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
    category: 'modulation',
    description: 'Use B to modulate A rotation',
    parameters: [
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
    category: 'modulation',
    description: 'Use B to modulate A kaleidoscope',
    parameters: [
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
    category: 'modulation',
    description: 'Use B to modulate A pixelation',
    parameters: [
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
    category: 'modulation',
    description: 'Use B to modulate A horizontal scroll',
    parameters: [
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
    category: 'modulation',
    description: 'Use B to modulate A vertical scroll',
    parameters: [
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
    category: 'glitch',
    description: 'Pixelated blending',
    parameters: [
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
    category: 'glitch',
    description: 'Blend with kaleidoscope effect',
    parameters: [
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
    category: 'color',
    description: 'Color cycling blend',
    parameters: [
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
    category: 'color',
    description: 'Luminance-based keying',
    parameters: [
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
    category: 'glitch',
    description: 'RGB channel displacement',
    parameters: [
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
  .color(() => hydra.vd.levelA, () => hydra.vd.levelA, () => hydra.vd.levelA)
  .r(() => hydra.vd.rOffset, 0)
  .g(() => hydra.vd.gOffset, 0)
  .b(() => hydra.vd.bOffset, 0)
  .blend(
    src(s1).color(() => hydra.vd.levelB, () => hydra.vd.levelB, () => hydra.vd.levelB)
  )
  .color(() => hydra.vd.master, () => hydra.vd.master, () => hydra.vd.master)
  .out()`,
  },

  {
    id: 'feedback',
    name: 'Feedback Loop',
    category: 'glitch',
    description: 'Recursive feedback blending',
    parameters: [
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
