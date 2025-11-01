/* eslint-env browser */

/**
 * Hydra API definitions for Monaco Editor Intellisense
 * Based on: https://hydra.ojack.xyz/api/
 */

/**
 * Unified interface for Hydra API documentation
 * Used for both functions and global variables
 */
export interface HydraApiDoc {
  name: string;
  description: string;
  doc?: string; // Detailed documentation (markdown supported)
  kind: 'function' | 'variable' | 'constant';
  category:
    | 'source'
    | 'geometry'
    | 'color'
    | 'blend'
    | 'modulate'
    | 'output'
    | 'synth'
    | 'array'
    | 'global';
  type: string; // Return type for functions, variable type for globals
  params?: Array<{
    name: string;
    type: string;
    description: string;
    default?: string;
  }>;
  examples?: Array<string>;
  properties?: Array<{
    name: string;
    type: string;
    description: string;
  }>;
}

// Legacy type alias for backward compatibility
export type HydraFunction = HydraApiDoc;

/**
 * Complete Hydra API function definitions
 */
export const HYDRA_API: Array<HydraApiDoc> = [
  // === SOURCES ===
  {
    name: 'osc',
    description: 'Oscillator source',
    kind: 'function',
    category: 'source',
    type: 'source',
    params: [
      { name: 'frequency', type: 'number', description: 'Frequency of oscillation', default: '60' },
      { name: 'sync', type: 'number', description: 'Synchronization', default: '0.1' },
      { name: 'offset', type: 'number', description: 'Offset', default: '0' },
    ],
    examples: ['osc(10, 0.1, 1).out()', 'osc(20, 0.05, 0.5).kaleid(4).out()'],
  },
  {
    name: 'noise',
    description: 'Noise source',
    kind: 'function',
    category: 'source',
    type: 'source',
    params: [
      { name: 'scale', type: 'number', description: 'Scale of noise', default: '10' },
      { name: 'offset', type: 'number', description: 'Offset', default: '0.1' },
    ],
    examples: ['noise(3, 0.1).out()', 'noise(5).colorama().out()'],
  },
  {
    name: 'voronoi',
    description: 'Voronoi diagram source',
    kind: 'function',
    category: 'source',
    params: [
      { name: 'scale', type: 'number', description: 'Scale of voronoi cells', default: '5' },
      { name: 'speed', type: 'number', description: 'Speed of movement', default: '0.3' },
      { name: 'blending', type: 'number', description: 'Blending amount', default: '0.3' },
    ],
    type: 'source',
    examples: ['voronoi(5, 0.3, 0.3).out()', 'voronoi(10, 0.1).kaleid(4).out()'],
  },
  {
    name: 'shape',
    description: 'Geometric shape source',
    kind: 'function',
    category: 'source',
    params: [
      { name: 'sides', type: 'number', description: 'Number of sides', default: '3' },
      { name: 'radius', type: 'number', description: 'Radius', default: '0.3' },
      { name: 'smoothing', type: 'number', description: 'Edge smoothing', default: '0.01' },
    ],
    type: 'source',
    examples: ['shape(4, 0.5, 0.01).out()', 'shape(3).repeat(3, 3).out()'],
  },
  {
    name: 'gradient',
    description: 'Gradient source',
    kind: 'function',
    category: 'source',
    params: [
      { name: 'speed', type: 'number', description: 'Speed of gradient movement', default: '0' },
    ],
    type: 'source',
    examples: ['gradient(1).out()', 'gradient(0).kaleid().out()'],
  },
  {
    name: 'src',
    description: 'Use external source (video, camera, canvas)',
    kind: 'function',
    category: 'source',
    params: [
      {
        name: 'source',
        type: 'source',
        description: 'External source (s0, s1, s2, s3, o0-o3)',
        default: 's0',
      },
    ],
    type: 'source',
    examples: ['src(s0).out()', 'src(o0).kaleid(4).out()'],
  },
  {
    name: 'solid',
    description: 'Solid color source',
    kind: 'function',
    category: 'source',
    params: [
      { name: 'r', type: 'number', description: 'Red channel (0-1)', default: '0' },
      { name: 'g', type: 'number', description: 'Green channel (0-1)', default: '0' },
      { name: 'b', type: 'number', description: 'Blue channel (0-1)', default: '0' },
      { name: 'a', type: 'number', description: 'Alpha channel (0-1)', default: '1' },
    ],
    type: 'source',
    examples: ['solid(1, 0, 0).out()', 'solid(0.2, 0.5, 0.8, 1).out()'],
  },

  // === GEOMETRY ===
  {
    name: 'rotate',
    description: 'Rotate texture',
    kind: 'function',
    category: 'geometry',
    params: [
      { name: 'angle', type: 'number', description: 'Rotation angle', default: '10' },
      { name: 'speed', type: 'number', description: 'Rotation speed', default: '0' },
    ],
    type: 'transform',
    examples: ['osc().rotate(0.5).out()', 'noise().rotate(() => time * 0.1).out()'],
  },
  {
    name: 'scale',
    description: 'Scale texture',
    kind: 'function',
    category: 'geometry',
    params: [
      { name: 'amount', type: 'number', description: 'Scale amount', default: '1.5' },
      { name: 'xMult', type: 'number', description: 'X axis multiplier', default: '1' },
      { name: 'yMult', type: 'number', description: 'Y axis multiplier', default: '1' },
      { name: 'offsetX', type: 'number', description: 'X offset', default: '0.5' },
      { name: 'offsetY', type: 'number', description: 'Y offset', default: '0.5' },
    ],
    type: 'transform',
    examples: ['osc().scale(1.5).out()', 'shape().scale(2, 1, 1).out()'],
  },
  {
    name: 'pixelate',
    description: 'Pixelate texture',
    kind: 'function',
    category: 'geometry',
    params: [
      { name: 'pixelX', type: 'number', description: 'Horizontal pixelation', default: '20' },
      { name: 'pixelY', type: 'number', description: 'Vertical pixelation', default: '20' },
    ],
    type: 'transform',
    examples: ['osc().pixelate(20, 20).out()', 'noise().pixelate(10, 5).out()'],
  },
  {
    name: 'repeat',
    description: 'Repeat texture in a grid',
    kind: 'function',
    category: 'geometry',
    params: [
      { name: 'repeatX', type: 'number', description: 'Horizontal repetitions', default: '3' },
      { name: 'repeatY', type: 'number', description: 'Vertical repetitions', default: '3' },
      { name: 'offsetX', type: 'number', description: 'X offset', default: '0' },
      { name: 'offsetY', type: 'number', description: 'Y offset', default: '0' },
    ],
    type: 'transform',
    examples: ['shape().repeat(3, 3).out()', 'osc(10, 0, 1).repeat(2, 2, 0.5).out()'],
  },
  {
    name: 'repeatX',
    description: 'Repeat texture horizontally',
    kind: 'function',
    category: 'geometry',
    params: [
      { name: 'reps', type: 'number', description: 'Number of repetitions', default: '3' },
      { name: 'offset', type: 'number', description: 'Offset', default: '0' },
    ],
    type: 'transform',
    examples: ['shape().repeatX(4).out()'],
  },
  {
    name: 'repeatY',
    description: 'Repeat texture vertically',
    kind: 'function',
    category: 'geometry',
    params: [
      { name: 'reps', type: 'number', description: 'Number of repetitions', default: '3' },
      { name: 'offset', type: 'number', description: 'Offset', default: '0' },
    ],
    type: 'transform',
    examples: ['shape().repeatY(4).out()'],
  },
  {
    name: 'kaleid',
    description: 'Kaleidoscope effect',
    kind: 'function',
    category: 'geometry',
    params: [{ name: 'nSides', type: 'number', description: 'Number of sides', default: '4' }],
    type: 'transform',
    examples: ['osc(10, 0.1, 1).kaleid(4).out()', 'noise().kaleid(8).out()'],
  },
  {
    name: 'scroll',
    description: 'Scroll texture',
    kind: 'function',
    category: 'geometry',
    params: [
      { name: 'scrollX', type: 'number', description: 'Horizontal scroll speed', default: '0.5' },
      { name: 'scrollY', type: 'number', description: 'Vertical scroll speed', default: '0.5' },
      { name: 'speedX', type: 'number', description: 'X speed multiplier', default: '0' },
      { name: 'speedY', type: 'number', description: 'Y speed multiplier', default: '0' },
    ],
    type: 'transform',
    examples: ['osc().scroll(0.1, 0.2).out()', 'noise().scroll(0.5, 0).out()'],
  },
  {
    name: 'scrollX',
    description: 'Scroll texture horizontally',
    kind: 'function',
    category: 'geometry',
    params: [
      { name: 'scrollX', type: 'number', description: 'Horizontal scroll amount', default: '0.5' },
      { name: 'speed', type: 'number', description: 'Speed multiplier', default: '0' },
    ],
    type: 'transform',
    examples: ['osc().scrollX(0.1).out()'],
  },
  {
    name: 'scrollY',
    description: 'Scroll texture vertically',
    kind: 'function',
    category: 'geometry',
    params: [
      { name: 'scrollY', type: 'number', description: 'Vertical scroll amount', default: '0.5' },
      { name: 'speed', type: 'number', description: 'Speed multiplier', default: '0' },
    ],
    type: 'transform',
    examples: ['osc().scrollY(0.1).out()'],
  },

  // === COLOR ===
  {
    name: 'posterize',
    description: 'Reduce color palette',
    kind: 'function',
    category: 'color',
    params: [
      { name: 'bins', type: 'number', description: 'Number of color bins', default: '3' },
      { name: 'gamma', type: 'number', description: 'Gamma correction', default: '0.6' },
    ],
    type: 'transform',
    examples: ['osc().posterize(5, 0.6).out()', 'noise().posterize(3).out()'],
  },
  {
    name: 'shift',
    description: 'Shift HSV values',
    kind: 'function',
    category: 'color',
    params: [
      { name: 'r', type: 'number', description: 'Red shift', default: '0.5' },
      { name: 'g', type: 'number', description: 'Green shift', default: '0' },
      { name: 'b', type: 'number', description: 'Blue shift', default: '0' },
      { name: 'a', type: 'number', description: 'Alpha shift', default: '0' },
    ],
    type: 'transform',
    examples: ['osc().shift(0.5).out()'],
  },
  {
    name: 'invert',
    description: 'Invert colors',
    kind: 'function',
    category: 'color',
    params: [{ name: 'amount', type: 'number', description: 'Inversion amount', default: '1' }],
    type: 'transform',
    examples: ['osc().invert(1).out()', 'noise().invert(0.5).out()'],
  },
  {
    name: 'contrast',
    description: 'Adjust contrast',
    kind: 'function',
    category: 'color',
    params: [{ name: 'amount', type: 'number', description: 'Contrast amount', default: '1.6' }],
    type: 'transform',
    examples: ['osc().contrast(1.5).out()'],
  },
  {
    name: 'brightness',
    description: 'Adjust brightness',
    kind: 'function',
    category: 'color',
    params: [{ name: 'amount', type: 'number', description: 'Brightness amount', default: '0.4' }],
    type: 'transform',
    examples: ['osc().brightness(0.2).out()'],
  },
  {
    name: 'luma',
    description: 'Apply luma (brightness) threshold',
    kind: 'function',
    category: 'color',
    params: [
      { name: 'threshold', type: 'number', description: 'Luma threshold', default: '0.5' },
      { name: 'tolerance', type: 'number', description: 'Tolerance', default: '0.1' },
    ],
    type: 'transform',
    examples: ['osc().luma(0.5, 0.1).out()'],
  },
  {
    name: 'thresh',
    description: 'Apply threshold',
    kind: 'function',
    category: 'color',
    params: [
      { name: 'threshold', type: 'number', description: 'Threshold value', default: '0.5' },
      { name: 'tolerance', type: 'number', description: 'Tolerance', default: '0.04' },
    ],
    type: 'transform',
    examples: ['osc().thresh(0.5, 0.04).out()'],
  },
  {
    name: 'color',
    description: 'Apply color transformation',
    kind: 'function',
    category: 'color',
    params: [
      { name: 'r', type: 'number', description: 'Red multiplier', default: '1' },
      { name: 'g', type: 'number', description: 'Green multiplier', default: '1' },
      { name: 'b', type: 'number', description: 'Blue multiplier', default: '1' },
      { name: 'a', type: 'number', description: 'Alpha multiplier', default: '1' },
    ],
    type: 'transform',
    examples: ['osc().color(1, 0.5, 0.8).out()', 'noise().color(0.5, 1, 0.5, 1).out()'],
  },
  {
    name: 'saturate',
    description: 'Adjust saturation',
    kind: 'function',
    category: 'color',
    params: [{ name: 'amount', type: 'number', description: 'Saturation amount', default: '2' }],
    type: 'transform',
    examples: ['osc().saturate(2).out()'],
  },
  {
    name: 'hue',
    description: 'Rotate hue',
    kind: 'function',
    category: 'color',
    params: [
      { name: 'amount', type: 'number', description: 'Hue rotation amount', default: '0.4' },
    ],
    type: 'transform',
    examples: ['osc().hue(0.5).out()'],
  },
  {
    name: 'colorama',
    description: 'Apply colorama effect',
    kind: 'function',
    category: 'color',
    params: [{ name: 'amount', type: 'number', description: 'Effect amount', default: '0.005' }],
    type: 'transform',
    examples: ['noise().colorama(0.5).out()', 'osc().colorama(0.01).out()'],
  },

  // === BLEND ===
  {
    name: 'add',
    description: 'Add textures together',
    kind: 'function',
    category: 'blend',
    params: [
      { name: 'texture', type: 'source', description: 'Texture to add', default: 'osc()' },
      { name: 'amount', type: 'number', description: 'Blend amount', default: '0.5' },
    ],
    type: 'transform',
    examples: ['osc().add(noise()).out()', 'shape().add(osc(), 0.5).out()'],
  },
  {
    name: 'sub',
    description: 'Subtract texture',
    kind: 'function',
    category: 'blend',
    params: [
      { name: 'texture', type: 'source', description: 'Texture to subtract', default: 'osc()' },
      { name: 'amount', type: 'number', description: 'Blend amount', default: '0.5' },
    ],
    type: 'transform',
    examples: ['osc().sub(noise()).out()'],
  },
  {
    name: 'mult',
    description: 'Multiply textures',
    kind: 'function',
    category: 'blend',
    params: [
      { name: 'texture', type: 'source', description: 'Texture to multiply', default: 'osc()' },
      { name: 'amount', type: 'number', description: 'Blend amount', default: '0.5' },
    ],
    type: 'transform',
    examples: ['osc().mult(noise()).out()'],
  },
  {
    name: 'blend',
    description: 'Blend with another texture',
    kind: 'function',
    category: 'blend',
    params: [
      { name: 'texture', type: 'source', description: 'Texture to blend', default: 'osc()' },
      { name: 'amount', type: 'number', description: 'Blend amount', default: '0.5' },
    ],
    type: 'transform',
    examples: ['osc().blend(noise(), 0.5).out()', 'shape().blend(src(o0), 0.8).out()'],
  },
  {
    name: 'diff',
    description: 'Difference blend mode',
    kind: 'function',
    category: 'blend',
    params: [
      { name: 'texture', type: 'source', description: 'Texture to diff', default: 'osc()' },
      { name: 'amount', type: 'number', description: 'Blend amount', default: '0.5' },
    ],
    type: 'transform',
    examples: ['osc().diff(noise()).out()'],
  },
  {
    name: 'layer',
    description: 'Layer texture on top',
    kind: 'function',
    category: 'blend',
    params: [
      { name: 'texture', type: 'source', description: 'Texture to layer', default: 'osc()' },
    ],
    type: 'transform',
    examples: ['solid(0, 0, 0).layer(shape()).out()'],
  },
  {
    name: 'mask',
    description: 'Use texture as mask',
    kind: 'function',
    category: 'blend',
    params: [
      { name: 'texture', type: 'source', description: 'Mask texture', default: 'shape()' },
      { name: 'reps', type: 'number', description: 'Repetitions', default: '3' },
      { name: 'offset', type: 'number', description: 'Offset', default: '0.5' },
    ],
    type: 'transform',
    examples: ['osc().mask(shape(4)).out()'],
  },

  // === MODULATE ===
  {
    name: 'modulate',
    description: 'Modulate texture coordinates',
    kind: 'function',
    category: 'modulate',
    params: [
      { name: 'texture', type: 'source', description: 'Modulation texture', default: 'osc()' },
      { name: 'amount', type: 'number', description: 'Modulation amount', default: '0.1' },
    ],
    type: 'transform',
    examples: ['osc().modulate(noise(), 0.1).out()', 'shape().modulate(osc(10)).out()'],
  },
  {
    name: 'modulateRotate',
    description: 'Modulate rotation',
    kind: 'function',
    category: 'modulate',
    params: [
      { name: 'texture', type: 'source', description: 'Modulation texture', default: 'osc()' },
      { name: 'multiple', type: 'number', description: 'Rotation multiplier', default: '1' },
      { name: 'offset', type: 'number', description: 'Rotation offset', default: '0' },
    ],
    type: 'transform',
    examples: ['osc().modulateRotate(noise(), 0.5).out()'],
  },
  {
    name: 'modulateScale',
    description: 'Modulate scale',
    kind: 'function',
    category: 'modulate',
    params: [
      { name: 'texture', type: 'source', description: 'Modulation texture', default: 'osc()' },
      { name: 'multiple', type: 'number', description: 'Scale multiplier', default: '1' },
      { name: 'offset', type: 'number', description: 'Scale offset', default: '1' },
    ],
    type: 'transform',
    examples: ['osc().modulateScale(noise()).out()'],
  },
  {
    name: 'modulatePixelate',
    description: 'Modulate pixelation',
    kind: 'function',
    category: 'modulate',
    params: [
      { name: 'texture', type: 'source', description: 'Modulation texture', default: 'osc()' },
      { name: 'multiple', type: 'number', description: 'Pixelation multiplier', default: '10' },
      { name: 'offset', type: 'number', description: 'Pixelation offset', default: '3' },
    ],
    type: 'transform',
    examples: ['osc().modulatePixelate(noise(), 10, 3).out()'],
  },
  {
    name: 'modulateScrollX',
    description: 'Modulate horizontal scroll',
    kind: 'function',
    category: 'modulate',
    params: [
      { name: 'texture', type: 'source', description: 'Modulation texture', default: 'osc()' },
      { name: 'scrollX', type: 'number', description: 'Scroll amount', default: '0.5' },
      { name: 'speed', type: 'number', description: 'Speed multiplier', default: '0' },
    ],
    type: 'transform',
    examples: ['osc().modulateScrollX(noise(), 0.1).out()'],
  },
  {
    name: 'modulateScrollY',
    description: 'Modulate vertical scroll',
    kind: 'function',
    category: 'modulate',
    params: [
      { name: 'texture', type: 'source', description: 'Modulation texture', default: 'osc()' },
      { name: 'scrollY', type: 'number', description: 'Scroll amount', default: '0.5' },
      { name: 'speed', type: 'number', description: 'Speed multiplier', default: '0' },
    ],
    type: 'transform',
    examples: ['osc().modulateScrollY(noise(), 0.1).out()'],
  },
  {
    name: 'modulateKaleid',
    description: 'Modulate kaleidoscope',
    kind: 'function',
    category: 'modulate',
    params: [
      { name: 'texture', type: 'source', description: 'Modulation texture', default: 'osc()' },
      { name: 'nSides', type: 'number', description: 'Number of sides', default: '4' },
    ],
    type: 'transform',
    examples: ['osc().modulateKaleid(noise(), 4).out()'],
  },
  {
    name: 'modulateHue',
    description: 'Modulate hue',
    kind: 'function',
    category: 'modulate',
    params: [
      { name: 'texture', type: 'source', description: 'Modulation texture', default: 'osc()' },
      { name: 'amount', type: 'number', description: 'Modulation amount', default: '1' },
    ],
    type: 'transform',
    examples: ['osc().modulateHue(noise()).out()'],
  },

  // === OUTPUT ===
  {
    name: 'out',
    description: 'Output to buffer (o0, o1, o2, or o3)',
    kind: 'function',
    category: 'output',
    params: [{ name: 'buffer', type: 'output', description: 'Output buffer', default: 'o0' }],
    type: 'void',
    examples: ['osc().out()', 'noise().kaleid(4).out(o1)', 'shape().out(o2)'],
  },
  {
    name: 'render',
    description: 'Render without outputting',
    kind: 'function',
    category: 'output',
    params: [{ name: 'buffer', type: 'output', description: 'Output buffer', default: 'o0' }],
    type: 'void',
    examples: ['osc().render()'],
  },

  // === SYNTH GLOBALS ===
  {
    name: 'time',
    description: 'Current time in seconds',
    kind: 'function',
    category: 'synth',
    params: [],
    type: 'number',
    examples: ['osc(() => 10 + Math.sin(time) * 5).out()'],
  },
  {
    name: 'mouse',
    description: 'Mouse position object with x and y properties',
    kind: 'function',
    category: 'synth',
    params: [],
    type: 'object',
    examples: ['osc(10, 0.1, () => mouse.x).out()'],
  },
  {
    name: 'speed',
    description: 'Global animation speed multiplier',
    kind: 'function',
    category: 'synth',
    params: [],
    type: 'number',
    examples: ['speed = 0.5 // slow down animations'],
  },
  {
    name: 'bpm',
    description: 'Beats per minute for audio sync',
    kind: 'function',
    category: 'synth',
    params: [],
    type: 'number',
    examples: ['bpm = 120'],
  },

  // === ARRAY METHODS ===
  {
    name: 'fast',
    description: 'Speed up array cycling',
    kind: 'function',
    category: 'array',
    params: [{ name: 'speed', type: 'number', description: 'Speed multiplier', default: '1' }],
    type: 'array',
    examples: ['osc([10, 20, 30].fast(2)).out()'],
  },
  {
    name: 'smooth',
    description: 'Smooth transitions between array values',
    kind: 'function',
    category: 'array',
    params: [{ name: 'amount', type: 'number', description: 'Smoothing amount', default: '1' }],
    type: 'array',
    examples: ['osc([10, 20, 30].smooth()).out()'],
  },
  {
    name: 'ease',
    description: 'Apply easing to array transitions',
    kind: 'function',
    category: 'array',
    params: [{ name: 'ease', type: 'string', description: 'Easing function', default: 'linear' }],
    type: 'array',
    examples: ['osc([10, 20].ease("sin")).out()'],
  },
  {
    name: 'offset',
    description: 'Offset array timing',
    kind: 'function',
    category: 'array',
    params: [{ name: 'offset', type: 'number', description: 'Offset amount', default: '0.5' }],
    type: 'array',
    examples: ['osc([10, 20].offset(0.5)).out()'],
  },
  {
    name: 'fit',
    description: 'Fit array values to range',
    kind: 'function',
    category: 'array',
    params: [
      { name: 'min', type: 'number', description: 'Minimum value', default: '0' },
      { name: 'max', type: 'number', description: 'Maximum value', default: '1' },
    ],
    type: 'array',
    examples: ['osc([0, 1, 2].fit(10, 20)).out()'],
  },
];

/**
 * Global Hydra objects available in the execution context
 */
export const HYDRA_GLOBALS = [
  's0',
  's1',
  's2',
  's3',
  'o0',
  'o1',
  'o2',
  'o3',
  'time',
  'mouse',
  'speed',
  'bpm',
  'width',
  'height',
  'a',
];

/**
 * Complete documentation for Hydra global variables
 * Now using the unified HydraApiDoc interface
 */
export const HYDRA_GLOBAL_DOCS: Array<HydraApiDoc> = [
  // External sources (s0-s3)
  {
    name: 's0',
    description: 'External source s0 (video, camera, canvas)',
    doc: '**s0** - External source (video, camera, canvas)\n\nUse with `src(s0)` to use this source in your composition.',
    kind: 'variable',
    category: 'global',
    type: 'Source',
  },
  {
    name: 's1',
    description: 'External source s1 (video, camera, canvas)',
    doc: '**s1** - External source (video, camera, canvas)\n\nUse with `src(s1)` to use this source in your composition.',
    kind: 'variable',
    category: 'global',
    type: 'Source',
  },
  {
    name: 's2',
    description: 'External source s2 (video, camera, canvas)',
    doc: '**s2** - External source (video, camera, canvas)\n\nUse with `src(s2)` to use this source in your composition.',
    kind: 'variable',
    category: 'global',
    type: 'Source',
  },
  {
    name: 's3',
    description: 'External source s3 (video, camera, canvas)',
    doc: '**s3** - External source (video, camera, canvas)\n\nUse with `src(s3)` to use this source in your composition.',
    kind: 'variable',
    category: 'global',
    type: 'Source',
  },

  // Output buffers (o0-o3)
  {
    name: 'o0',
    description: 'Output buffer o0',
    doc: '**o0** - Output buffer\n\nUse with `.out(o0)` to render to this buffer.',
    kind: 'variable',
    category: 'global',
    type: 'Output',
  },
  {
    name: 'o1',
    description: 'Output buffer o1',
    doc: '**o1** - Output buffer\n\nUse with `.out(o1)` to render to this buffer.',
    kind: 'variable',
    category: 'global',
    type: 'Output',
  },
  {
    name: 'o2',
    description: 'Output buffer o2',
    doc: '**o2** - Output buffer\n\nUse with `.out(o2)` to render to this buffer.',
    kind: 'variable',
    category: 'global',
    type: 'Output',
  },
  {
    name: 'o3',
    description: 'Output buffer o3',
    doc: '**o3** - Output buffer\n\nUse with `.out(o3)` to render to this buffer.',
    kind: 'variable',
    category: 'global',
    type: 'Output',
  },

  // Time
  {
    name: 'time',
    description: 'Current time in seconds',
    doc: '**time** - Current time in seconds\n\nUse in function parameters for time-based animations:\n```javascript\nosc(() => 10 + Math.sin(time) * 5).out()\n```',
    kind: 'constant',
    category: 'global',
    type: 'number',
  },

  // Mouse with properties
  {
    name: 'mouse',
    description: 'Mouse position object with x and y properties',
    doc: '**mouse** - Mouse position object\n\nProperties: `mouse.x` and `mouse.y` (0-1)\n```javascript\nosc(10, 0.1, () => mouse.x).out()\n```',
    kind: 'variable',
    category: 'global',
    type: 'object',
    properties: [
      { name: 'x', type: 'number', description: 'Mouse X position (0-1)' },
      { name: 'y', type: 'number', description: 'Mouse Y position (0-1)' },
    ],
  },

  // Animation speed
  {
    name: 'speed',
    description: 'Global animation speed multiplier',
    doc: '**speed** - Global animation speed multiplier\n\nSet to adjust animation speed:\n```javascript\nspeed = 0.5 // slow down\n```',
    kind: 'variable',
    category: 'global',
    type: 'number',
  },

  // BPM
  {
    name: 'bpm',
    description: 'Beats per minute for audio sync',
    doc: '**bpm** - Beats per minute\n\nSet for audio sync:\n```javascript\nbpm = 120\n```',
    kind: 'variable',
    category: 'global',
    type: 'number',
  },

  // Canvas dimensions
  {
    name: 'width',
    description: 'Canvas width in pixels',
    doc: '**width** - Canvas width in pixels\n\nUse for aspect ratio corrections:\n```javascript\nshape().scale(1, height/width).out()\n```',
    kind: 'constant',
    category: 'global',
    type: 'number',
  },
  {
    name: 'height',
    description: 'Canvas height in pixels',
    doc: '**height** - Canvas height in pixels\n\nUse for aspect ratio corrections:\n```javascript\nshape().scale(1, height/width).out()\n```',
    kind: 'constant',
    category: 'global',
    type: 'number',
  },

  // Audio analyzer with properties
  {
    name: 'a',
    description: 'Audio analyser (FFT data in a.fft)',
    doc: '**a** - Audio analyser\n\nAccess FFT data with `a.fft`:\n```javascript\nosc(10, 0.1, () => a.fft[0] * 10).out()\n```',
    kind: 'variable',
    category: 'global',
    type: 'AudioAnalyser',
    properties: [
      {
        name: 'fft',
        type: 'Array<number>',
        description: 'FFT (Fast Fourier Transform) array - frequency analysis of audio input',
      },
    ],
  },
];
