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
    description: 'Sine wave oscillator source generating RGB color bands',
    doc: 'Generates three phase-shifted sine waves across the x-axis for RGB channels. The frequency parameter controls oscillation count, sync controls animation speed via time multiplication, and offset creates phase shifts between color channels.',
    kind: 'function',
    category: 'source',
    type: 'source',
    params: [
      {
        name: 'frequency',
        type: 'number',
        description: 'Number of oscillations (dimensionless)',
        default: '60',
      },
      {
        name: 'sync',
        type: 'number',
        description: 'Animation speed multiplier (dimensionless)',
        default: '0.1',
      },
      {
        name: 'offset',
        type: 'number',
        description: 'Phase shift amount (dimensionless)',
        default: '0',
      },
    ],
    examples: ['osc(10, 0.1, 0).out()', 'osc(60, 0, 1).out()', 'osc(200, 0.05).out()'],
  },
  {
    name: 'noise',
    description: '3D Perlin noise source',
    doc: 'Generates 3D Perlin noise by sampling at scaled texture coordinates in the xy-plane and animated time in the z-axis. Scale controls spatial frequency (higher = more detail), offset controls animation speed by multiplying time.',
    kind: 'function',
    category: 'source',
    type: 'source',
    params: [
      {
        name: 'scale',
        type: 'number',
        description: 'Spatial frequency multiplier (dimensionless)',
        default: '10',
      },
      {
        name: 'offset',
        type: 'number',
        description: 'Time multiplier for animation (dimensionless)',
        default: '0.1',
      },
    ],
    examples: ['noise(3, 0).out()', 'noise(10, 0.5).out()', 'noise(50, 0.1).out()'],
  },
  {
    name: 'voronoi',
    description: 'Voronoi cell noise source with animated cell points',
    doc: 'Generates Voronoi (cellular) noise by finding the closest randomly-positioned point in each cell. Scale controls cell density, speed multiplies time in a sine function to animate cell point positions, and blending controls edge darkness by multiplying the minimum distance.',
    kind: 'function',
    category: 'source',
    type: 'source',
    params: [
      { name: 'scale', type: 'number', description: 'Cell density (dimensionless)', default: '5' },
      {
        name: 'speed',
        type: 'number',
        description: 'Animation speed multiplier (dimensionless)',
        default: '0.3',
      },
      {
        name: 'blending',
        type: 'number',
        description: 'Edge darkness factor (0-1 typical)',
        default: '0.3',
      },
    ],
    examples: [
      'voronoi(5, 0, 0).out()',
      'voronoi(10, 0.3, 0.3).out()',
      'voronoi(25, 0.1, 0.5).out()',
    ],
  },
  {
    name: 'shape',
    description: 'Regular polygon shape using signed distance field',
    doc: 'Generates a centered regular polygon using polar coordinates and SDF. Sides determines polygon vertex count (3=triangle, 4=square, etc), radius is the distance from center in normalized coordinates, and smoothing controls edge anti-aliasing via smoothstep width.',
    kind: 'function',
    category: 'source',
    type: 'source',
    params: [
      { name: 'sides', type: 'number', description: 'Number of polygon sides (≥3)', default: '3' },
      {
        name: 'radius',
        type: 'number',
        description: 'Distance from center (0-1 normalized)',
        default: '0.3',
      },
      {
        name: 'smoothing',
        type: 'number',
        description: 'Edge smoothness (0-0.1 typical)',
        default: '0.01',
      },
    ],
    examples: ['shape(3, 0.5, 0.01).out()', 'shape(6, 0.3, 0).out()', 'shape(8, 0.4, 0.05).out()'],
  },
  {
    name: 'gradient',
    description: 'Linear gradient source with animated blue channel',
    doc: 'Generates a gradient with red mapped to x-coordinate, green to y-coordinate, and blue oscillating via sin(time*speed). Creates a 2D color ramp that can be animated.',
    kind: 'function',
    category: 'source',
    type: 'source',
    params: [
      {
        name: 'speed',
        type: 'number',
        description: 'Blue channel animation speed (dimensionless)',
        default: '0',
      },
    ],
    examples: ['gradient(0).out()', 'gradient(1).out()', 'gradient(0.5).out()'],
  },
  {
    name: 'src',
    description: 'Sample external source texture',
    doc: 'Samples an external texture source (camera, video, canvas, or output buffer) at current texture coordinates. Coordinates wrap via fract() for values outside [0,1].',
    kind: 'function',
    category: 'source',
    type: 'source',
    params: [
      {
        name: 'source',
        type: 'sampler2D',
        description: 'External source (s0-s3 for inputs, o0-o3 for outputs)',
        default: 's0',
      },
    ],
    examples: ['src(s0).out()', 'src(o0).out()', 'src(s1).out()'],
  },
  {
    name: 'solid',
    description: 'Solid color source',
    doc: 'Generates a uniform color field with specified RGBA values. Each channel accepts values from 0 to 1.',
    kind: 'function',
    category: 'source',
    type: 'source',
    params: [
      { name: 'r', type: 'number', description: 'Red channel (0-1)', default: '0' },
      { name: 'g', type: 'number', description: 'Green channel (0-1)', default: '0' },
      { name: 'b', type: 'number', description: 'Blue channel (0-1)', default: '0' },
      { name: 'a', type: 'number', description: 'Alpha channel (0-1)', default: '1' },
    ],
    examples: ['solid(1, 0, 0, 1).out()', 'solid(0.5, 0.5, 0.5, 1).out()'],
  },
  {
    name: 'prev',
    description: 'Sample previous frame buffer',
    doc: 'Samples the previous frame buffer, enabling feedback effects. Creates temporal recursion where current frame depends on last frame. Essential for trails, echoes, and iterative effects.',
    kind: 'function',
    category: 'source',
    type: 'source',
    examples: ['prev().out()', 'src(o0).blend(osc(), 0.5).out()', 'prev().scrollX(0.01).out()'],
  },

  // === GEOMETRY ===
  {
    name: 'rotate',
    description: 'Rotate texture coordinates using 2D rotation matrix',
    doc: 'Applies 2D rotation to texture coordinates around center point (0.5, 0.5). Uses standard rotation matrix with angle in radians. Total rotation angle is angle + speed*time.',
    kind: 'function',
    category: 'geometry',
    type: 'transform',
    params: [
      { name: 'angle', type: 'number', description: 'Rotation angle (radians)', default: '10' },
      {
        name: 'speed',
        type: 'number',
        description: 'Rotation speed (radians/second)',
        default: '0',
      },
    ],
    examples: [
      'osc().rotate(0.5).out()',
      'osc().rotate(3.14159).out()',
      'osc().rotate(0, 0.1).out()',
    ],
  },
  {
    name: 'scale',
    description: 'Scale texture around pivot point',
    doc: 'Scales texture coordinates by dividing by amount. Values >1 zoom out, values <1 zoom in. xMult and yMult allow non-uniform scaling. offsetX and offsetY define the pivot point in normalized coordinates.',
    kind: 'function',
    category: 'geometry',
    type: 'transform',
    params: [
      {
        name: 'amount',
        type: 'number',
        description: 'Scale factor (>1 zooms out, <1 zooms in)',
        default: '1.5',
      },
      {
        name: 'xMult',
        type: 'number',
        description: 'X-axis multiplier (dimensionless)',
        default: '1',
      },
      {
        name: 'yMult',
        type: 'number',
        description: 'Y-axis multiplier (dimensionless)',
        default: '1',
      },
      { name: 'offsetX', type: 'number', description: 'X pivot point (0-1)', default: '0.5' },
      { name: 'offsetY', type: 'number', description: 'Y pivot point (0-1)', default: '0.5' },
    ],
    examples: ['osc().scale(2).out()', 'osc().scale(0.5).out()', 'osc().scale(2, 1, 2).out()'],
  },
  {
    name: 'pixelate',
    description: 'Quantize texture coordinates to create pixelated effect',
    doc: 'Reduces coordinate resolution by flooring scaled coordinates then dividing back. Creates discrete pixel blocks. pixelX and pixelY control the number of pixels in each axis.',
    kind: 'function',
    category: 'geometry',
    type: 'transform',
    params: [
      {
        name: 'pixelX',
        type: 'number',
        description: 'Horizontal pixel count (dimensionless)',
        default: '20',
      },
      {
        name: 'pixelY',
        type: 'number',
        description: 'Vertical pixel count (dimensionless)',
        default: '20',
      },
    ],
    examples: [
      'osc().pixelate(10, 10).out()',
      'osc().pixelate(5, 20).out()',
      'osc().pixelate(100, 100).out()',
    ],
  },
  {
    name: 'repeat',
    description: 'Tile texture in a grid with alternating row/column offsets',
    doc: 'Multiplies coordinates by repeat counts and wraps with fract(). Applies brick-pattern offset to alternating rows and columns using step(mod()) for checkerboard tiling.',
    kind: 'function',
    category: 'geometry',
    type: 'transform',
    params: [
      {
        name: 'repeatX',
        type: 'number',
        description: 'Horizontal tile count (dimensionless)',
        default: '3',
      },
      {
        name: 'repeatY',
        type: 'number',
        description: 'Vertical tile count (dimensionless)',
        default: '3',
      },
      {
        name: 'offsetX',
        type: 'number',
        description: 'Alternating row offset (dimensionless)',
        default: '0',
      },
      {
        name: 'offsetY',
        type: 'number',
        description: 'Alternating column offset (dimensionless)',
        default: '0',
      },
    ],
    examples: ['shape().repeat(3, 3).out()', 'osc().repeat(4, 4, 0.5, 0.5).out()'],
  },
  {
    name: 'repeatX',
    description: 'Tile texture horizontally with alternating column offset',
    doc: 'Repeats texture along x-axis by multiplying x-coordinate, with optional y-offset for alternating columns.',
    kind: 'function',
    category: 'geometry',
    type: 'transform',
    params: [
      {
        name: 'reps',
        type: 'number',
        description: 'Horizontal repetition count (dimensionless)',
        default: '3',
      },
      {
        name: 'offset',
        type: 'number',
        description: 'Alternating column y-offset (dimensionless)',
        default: '0',
      },
    ],
    examples: ['shape().repeatX(4).out()', 'osc().repeatX(8, 0.5).out()'],
  },
  {
    name: 'repeatY',
    description: 'Tile texture vertically with alternating row offset',
    doc: 'Repeats texture along y-axis by multiplying y-coordinate, with optional x-offset for alternating rows.',
    kind: 'function',
    category: 'geometry',
    type: 'transform',
    params: [
      {
        name: 'reps',
        type: 'number',
        description: 'Vertical repetition count (dimensionless)',
        default: '3',
      },
      {
        name: 'offset',
        type: 'number',
        description: 'Alternating row x-offset (dimensionless)',
        default: '0',
      },
    ],
    examples: ['shape().repeatY(4).out()', 'osc().repeatY(8, 0.5).out()'],
  },
  {
    name: 'kaleid',
    description: 'Kaleidoscope mirror effect using polar coordinates',
    doc: 'Converts to polar coordinates, mirrors angular segments using modulo and absolute value. Creates nSides symmetric wedges reflected around center. Operates in polar space then returns Cartesian.',
    kind: 'function',
    category: 'geometry',
    type: 'transform',
    params: [
      {
        name: 'nSides',
        type: 'number',
        description: 'Number of mirror segments (dimensionless)',
        default: '4',
      },
    ],
    examples: ['osc().kaleid(4).out()', 'osc().kaleid(6).out()', 'osc().kaleid(12).out()'],
  },
  {
    name: 'scroll',
    description: 'Translate texture coordinates with optional animation',
    doc: 'Adds scroll offsets to coordinates then wraps with fract(). Static scrolls shift texture, animated scrolls (speedX/Y) create continuous motion. Formula: st.x += scrollX + time*speedX.',
    kind: 'function',
    category: 'geometry',
    type: 'transform',
    params: [
      {
        name: 'scrollX',
        type: 'number',
        description: 'Static x-offset (dimensionless)',
        default: '0.5',
      },
      {
        name: 'scrollY',
        type: 'number',
        description: 'Static y-offset (dimensionless)',
        default: '0.5',
      },
      {
        name: 'speedX',
        type: 'number',
        description: 'X animation speed (dimensionless/second)',
        default: '0',
      },
      {
        name: 'speedY',
        type: 'number',
        description: 'Y animation speed (dimensionless/second)',
        default: '0',
      },
    ],
    examples: ['osc().scroll(0.1, 0).out()', 'osc().scroll(0, 0, 0.1, 0.1).out()'],
  },
  {
    name: 'scrollX',
    description: 'Translate texture horizontally with optional animation',
    doc: 'Adds offset to x-coordinate then wraps with fract(). Formula: st.x += scrollX + time*speed.',
    kind: 'function',
    category: 'geometry',
    type: 'transform',
    params: [
      {
        name: 'scrollX',
        type: 'number',
        description: 'Static x-offset (dimensionless)',
        default: '0.5',
      },
      {
        name: 'speed',
        type: 'number',
        description: 'Animation speed (dimensionless/second)',
        default: '0',
      },
    ],
    examples: ['osc().scrollX(0.5).out()', 'osc().scrollX(0, 0.1).out()'],
  },
  {
    name: 'scrollY',
    description: 'Translate texture vertically with optional animation',
    doc: 'Adds offset to y-coordinate then wraps with fract(). Formula: st.y += scrollY + time*speed.',
    kind: 'function',
    category: 'geometry',
    type: 'transform',
    params: [
      {
        name: 'scrollY',
        type: 'number',
        description: 'Static y-offset (dimensionless)',
        default: '0.5',
      },
      {
        name: 'speed',
        type: 'number',
        description: 'Animation speed (dimensionless/second)',
        default: '0',
      },
    ],
    examples: ['osc().scrollY(0.5).out()', 'osc().scrollY(0, 0.1).out()'],
  },

  // === COLOR ===
  {
    name: 'posterize',
    description: 'Quantize colors to discrete levels with gamma correction',
    doc: 'Applies gamma correction, multiplies by bins, floors to nearest integer, divides by bins, then applies inverse gamma. Reduces color depth while preserving perceptual brightness via gamma.',
    kind: 'function',
    category: 'color',
    type: 'transform',
    params: [
      {
        name: 'bins',
        type: 'number',
        description: 'Number of discrete color levels per channel (≥1)',
        default: '3',
      },
      {
        name: 'gamma',
        type: 'number',
        description: 'Gamma correction exponent (dimensionless)',
        default: '0.6',
      },
    ],
    examples: ['osc().posterize(3, 1).out()', 'osc().posterize(8, 0.6).out()'],
  },
  {
    name: 'shift',
    description: 'Add offset to RGBA channels with wrapping',
    doc: 'Adds fract(value) to each color channel. Values wrap at 1.0, creating color cycling effects. Operates in RGB space, not HSV despite the name.',
    kind: 'function',
    category: 'color',
    type: 'transform',
    params: [
      {
        name: 'r',
        type: 'number',
        description: 'Red channel offset (wraps at 1.0)',
        default: '0.5',
      },
      {
        name: 'g',
        type: 'number',
        description: 'Green channel offset (wraps at 1.0)',
        default: '0',
      },
      {
        name: 'b',
        type: 'number',
        description: 'Blue channel offset (wraps at 1.0)',
        default: '0',
      },
      {
        name: 'a',
        type: 'number',
        description: 'Alpha channel offset (wraps at 1.0)',
        default: '0',
      },
    ],
    examples: ['osc().shift(0.5, 0, 0).out()', 'osc().shift(0.1, 0.2, 0.3).out()'],
  },
  {
    name: 'invert',
    description: 'Invert RGB channels',
    doc: 'Blends between original color and (1-color). Amount=1 fully inverts, amount=0 unchanged. Formula: (1-rgb)*amount + rgb*(1-amount). Alpha unchanged.',
    kind: 'function',
    category: 'color',
    type: 'transform',
    params: [
      { name: 'amount', type: 'number', description: 'Inversion blend factor (0-1)', default: '1' },
    ],
    examples: ['osc().invert(1).out()', 'osc().invert(0.5).out()'],
  },
  {
    name: 'contrast',
    description: 'Adjust contrast around midpoint',
    doc: 'Subtracts 0.5, multiplies by amount, adds 0.5 back. Amount=1 unchanged, >1 increases contrast, <1 decreases. Formula: (rgb-0.5)*amount + 0.5. Alpha unchanged.',
    kind: 'function',
    category: 'color',
    type: 'transform',
    params: [
      {
        name: 'amount',
        type: 'number',
        description: 'Contrast multiplier (dimensionless)',
        default: '1.6',
      },
    ],
    examples: ['osc().contrast(2).out()', 'osc().contrast(0.5).out()'],
  },
  {
    name: 'brightness',
    description: 'Add constant to RGB channels',
    doc: 'Adds amount to RGB channels. Positive values brighten, negative darken. Alpha unchanged.',
    kind: 'function',
    category: 'color',
    type: 'transform',
    params: [
      {
        name: 'amount',
        type: 'number',
        description: 'Brightness offset (-1 to 1 typical)',
        default: '0.4',
      },
    ],
    examples: ['osc().brightness(0.2).out()', 'osc().brightness(-0.3).out()'],
  },
  {
    name: 'luma',
    description: 'Apply luminance-based alpha keying',
    doc: 'Calculates luminance, applies smoothstep around threshold±tolerance, multiplies RGB by result and sets alpha to result. Creates luminance-based transparency.',
    kind: 'function',
    category: 'color',
    type: 'transform',
    params: [
      {
        name: 'threshold',
        type: 'number',
        description: 'Luminance threshold (0-1)',
        default: '0.5',
      },
      { name: 'tolerance', type: 'number', description: 'Smoothstep width (0-1)', default: '0.1' },
    ],
    examples: ['osc().luma(0.5, 0.1).out()', 'osc().luma(0.7, 0.05).out()'],
  },
  {
    name: 'thresh',
    description: 'Binary threshold based on luminance',
    doc: 'Calculates luminance, applies smoothstep around threshold±tolerance, returns as grayscale. Creates black/white image based on brightness. Alpha unchanged.',
    kind: 'function',
    category: 'color',
    type: 'transform',
    params: [
      {
        name: 'threshold',
        type: 'number',
        description: 'Luminance threshold (0-1)',
        default: '0.5',
      },
      { name: 'tolerance', type: 'number', description: 'Smoothstep width (0-1)', default: '0.04' },
    ],
    examples: ['osc().thresh(0.5, 0).out()', 'osc().thresh(0.5, 0.1).out()'],
  },
  {
    name: 'color',
    description: 'Multiply or invert-multiply RGBA channels',
    doc: 'Positive values multiply channels, negative values multiply (1-channel) by absolute value. Allows selective color scaling or inversion per channel.',
    kind: 'function',
    category: 'color',
    type: 'transform',
    params: [
      { name: 'r', type: 'number', description: 'Red multiplier (negative inverts)', default: '1' },
      {
        name: 'g',
        type: 'number',
        description: 'Green multiplier (negative inverts)',
        default: '1',
      },
      {
        name: 'b',
        type: 'number',
        description: 'Blue multiplier (negative inverts)',
        default: '1',
      },
      {
        name: 'a',
        type: 'number',
        description: 'Alpha multiplier (negative inverts)',
        default: '1',
      },
    ],
    examples: ['osc().color(1, 0, 0).out()', 'osc().color(-1, 1, 1).out()'],
  },
  {
    name: 'saturate',
    description: 'Adjust color saturation',
    doc: 'Mixes between grayscale (using standard luminance weights 0.2125, 0.7154, 0.0721) and original color. Amount=0 full grayscale, amount=1 unchanged, >1 more saturated. Alpha unchanged.',
    kind: 'function',
    category: 'color',
    type: 'transform',
    params: [
      {
        name: 'amount',
        type: 'number',
        description: 'Saturation factor (0=grayscale)',
        default: '2',
      },
    ],
    examples: ['osc().saturate(0).out()', 'osc().saturate(3).out()'],
  },
  {
    name: 'hue',
    description: 'Rotate hue in HSV color space',
    doc: 'Converts RGB to HSV, adds amount to hue channel, converts back to RGB. Hue wraps around color wheel.',
    kind: 'function',
    category: 'color',
    type: 'transform',
    params: [
      {
        name: 'hue',
        type: 'number',
        description: 'Hue rotation amount (wraps at 1.0)',
        default: '0.4',
      },
    ],
    examples: ['osc().hue(0.5).out()', 'osc().hue(1).out()'],
  },
  {
    name: 'colorama',
    description: 'Shift all HSV channels with wrapping',
    doc: 'Converts RGB to HSV, adds amount to all three HSV channels, wraps with fract(), converts back to RGB. Creates psychedelic color cycling.',
    kind: 'function',
    category: 'color',
    type: 'transform',
    params: [
      {
        name: 'amount',
        type: 'number',
        description: 'HSV shift amount (wraps at 1.0)',
        default: '0.005',
      },
    ],
    examples: ['osc().colorama(0.01).out()', 'osc().colorama(0.5).out()'],
  },
  {
    name: 'r',
    description: 'Extract red channel as grayscale',
    doc: 'Returns vec4(red * scale + offset) for all channels. Extracts red channel, applies scale and offset, outputs as grayscale. Use for channel isolation or remapping.',
    kind: 'function',
    category: 'color',
    type: 'transform',
    params: [
      {
        name: 'scale',
        type: 'number',
        description: 'Channel multiplier (dimensionless)',
        default: '1',
      },
      {
        name: 'offset',
        type: 'number',
        description: 'Channel offset (dimensionless)',
        default: '0',
      },
    ],
    examples: ['osc().r().out()', 'gradient().r(2, 0).out()'],
  },
  {
    name: 'g',
    description: 'Extract green channel as grayscale',
    doc: 'Returns vec4(green * scale + offset) for all channels. Extracts green channel, applies scale and offset, outputs as grayscale.',
    kind: 'function',
    category: 'color',
    type: 'transform',
    params: [
      {
        name: 'scale',
        type: 'number',
        description: 'Channel multiplier (dimensionless)',
        default: '1',
      },
      {
        name: 'offset',
        type: 'number',
        description: 'Channel offset (dimensionless)',
        default: '0',
      },
    ],
    examples: ['osc().g().out()', 'gradient().g(2, 0).out()'],
  },
  {
    name: 'b',
    description: 'Extract blue channel as grayscale',
    doc: 'Returns vec4(blue * scale + offset) for all channels. Extracts blue channel, applies scale and offset, outputs as grayscale.',
    kind: 'function',
    category: 'color',
    type: 'transform',
    params: [
      {
        name: 'scale',
        type: 'number',
        description: 'Channel multiplier (dimensionless)',
        default: '1',
      },
      {
        name: 'offset',
        type: 'number',
        description: 'Channel offset (dimensionless)',
        default: '0',
      },
    ],
    examples: ['osc().b().out()', 'gradient().b(2, 0).out()'],
  },
  {
    name: 'a',
    description: 'Extract alpha channel as grayscale',
    doc: 'Returns vec4(alpha * scale + offset) for all channels. Extracts alpha channel, applies scale and offset, outputs as grayscale. Useful for visualizing transparency.',
    kind: 'function',
    category: 'color',
    type: 'transform',
    params: [
      {
        name: 'scale',
        type: 'number',
        description: 'Channel multiplier (dimensionless)',
        default: '1',
      },
      {
        name: 'offset',
        type: 'number',
        description: 'Channel offset (dimensionless)',
        default: '0',
      },
    ],
    examples: ['shape().a().out()', 'osc().luma(0.5, 0.1).a().out()'],
  },

  // === BLEND ===
  {
    name: 'add',
    description: 'Add two textures with blend control',
    doc: 'Blends between source and (source+texture). Formula: (c0+c1)*amount + c0*(1-amount). Amount=1 full addition, amount=0 unchanged.',
    kind: 'function',
    category: 'blend',
    type: 'transform',
    params: [
      { name: 'texture', type: 'source', description: 'Texture to add', default: 'osc()' },
      { name: 'amount', type: 'number', description: 'Blend factor (0-1)', default: '1' },
    ],
    examples: ['osc().add(noise(), 0.5).out()', 'osc().add(osc(20), 1).out()'],
  },
  {
    name: 'sub',
    description: 'Subtract texture with blend control',
    doc: 'Blends between source and (source-texture). Formula: (c0-c1)*amount + c0*(1-amount). Amount=1 full subtraction, amount=0 unchanged.',
    kind: 'function',
    category: 'blend',
    type: 'transform',
    params: [
      { name: 'texture', type: 'source', description: 'Texture to subtract', default: 'osc()' },
      { name: 'amount', type: 'number', description: 'Blend factor (0-1)', default: '1' },
    ],
    examples: ['osc().sub(noise(), 0.5).out()'],
  },
  {
    name: 'mult',
    description: 'Multiply textures with blend control',
    doc: 'Blends between source and (source*texture). Formula: c0*(1-amount) + (c0*c1)*amount. Amount=1 full multiply, amount=0 unchanged.',
    kind: 'function',
    category: 'blend',
    type: 'transform',
    params: [
      { name: 'texture', type: 'source', description: 'Texture to multiply', default: 'osc()' },
      { name: 'amount', type: 'number', description: 'Blend factor (0-1)', default: '1' },
    ],
    examples: ['osc().mult(noise(), 0.5).out()'],
  },
  {
    name: 'blend',
    description: 'Linear interpolation between two textures',
    doc: 'Simple linear blend. Formula: c0*(1-amount) + c1*amount. Amount=0 returns source, amount=1 returns texture.',
    kind: 'function',
    category: 'blend',
    type: 'transform',
    params: [
      { name: 'texture', type: 'source', description: 'Texture to blend with', default: 'osc()' },
      { name: 'amount', type: 'number', description: 'Blend factor (0-1)', default: '0.5' },
    ],
    examples: ['osc().blend(noise(), 0.5).out()', 'solid(1,0,0).blend(solid(0,0,1), 0.5).out()'],
  },
  {
    name: 'diff',
    description: 'Absolute difference between textures',
    doc: 'Returns abs(c0.rgb - c1.rgb). Alpha is max(c0.a, c1.a). Creates edge-detection-like effects when textures differ.',
    kind: 'function',
    category: 'blend',
    type: 'transform',
    params: [
      { name: 'texture', type: 'source', description: 'Texture to diff against', default: 'osc()' },
    ],
    examples: ['osc().diff(osc(20)).out()', 'osc().diff(noise()).out()'],
  },
  {
    name: 'layer',
    description: 'Alpha compositing (layer texture over source)',
    doc: 'Uses texture alpha to blend RGB, adds alphas (clamped to 1). Formula: mix(c0.rgb, c1.rgb, c1.a) with alpha = clamp(c0.a + c1.a, 0, 1).',
    kind: 'function',
    category: 'blend',
    type: 'transform',
    params: [
      { name: 'texture', type: 'source', description: 'Texture to layer on top', default: 'osc()' },
    ],
    examples: ['solid(0, 0, 0).layer(shape()).out()', 'osc().layer(shape(4, 0.5)).out()'],
  },
  {
    name: 'mask',
    description: 'Multiply source by texture luminance',
    doc: 'Calculates luminance of texture, multiplies source RGB by it, sets alpha to luminance*source.alpha. Creates luminance-based masking.',
    kind: 'function',
    category: 'blend',
    type: 'transform',
    params: [
      {
        name: 'texture',
        type: 'source',
        description: 'Luminance mask texture',
        default: 'shape()',
      },
    ],
    examples: ['osc().mask(shape(4)).out()', 'noise().mask(voronoi()).out()'],
  },

  // === MODULATE ===
  {
    name: 'modulate',
    description: 'Displace texture coordinates using texture RGB',
    doc: 'Adds texture.xy*amount to coordinates. Uses red channel for x-displacement, green for y. Creates distortion effects based on texture brightness patterns.',
    kind: 'function',
    category: 'modulate',
    type: 'transform',
    params: [
      {
        name: 'texture',
        type: 'source',
        description: 'Displacement map texture',
        default: 'osc()',
      },
      {
        name: 'amount',
        type: 'number',
        description: 'Displacement magnitude (dimensionless)',
        default: '0.1',
      },
    ],
    examples: ['osc().modulate(noise(), 0.1).out()', 'shape().modulate(voronoi(), 0.5).out()'],
  },
  {
    name: 'modulateRotate',
    description: 'Modulate rotation angle using texture',
    doc: 'Rotation angle = offset + texture.r * multiple, applied as 2D rotation matrix. Angle in radians. Modulates rotation amount based on texture red channel.',
    kind: 'function',
    category: 'modulate',
    type: 'transform',
    params: [
      {
        name: 'texture',
        type: 'source',
        description: 'Rotation modulation texture',
        default: 'osc()',
      },
      {
        name: 'multiple',
        type: 'number',
        description: 'Rotation sensitivity (radians)',
        default: '1',
      },
      { name: 'offset', type: 'number', description: 'Base rotation (radians)', default: '0' },
    ],
    examples: ['osc().modulateRotate(noise(), 1).out()'],
  },
  {
    name: 'modulateScale',
    description: 'Modulate scale using texture',
    doc: 'Scale per axis = 1/(offset + multiple * texture.r/g). Red channel modulates x-scale, green modulates y-scale. Creates texture-driven zoom effects.',
    kind: 'function',
    category: 'modulate',
    type: 'transform',
    params: [
      {
        name: 'texture',
        type: 'source',
        description: 'Scale modulation texture',
        default: 'osc()',
      },
      {
        name: 'multiple',
        type: 'number',
        description: 'Scale sensitivity (dimensionless)',
        default: '1',
      },
      {
        name: 'offset',
        type: 'number',
        description: 'Base scale divisor (dimensionless)',
        default: '1',
      },
    ],
    examples: ['osc().modulateScale(noise(), 1).out()'],
  },
  {
    name: 'modulatePixelate',
    description: 'Modulate pixelation using texture',
    doc: 'Pixel count per axis = offset + texture.x/y * multiple. Red channel modulates x-pixelation, green modulates y. Creates variable-resolution effects.',
    kind: 'function',
    category: 'modulate',
    type: 'transform',
    params: [
      {
        name: 'texture',
        type: 'source',
        description: 'Pixelation modulation texture',
        default: 'osc()',
      },
      {
        name: 'multiple',
        type: 'number',
        description: 'Pixelation sensitivity (dimensionless)',
        default: '10',
      },
      {
        name: 'offset',
        type: 'number',
        description: 'Base pixelation (dimensionless)',
        default: '3',
      },
    ],
    examples: ['osc().modulatePixelate(noise(), 10, 3).out()'],
  },
  {
    name: 'modulateScrollX',
    description: 'Modulate horizontal scroll using texture',
    doc: 'Adds (texture.r * scrollX + time*speed) to x-coordinate. Red channel controls scroll amount. Creates texture-driven horizontal displacement.',
    kind: 'function',
    category: 'modulate',
    type: 'transform',
    params: [
      {
        name: 'texture',
        type: 'source',
        description: 'Scroll modulation texture',
        default: 'osc()',
      },
      {
        name: 'scrollX',
        type: 'number',
        description: 'Scroll sensitivity (dimensionless)',
        default: '0.5',
      },
      {
        name: 'speed',
        type: 'number',
        description: 'Animation speed (dimensionless/second)',
        default: '0',
      },
    ],
    examples: ['osc().modulateScrollX(noise(), 0.5).out()'],
  },
  {
    name: 'modulateScrollY',
    description: 'Modulate vertical scroll using texture',
    doc: 'Adds (texture.r * scrollY + time*speed) to y-coordinate. Red channel controls scroll amount. Creates texture-driven vertical displacement.',
    kind: 'function',
    category: 'modulate',
    type: 'transform',
    params: [
      {
        name: 'texture',
        type: 'source',
        description: 'Scroll modulation texture',
        default: 'osc()',
      },
      {
        name: 'scrollY',
        type: 'number',
        description: 'Scroll sensitivity (dimensionless)',
        default: '0.5',
      },
      {
        name: 'speed',
        type: 'number',
        description: 'Animation speed (dimensionless/second)',
        default: '0',
      },
    ],
    examples: ['osc().modulateScrollY(noise(), 0.5).out()'],
  },
  {
    name: 'modulateKaleid',
    description: 'Modulate kaleidoscope radius using texture',
    doc: 'Applies kaleidoscope with radius modulated by texture.r. Radius = (texture.r + original_radius). Creates variable mirror-segment distances.',
    kind: 'function',
    category: 'modulate',
    type: 'transform',
    params: [
      {
        name: 'texture',
        type: 'source',
        description: 'Radius modulation texture',
        default: 'osc()',
      },
      {
        name: 'nSides',
        type: 'number',
        description: 'Number of mirror segments (dimensionless)',
        default: '4',
      },
    ],
    examples: ['osc().modulateKaleid(noise(), 4).out()'],
  },
  {
    name: 'modulateHue',
    description: 'Displace coordinates using texture color differences',
    doc: 'Adds vec2(texture.g-texture.r, texture.b-texture.g)*amount/resolution to coordinates. Uses color channel differences for displacement. Creates chromatic-aberration-like effects.',
    kind: 'function',
    category: 'modulate',
    type: 'transform',
    params: [
      { name: 'texture', type: 'source', description: 'Hue modulation texture', default: 'osc()' },
      {
        name: 'amount',
        type: 'number',
        description: 'Displacement magnitude (dimensionless)',
        default: '1',
      },
    ],
    examples: ['osc().modulateHue(noise(), 1).out()'],
  },
  {
    name: 'modulateRepeat',
    description: 'Modulate grid repetition using texture',
    doc: 'Applies repeat() with red channel modulating x-offset and green channel modulating y-offset. Creates texture-driven brick pattern tiling.',
    kind: 'function',
    category: 'modulate',
    type: 'transform',
    params: [
      {
        name: 'texture',
        type: 'source',
        description: 'Repeat modulation texture',
        default: 'osc()',
      },
      {
        name: 'repeatX',
        type: 'number',
        description: 'Horizontal tile count (dimensionless)',
        default: '3',
      },
      {
        name: 'repeatY',
        type: 'number',
        description: 'Vertical tile count (dimensionless)',
        default: '3',
      },
      {
        name: 'offsetX',
        type: 'number',
        description: 'Offset sensitivity (dimensionless)',
        default: '0.5',
      },
      {
        name: 'offsetY',
        type: 'number',
        description: 'Offset sensitivity (dimensionless)',
        default: '0.5',
      },
    ],
    examples: ['osc().modulateRepeat(noise(), 3, 3, 0.5, 0.5).out()'],
  },
  {
    name: 'modulateRepeatX',
    description: 'Modulate horizontal repetition using texture',
    doc: 'Applies repeatX() with red channel modulating y-offset. Creates texture-driven horizontal tiling with variable column offsets.',
    kind: 'function',
    category: 'modulate',
    type: 'transform',
    params: [
      {
        name: 'texture',
        type: 'source',
        description: 'Repeat modulation texture',
        default: 'osc()',
      },
      {
        name: 'reps',
        type: 'number',
        description: 'Horizontal repetition count (dimensionless)',
        default: '3',
      },
      {
        name: 'offset',
        type: 'number',
        description: 'Offset sensitivity (dimensionless)',
        default: '0.5',
      },
    ],
    examples: ['osc().modulateRepeatX(noise(), 4, 0.5).out()'],
  },
  {
    name: 'modulateRepeatY',
    description: 'Modulate vertical repetition using texture',
    doc: 'Applies repeatY() with red channel modulating x-offset. Creates texture-driven vertical tiling with variable row offsets.',
    kind: 'function',
    category: 'modulate',
    type: 'transform',
    params: [
      {
        name: 'texture',
        type: 'source',
        description: 'Repeat modulation texture',
        default: 'osc()',
      },
      {
        name: 'reps',
        type: 'number',
        description: 'Vertical repetition count (dimensionless)',
        default: '3',
      },
      {
        name: 'offset',
        type: 'number',
        description: 'Offset sensitivity (dimensionless)',
        default: '0.5',
      },
    ],
    examples: ['osc().modulateRepeatY(noise(), 4, 0.5).out()'],
  },

  // === OUTPUT ===
  {
    name: 'out',
    description: 'Render output to specified buffer',
    doc: 'Renders the current chain to an output buffer (o0-o3). Default is o0. Output buffers can be sampled by src() and are visible when rendered to screen.',
    kind: 'function',
    category: 'output',
    type: 'void',
    params: [
      { name: 'buffer', type: 'output', description: 'Output buffer (o0-o3)', default: 'o0' },
    ],
    examples: ['osc().out()', 'osc().out(o1)', 'shape().kaleid(4).out(o2)'],
  },
  {
    name: 'render',
    description: 'Render to buffer without displaying',
    doc: 'Renders to specified buffer but does not display it. Used for multi-buffer compositions where you want to prepare textures for later use with src().',
    kind: 'function',
    category: 'output',
    type: 'void',
    params: [
      { name: 'buffer', type: 'output', description: 'Output buffer (o0-o3)', default: 'o0' },
    ],
    examples: ['osc().render(o1)'],
  },

  // === SYNTH GLOBALS ===
  {
    name: 'time',
    description: 'Global time variable in seconds',
    doc: 'Read-only global variable representing elapsed time in seconds since Hydra started. Increments continuously. Commonly used in arrow functions for animation.',
    kind: 'variable',
    category: 'synth',
    type: 'number',
    examples: [
      'osc(() => 10 + Math.sin(time) * 5).out()',
      'shape(3, () => 0.3 + time * 0.1).out()',
    ],
  },
  {
    name: 'mouse',
    description: 'Mouse position object',
    doc: 'Read-only global object with properties mouse.x and mouse.y representing normalized mouse coordinates (0-1). Updates on mouse movement.',
    kind: 'variable',
    category: 'synth',
    type: 'object',
    examples: ['osc(() => mouse.x * 100).out()', 'shape(4, () => mouse.y).out()'],
  },
  {
    name: 'speed',
    description: 'Global animation speed multiplier',
    doc: 'Writable global variable that multiplies the rate of time progression. Default 1. Values >1 speed up animations, <1 slow down. Affects all time-based parameters.',
    kind: 'variable',
    category: 'synth',
    type: 'number',
    examples: ['speed = 0.5', 'speed = 2'],
  },
  {
    name: 'bpm',
    description: 'Beats per minute for audio sync',
    doc: 'Writable global variable for synchronizing animations to beats per minute. Used internally by array methods for timing. Set to match audio tempo.',
    kind: 'variable',
    category: 'synth',
    type: 'number',
    examples: ['bpm = 120', 'bpm = 140'],
  },

  // === ARRAY METHODS ===
  {
    name: 'fast',
    description: 'Multiply array cycling speed',
    doc: 'Multiplies the rate at which array values cycle. Speed=2 cycles twice as fast. Formula: index = time * speed * (bpm/60). Does not affect interpolation.',
    kind: 'function',
    category: 'array',
    type: 'array',
    params: [
      {
        name: 'speed',
        type: 'number',
        description: 'Speed multiplier (dimensionless)',
        default: '1',
      },
    ],
    examples: ['osc([10, 20, 30].fast(2)).out()', 'osc([5, 15, 25].fast(0.5)).out()'],
  },
  {
    name: 'smooth',
    description: 'Enable linear interpolation between array values',
    doc: 'Enables linear interpolation with smoothing window. Amount controls interpolation window size. Amount=1 interpolates over one full array cycle. Uses linear easing by default unless .ease() is chained.',
    kind: 'function',
    category: 'array',
    type: 'array',
    params: [
      {
        name: 'amount',
        type: 'number',
        description: 'Interpolation window size (dimensionless)',
        default: '1',
      },
    ],
    examples: ['osc([10, 50].smooth()).out()', 'osc([0, 100].smooth(0.5)).out()'],
  },
  {
    name: 'ease',
    description: 'Apply easing function to array interpolation',
    doc: 'Sets easing function for array value transitions. Automatically enables smooth(1). Accepts easing function name (string) or custom function. Available: linear, sin, tri, sqr, etc.',
    kind: 'function',
    category: 'array',
    type: 'array',
    params: [
      {
        name: 'ease',
        type: 'string',
        description: 'Easing function name or function',
        default: 'linear',
      },
    ],
    examples: ['osc([10, 50].ease("sin")).out()', 'osc([0, 100].ease("tri")).out()'],
  },
  {
    name: 'offset',
    description: 'Phase shift array cycling timing',
    doc: 'Adds temporal offset to array index calculation. Offset is modulo 1.0. Use to desynchronize multiple arrays or start at different positions.',
    kind: 'function',
    category: 'array',
    type: 'array',
    params: [
      { name: 'offset', type: 'number', description: 'Time offset (wraps at 1.0)', default: '0.5' },
    ],
    examples: ['osc([10, 20, 30].offset(0.5)).out()', 'osc([5, 15].offset(0.25)).out()'],
  },
  {
    name: 'fit',
    description: 'Remap array values to new range',
    doc: 'Linearly maps array values from their current min/max to specified min/max. Finds array extrema, then applies linear interpolation: map(value, oldMin, oldMax, newMin, newMax).',
    kind: 'function',
    category: 'array',
    type: 'array',
    params: [
      { name: 'min', type: 'number', description: 'New minimum value', default: '0' },
      { name: 'max', type: 'number', description: 'New maximum value', default: '1' },
    ],
    examples: ['osc([0, 1, 2].fit(10, 20)).out()', 'osc([5, 10, 15].fit(0, 1)).out()'],
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
    description: 'External input source 0',
    doc: 'Texture input slot for external sources (webcam, video, canvas, image). Initialize with s0.initCam(), s0.initVideo(), s0.initImage(), or s0.init(). Access via src(s0).',
    kind: 'variable',
    category: 'global',
    type: 'Source',
    examples: ['s0.initCam()', 'src(s0).out()'],
  },
  {
    name: 's1',
    description: 'External input source 1',
    doc: 'Texture input slot for external sources. Second independent input. Initialize and access same as s0.',
    kind: 'variable',
    category: 'global',
    type: 'Source',
    examples: ['s1.initVideo("video.mp4")', 'src(s1).out()'],
  },
  {
    name: 's2',
    description: 'External input source 2',
    doc: 'Texture input slot for external sources. Third independent input. Initialize and access same as s0.',
    kind: 'variable',
    category: 'global',
    type: 'Source',
    examples: ['s2.initImage("image.jpg")', 'src(s2).out()'],
  },
  {
    name: 's3',
    description: 'External input source 3',
    doc: 'Texture input slot for external sources. Fourth independent input. Initialize and access same as s0.',
    kind: 'variable',
    category: 'global',
    type: 'Source',
    examples: ['s3.init({src: canvas})', 'src(s3).out()'],
  },

  // Output buffers (o0-o3)
  {
    name: 'o0',
    description: 'Output buffer 0 (default)',
    doc: 'Primary framebuffer for rendering. Default target for out(). Can be sampled via src(o0) for feedback effects. Displayed on screen.',
    kind: 'variable',
    category: 'global',
    type: 'Output',
    examples: ['osc().out(o0)', 'src(o0).blend(osc(), 0.5).out()'],
  },
  {
    name: 'o1',
    description: 'Output buffer 1',
    doc: 'Secondary framebuffer. Use for multi-buffer compositions. Access via src(o1).',
    kind: 'variable',
    category: 'global',
    type: 'Output',
    examples: ['noise().out(o1)', 'src(o1).kaleid(4).out()'],
  },
  {
    name: 'o2',
    description: 'Output buffer 2',
    doc: 'Tertiary framebuffer. Use for multi-buffer compositions. Access via src(o2).',
    kind: 'variable',
    category: 'global',
    type: 'Output',
    examples: ['shape().out(o2)', 'src(o2).add(osc()).out()'],
  },
  {
    name: 'o3',
    description: 'Output buffer 3',
    doc: 'Quaternary framebuffer. Use for multi-buffer compositions. Access via src(o3).',
    kind: 'variable',
    category: 'global',
    type: 'Output',
    examples: ['voronoi().out(o3)', 'src(o3).modulateRotate(noise()).out()'],
  },

  // Time
  {
    name: 'time',
    description: 'Elapsed time in seconds',
    doc: 'Read-only global containing seconds elapsed since Hydra started. Increments continuously. Use in arrow functions for time-based animations. Affected by speed multiplier.',
    kind: 'constant',
    category: 'global',
    type: 'number',
    examples: ['osc(() => 10 + Math.sin(time) * 5).out()', 'rotate(() => time * 0.1).out()'],
  },

  // Mouse with properties
  {
    name: 'mouse',
    description: 'Mouse position object',
    doc: 'Read-only object with x and y properties representing normalized mouse coordinates (0-1). Origin at top-left. Updates on mouse movement over canvas.',
    kind: 'variable',
    category: 'global',
    type: 'object',
    properties: [
      { name: 'x', type: 'number', description: 'Horizontal position (0=left, 1=right)' },
      { name: 'y', type: 'number', description: 'Vertical position (0=top, 1=bottom)' },
    ],
    examples: ['osc(() => mouse.x * 100).out()', 'shape(4, () => mouse.y).out()'],
  },

  // Animation speed
  {
    name: 'speed',
    description: 'Global time multiplier',
    doc: 'Writable global that multiplies time progression rate. Default 1. Affects all time-dependent parameters and animations. Set to 0 to pause, >1 to speed up, <1 to slow down.',
    kind: 'variable',
    category: 'global',
    type: 'number',
    examples: ['speed = 0.5', 'speed = 2', 'speed = 0'],
  },

  // BPM
  {
    name: 'bpm',
    description: 'Beats per minute',
    doc: 'Writable global for synchronizing to musical tempo. Used by array cycling methods for timing. Set to match audio BPM. Default affects array speed calculation: index = time * speed * (bpm/60).',
    kind: 'variable',
    category: 'global',
    type: 'number',
    examples: ['bpm = 120', 'bpm = 140', 'osc([10, 20, 30]).out()'],
  },

  // Canvas dimensions
  {
    name: 'width',
    description: 'Canvas width in pixels',
    doc: 'Read-only global containing canvas width in pixels. Use for aspect ratio calculations or resolution-dependent effects.',
    kind: 'constant',
    category: 'global',
    type: 'number',
    examples: ['shape().scale(1, height/width).out()', 'osc(() => width / 100).out()'],
  },
  {
    name: 'height',
    description: 'Canvas height in pixels',
    doc: 'Read-only global containing canvas height in pixels. Use for aspect ratio calculations or resolution-dependent effects.',
    kind: 'constant',
    category: 'global',
    type: 'number',
    examples: ['shape().scale(height/width, 1).out()', 'osc(() => height / 100).out()'],
  },

  // Audio analyzer with properties
  {
    name: 'a',
    description: 'Audio analyzer object',
    doc: 'Audio analysis object containing FFT (Fast Fourier Transform) data in a.fft array. Requires audio initialization. Array contains frequency bins (low to high frequencies). Use for audio-reactive visuals.',
    kind: 'variable',
    category: 'global',
    type: 'AudioAnalyser',
    properties: [
      {
        name: 'fft',
        type: 'Array<number>',
        description: 'FFT array with frequency bin amplitudes (0-1 normalized)',
      },
    ],
    examples: ['osc(() => a.fft[0] * 100).out()', 'shape(4, () => a.fft[10]).out()'],
  },
];
