/**
 * Hydra Global API Type Definitions for Monaco Editor IntelliSense
 *
 * PURPOSE:
 * Provides complete ambient type definitions for Hydra's user-facing global API.
 * These types enable autocomplete, hover documentation, and parameter hints in Monaco editor
 * when users write Hydra patches.
 *
 * IMPORTANT:
 * - This file is NOT imported as TypeScript types
 * - It's loaded as RAW TEXT via monaco-setup.ts and injected into Monaco's language service
 * - The types exist only in Monaco's virtual environment, not in the application's type system
 *
 * SCOPE:
 * - Complete user-facing Hydra API: osc(), noise(), shape(), gradient(), etc.
 * - All chainable Source methods: geometry, color, blend, modulate operations
 * - Global constants: s0-s3 (sources), o0-o3 (outputs), time, mouse, bpm, etc.
 * - Array extensions for modulation: .fast(), .smooth(), .ease(), etc.
 *
 * RELATIONSHIP TO OTHER FILES:
 * - This file: Ambient types for user code IntelliSense (Monaco only)
 * - shared/hydra-synth.d.ts: Runtime instance types for programmatic usage
 * - hydra-execution.ts: Runtime utilities that execute user code with these globals
 *
 * REFERENCE:
 * Based on Hydra API documentation: https://hydra.ojack.xyz/api/
 */

/**
 * Number type for Hydra parameters
 * Can be a static number, a function returning a number, or an array of numbers
 */
type _number = number | (() => number) | Array<number>;

/**
 * Chainable source interface for Hydra visual synthesis
 * All transform methods return Source to enable method chaining
 */
interface Source {
  // === GEOMETRY TRANSFORMS ===

  /**
   * Rotates the visual texture
   * @param angle Rotation angle in radians (default: 10)
   * @param speed Rotation speed multiplier (default: 0)
   * @example osc().rotate(Math.PI / 4).out()
   */
  rotate(angle?: _number, speed?: _number): Source;

  /**
   * Scales the visual texture
   * @param amount Scale factor (default: 1.5)
   * @param xMult X-axis multiplier (default: 1)
   * @param yMult Y-axis multiplier (default: 1)
   * @param offsetX X-axis offset (default: 0.5)
   * @param offsetY Y-axis offset (default: 0.5)
   * @example osc().scale(1.5).out()
   */
  scale(
    amount?: _number,
    xMult?: _number,
    yMult?: _number,
    offsetX?: _number,
    offsetY?: _number,
  ): Source;

  /**
   * Pixelates the visual texture
   * @param pixelX Horizontal pixel size (default: 20)
   * @param pixelY Vertical pixel size (default: 20)
   * @example osc().pixelate(20, 20).out()
   */
  pixelate(pixelX?: _number, pixelY?: _number): Source;

  /**
   * Repeats the visual texture
   * @param repeatX Number of horizontal repeats (default: 3)
   * @param repeatY Number of vertical repeats (default: 3)
   * @param offsetX Horizontal offset (default: 0)
   * @param offsetY Vertical offset (default: 0)
   * @example osc().repeat(3, 3).out()
   */
  repeat(repeatX?: _number, repeatY?: _number, offsetX?: _number, offsetY?: _number): Source;

  /**
   * Repeats the texture along the X-axis
   * @param reps Number of horizontal repeats (default: 3)
   * @param offset Horizontal offset (default: 0)
   * @example osc().repeatX(4, 0.1).out()
   */
  repeatX(reps?: _number, offset?: _number): Source;

  /**
   * Repeats the texture along the Y-axis
   * @param reps Number of vertical repeats (default: 3)
   * @param offset Vertical offset (default: 0)
   * @example osc().repeatY(4, 0.1).out()
   */
  repeatY(reps?: _number, offset?: _number): Source;

  /**
   * Applies kaleidoscope effect
   * @param nSides Number of kaleidoscope sides (default: 4)
   * @example osc().kaleid(4).out()
   */
  kaleid(nSides?: _number): Source;

  /**
   * Scrolls the visual texture
   * @param scrollX Horizontal scroll speed (default: 0.5)
   * @param scrollY Vertical scroll speed (default: 0.5)
   * @param speedX Horizontal scroll speed multiplier (default: 0)
   * @param speedY Vertical scroll speed multiplier (default: 0)
   * @example osc().scroll(0.5, 0.5).out()
   */
  scroll(scrollX?: _number, scrollY?: _number, speedX?: _number, speedY?: _number): Source;

  /**
   * Scrolls texture horizontally
   * @param scrollX Horizontal scroll amount (default: 0.5)
   * @param speed Scroll speed multiplier (default: 0)
   * @example osc().scrollX(0.5).out()
   */
  scrollX(scrollX?: _number, speed?: _number): Source;

  /**
   * Scrolls texture vertically
   * @param scrollY Vertical scroll amount (default: 0.5)
   * @param speed Scroll speed multiplier (default: 0)
   * @example osc().scrollY(0.5).out()
   */
  scrollY(scrollY?: _number, speed?: _number): Source;

  // === COLOR TRANSFORMS ===

  /**
   * Reduces color depth (posterization)
   * @param bins Number of color bins (default: 3)
   * @param gamma Gamma correction (default: 0.6)
   * @example osc().posterize(3, 0.6).out()
   */
  posterize(bins?: _number, gamma?: _number): Source;

  /**
   * Shifts color channels
   * @param r Red shift amount (default: 0.5)
   * @param g Green shift amount (default: 0)
   * @param b Blue shift amount (default: 0)
   * @param a Alpha shift amount (default: 0)
   * @example osc().shift(0.5).out()
   */
  shift(r?: _number, g?: _number, b?: _number, a?: _number): Source;

  /**
   * Inverts colors
   * @param amount Inversion amount 0-1 (default: 1)
   * @example osc().invert(1).out()
   */
  invert(amount?: _number): Source;

  /**
   * Adjusts contrast
   * @param amount Contrast amount (default: 1.6)
   * @example osc().contrast(1.6).out()
   */
  contrast(amount?: _number): Source;

  /**
   * Adjusts brightness
   * @param amount Brightness amount (default: 0.4)
   * @example osc().brightness(0.4).out()
   */
  brightness(amount?: _number): Source;

  /**
   * Applies color threshold
   * @param threshold Threshold value (default: 0.5)
   * @param tolerance Tolerance range (default: 0.04)
   * @example osc().thresh(0.5, 0.04).out()
   */
  thresh(threshold?: _number, tolerance?: _number): Source;

  /**
   * Applies luma (luminance-based) effect
   * @param threshold Luma threshold (default: 0.5)
   * @param tolerance Tolerance range (default: 0.1)
   * @example osc().luma(0.5, 0.1).out()
   */
  luma(threshold?: _number, tolerance?: _number): Source;

  /**
   * Adjusts color saturation
   * @param amount Saturation amount (default: 2)
   * @example osc().saturate(2).out()
   */
  saturate(amount?: _number): Source;

  /**
   * Adjusts hue
   * @param amount Hue rotation amount (default: 0.4)
   * @example osc().hue(0.4).out()
   */
  hue(amount?: _number): Source;

  /**
   * Sets or modulates RGBA color values
   * @param r Red channel value (default: 1)
   * @param g Green channel value (default: 1)
   * @param b Blue channel value (default: 1)
   * @param a Alpha channel value (default: 1)
   * @example osc().color(1, 0, 0).out()
   */
  color(r?: _number, g?: _number, b?: _number, a?: _number): Source;

  /**
   * Applies RGB color shift/displacement effect
   * @param amount Color shift amount (default: 0.005)
   * @example osc().colorama(0.005).out()
   */
  colorama(amount?: _number): Source;

  /**
   * Extracts and scales the red color channel
   * @param scale Red channel scale factor (default: 1)
   * @param offset Red channel offset (default: 0)
   * @example osc().r(1, 0).out()
   */
  r(scale?: _number, offset?: _number): Source;

  /**
   * Extracts and scales the green color channel
   * @param scale Green channel scale factor (default: 1)
   * @param offset Green channel offset (default: 0)
   * @example osc().g(1, 0).out()
   */
  g(scale?: _number, offset?: _number): Source;

  /**
   * Extracts and scales the blue color channel
   * @param scale Blue channel scale factor (default: 1)
   * @param offset Blue channel offset (default: 0)
   * @example osc().b(1, 0).out()
   */
  b(scale?: _number, offset?: _number): Source;

  /**
   * Extracts and scales the alpha channel
   * @param scale Alpha channel scale factor (default: 1)
   * @param offset Alpha channel offset (default: 0)
   * @example osc().a(1, 0).out()
   */
  a(scale?: _number, offset?: _number): Source;

  // === BLEND OPERATIONS ===

  /**
   * Adds another source
   * @param source Source to add
   * @param amount Blend amount (default: 0.5)
   * @example osc().add(noise()).out()
   */
  add(source: Source | Output | Texture, amount?: _number): Source;

  /**
   * Subtracts another source
   * @param source Source to subtract
   * @param amount Blend amount (default: 0.5)
   * @example osc().sub(noise()).out()
   */
  sub(source: Source | Output | Texture, amount?: _number): Source;

  /**
   * Multiplies with another source
   * @param source Source to multiply
   * @param amount Blend amount (default: 0.5)
   * @example osc().mult(noise()).out()
   */
  mult(source: Source | Output | Texture, amount?: _number): Source;

  /**
   * Blends with another source
   * @param source Source to blend
   * @param amount Blend amount 0-1 (default: 0.5)
   * @example osc().blend(noise(), 0.5).out()
   */
  blend(source: Source | Output | Texture, amount?: _number): Source;

  /**
   * Calculates difference with another source
   * @param texture Source to diff
   * @example osc().diff(noise()).out()
   */
  diff(texture: Source | Output | Texture): Source;

  /**
   * Layers another source on top
   * @param texture Source to layer
   * @example osc().layer(noise()).out()
   */
  layer(texture: Source | Output | Texture): Source;

  /**
   * Uses another source as a mask
   * @param texture Source to use as mask
   * @example osc().mask(noise()).out()
   */
  mask(texture: Source | Output | Texture): Source;

  // === MODULATE OPERATIONS ===

  /**
   * Modulates coordinates using another source
   * @param source Modulation source
   * @param amount Modulation amount (default: 0.1)
   * @example osc().modulate(noise(), 0.1).out()
   */
  modulate(source: Source | Output | Texture, amount?: _number): Source;

  /**
   * Modulates rotation using another source
   * @param source Modulation source
   * @param amount Rotation modulation amount (default: 0.1)
   * @param offset Rotation offset (default: 0)
   * @example osc().modulateRotate(noise(), 0.1).out()
   */
  modulateRotate(source: Source | Output | Texture, amount?: _number, offset?: _number): Source;

  /**
   * Modulates scale using another source
   * @param source Modulation source
   * @param amount Scale modulation amount (default: 0.1)
   * @param offset Scale offset (default: 0.5)
   * @example osc().modulateScale(noise(), 0.1).out()
   */
  modulateScale(source: Source | Output | Texture, amount?: _number, offset?: _number): Source;

  /**
   * Modulates pixel coordinates using another source
   * @param source Modulation source
   * @param amount Modulation amount (default: 0.1)
   * @param offset Pixel offset (default: 0.5)
   * @example osc().modulatePixelate(noise(), 10).out()
   */
  modulatePixelate(source: Source | Output | Texture, amount?: _number, offset?: _number): Source;

  /**
   * Modulates kaleidoscope effect using another source
   * @param source Modulation source
   * @param nSides Number of sides (default: 4)
   * @example osc().modulateKaleid(noise(), 4).out()
   */
  modulateKaleid(source: Source | Output | Texture, nSides?: _number): Source;

  /**
   * Modulates hue using another source
   * @param source Modulation source
   * @param amount Hue modulation amount (default: 0.4)
   * @example osc().modulateHue(noise(), 0.4).out()
   */
  modulateHue(source: Source | Output | Texture, amount?: _number): Source;

  /**
   * Modulates scroll using another source
   * @param source Modulation source
   * @param scrollX Horizontal scroll amount (default: 0.5)
   * @param scrollY Vertical scroll amount (default: 0.5)
   * @param speedX Horizontal speed (default: 0)
   * @param speedY Vertical speed (default: 0)
   * @example osc().modulateScrollX(noise(), 0.5).out()
   */
  modulateScrollX(
    source: Source | Output | Texture,
    scrollX?: _number,
    scrollY?: _number,
    speedX?: _number,
    speedY?: _number,
  ): Source;

  /**
   * Modulates vertical scroll using another source
   * @param source Modulation source
   * @param scrollY Vertical scroll amount (default: 0.5)
   * @param speedY Vertical speed (default: 0)
   * @example osc().modulateScrollY(noise(), 0.5).out()
   */
  modulateScrollY(source: Source | Output | Texture, scrollY?: _number, speedY?: _number): Source;

  /**
   * Modulates repetition using another source
   * @param source Modulation source
   * @param repeatX Horizontal repeat count (default: 3)
   * @param repeatY Vertical repeat count (default: 3)
   * @param offsetX Horizontal offset (default: 0.5)
   * @param offsetY Vertical offset (default: 0.5)
   * @example osc().modulateRepeat(noise(), 3, 3).out()
   */
  modulateRepeat(
    source: Source | Output | Texture,
    repeatX?: _number,
    repeatY?: _number,
    offsetX?: _number,
    offsetY?: _number,
  ): Source;

  /**
   * Modulates X-axis repetition using another source
   * @param texture Modulation source
   * @param reps Number of X repetitions (default: 3)
   * @param offset X-axis offset (default: 0.5)
   * @example osc().modulateRepeatX(noise(), 3, 0.5).out()
   */
  modulateRepeatX(texture: Source | Output | Texture, reps?: _number, offset?: _number): Source;

  /**
   * Modulates Y-axis repetition using another source
   * @param texture Modulation source
   * @param reps Number of Y repetitions (default: 3)
   * @param offset Y-axis offset (default: 0.5)
   * @example osc().modulateRepeatY(noise(), 3, 0.5).out()
   */
  modulateRepeatY(texture: Source | Output | Texture, reps?: _number, offset?: _number): Source;

  // === OUTPUT ===

  /**
   * Renders to output buffer
   * @param buffer Output buffer (default: o0)
   * @example osc().out(o0)
   */
  out(buffer?: Output): void;

  /**
   * Renders without displaying
   * @param buffer Output buffer (default: o0)
   */
  render(buffer?: Output): void;
}

/**
 * Output buffer interface
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Output {}

/**
 * Texture interface
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Texture {}

/**
 * Mouse position interface
 * Values normalized to 0-1 range
 */
interface MousePosition {
  /** Horizontal position (0-1) */
  x: number;
  /** Vertical position (0-1) */
  y: number;
}

/**
 * Audio analyzer interface
 */
interface AudioAnalyzer {
  /** FFT frequency data array */
  // eslint-disable-next-line @typescript-eslint/array-type
  fft: number[];

  /**
   * Sets the number of FFT frequency bins (default: 4)
   * @deprecated This method should not be used in Videodrome.
   * @param bins Number of FFT frequency bins
   */
  setBins(bins: number): void;

  /**
   * Sets the FFT smoothing amount (default: 0.4)
   * @deprecated This method should not be used in Videodrome.
   * @param value FFT smoothing amount (0 = no smoothing, 1 = maximum smoothing)
   */
  setSmooth(value: number): void;

  /**
   * Sets the FFT scaling (default: 10)
   * @deprecated This method should not be used in Videodrome.
   * @param value FFT scale (lower means higher FFT values, i.e. inverse scaling)
   */
  setScale(value: number): void;

  /**
   * Sets the FFT threshold (default: 2)
   * @deprecated This method should not be used in Videodrome.
   * @param value FFT threshold (higher means less sensitive)
   */
  setCutoff(value: number): void;

  /**
   * Shows the audio analyzer
   */
  show(): void;

  /**
   * Hides the audio analyzer
   */
  hide(): void;
}

// === SOURCE FUNCTIONS ===

/**
 * Sine wave oscillator source generating RGB color bands
 *
 * Generates three phase-shifted sine waves across the x-axis for RGB channels.
 * @param frequency Number of oscillations (default: 60)
 * @param sync Animation speed multiplier (default: 0.1)
 * @param offset Phase shift amount (default: 0)
 * @example
 * osc(10, 0.1, 0).out()
 * @example
 * osc(60, 0, 1).out()
 */
declare function osc(frequency?: _number, sync?: _number, offset?: _number): Source;

/**
 * 3D Perlin noise source
 *
 * Generates 3D Perlin noise by sampling at scaled texture coordinates.
 * @param scale Spatial frequency multiplier (default: 10)
 * @param offset Time multiplier for animation (default: 0.1)
 * @example
 * noise(3, 0).out()
 * @example
 * noise(10, 0.5).out()
 */
declare function noise(scale?: _number, offset?: _number): Source;

/**
 * Voronoi cells pattern source
 *
 * Generates cellular/Voronoi noise pattern.
 * @param scale Cell density (default: 5)
 * @param speed Animation speed (default: 0.3)
 * @param blending Edge blending amount (default: 0.3)
 * @example
 * voronoi(5, 0.3, 0.3).out()
 */
declare function voronoi(scale?: _number, speed?: _number, blending?: _number): Source;

/**
 * Polygon shape generator
 *
 * Generates geometric shapes (triangle, square, pentagon, etc.).
 * @param sides Number of polygon sides, ≥3 (default: 3)
 * @param radius Shape radius (default: 0.3)
 * @param smoothing Edge smoothing amount (default: 0.01)
 * @example
 * shape(4, 0.5, 0.01).out()
 * @example
 * shape(6, 0.3).out()
 */
declare function shape(sides?: _number, radius?: _number, smoothing?: _number): Source;

/**
 * Linear gradient source
 *
 * Generates a linear color gradient.
 * @param speed Animation speed (default: 0)
 * @example
 * gradient(1).out()
 */
declare function gradient(speed?: _number): Source;

/**
 * External texture sampler
 *
 * Samples from an output buffer (o0-o3) or an external source (s0-s3).
 * @param source Source or output to sample (default: o0)
 * @example
 * src(o0).out()
 * @example
 * src(s0).out()
 */
declare function src(source?: Output | Texture): Source;

/**
 * Solid color source
 *
 * Generates a solid color.
 * @param r Red channel 0-1 (default: 0)
 * @param g Green channel 0-1 (default: 0)
 * @param b Blue channel 0-1 (default: 0)
 * @param a Alpha channel 0-1 (default: 1)
 * @example
 * solid(1, 0, 0, 1).out()
 */
declare function solid(r?: _number, g?: _number, b?: _number, a?: _number): Source;

/**
 * Previous frame buffer
 *
 * Samples from the previous frame for feedback effects.
 * @example
 * prev().out()
 */
declare function prev(): Source;

// === OUTPUT FUNCTIONS ===

/**
 * Render to output buffer
 * @param source Source to render
 * @example
 * render(o0)
 */
declare function render(source?: Output): void;

// === GLOBAL VARIABLES ===

/**
 * Input source 0
 *
 * Texture input slot 0 for external sources.
 * @example
 * src(s0).out()
 */
declare const s0: Texture;

/**
 * Input source 1
 *
 * Texture input slot 1 for external sources.
 * @example
 * src(s1).out()
 */
declare const s1: Texture;

/**
 * Input source 2
 *
 * Texture input slot 2 for external sources.
 * @example
 * src(s2).out()
 */
declare const s2: Texture;

/**
 * Input source 3
 *
 * Texture input slot 3 for external sources.
 * @example
 * src(s3).out()
 */
declare const s3: Texture;

/**
 * Output buffer 0 (default)
 *
 * Primary framebuffer for rendering. Default target for out().
 * Can be sampled via src(o0) for feedback effects.
 * @example
 * osc().out(o0)
 * @example
 * src(o0).blend(osc(), 0.5).out()
 */
declare const o0: Output;

/**
 * Output buffer 1
 *
 * Secondary framebuffer for multi-buffer compositions.
 * @example
 * noise().out(o1)
 * @example
 * src(o1).kaleid(4).out()
 */
declare const o1: Output;

/**
 * Output buffer 2
 *
 * Tertiary framebuffer for multi-buffer compositions.
 * @example
 * shape().out(o2)
 * @example
 * src(o2).add(osc()).out()
 */
declare const o2: Output;

/**
 * Output buffer 3
 *
 * Quaternary framebuffer for multi-buffer compositions.
 * @example
 * voronoi().out(o3)
 * @example
 * src(o3).modulateRotate(noise()).out()
 */
declare const o3: Output;

/**
 * Elapsed time in seconds since start
 *
 * Automatically incremented animation time variable.
 * @example
 * osc(() => time * 10).out()
 */
declare const time: number;

/**
 * Mouse position normalized to 0-1 range
 *
 * Tracks mouse position with x and y properties.
 * @example
 * shape(4, () => mouse.x * 0.5).out()
 * @example
 * osc(10, 0, () => mouse.y).out()
 */
declare const mouse: MousePosition;

/**
 * Animation speed multiplier
 *
 * Global speed control for animations. Can be modified.
 * @example
 * speed = 2
 */
declare var speed: number;

/**
 * Beats per minute for rhythm-based animations
 *
 * Controls tempo for time-based effects.
 * @example
 * bpm = 120
 */
declare var bpm: number;

/**
 * Canvas width in pixels
 *
 * Width of the render canvas.
 */
declare const width: number;

/**
 * Canvas height in pixels
 *
 * Height of the render canvas.
 */
declare const height: number;

/**
 * Audio analyzer with FFT data
 *
 * Provides audio analysis data for audio-reactive visuals.
 * @example
 * osc(10, 0, () => a.fft[0]).out()
 */
declare const a: AudioAnalyzer;

/**
 * Easing function names available in Hydra
 */
type HydraEasingFunction =
  | 'linear'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeInQuart'
  | 'easeOutQuart'
  | 'easeInOutQuart'
  | 'easeInQuint'
  | 'easeOutQuint'
  | 'easeInOutQuint'
  | 'sin';

/**
 * Hydra array extensions for modulation and sequencing
 * Arrays of numbers can be modulated and used as dynamic values
 * @example osc([10, 20, 30].fast(2).smooth()).out()
 */
// eslint-disable-next-line unused-imports/no-unused-vars
interface Array<T> {
  // === ARRAY MODULATION FUNCTIONS ===

  /**
   * Controls speed of array element switching
   * @param multiplier Speed multiplier (1 = global speed, >1 = faster, <1 = slower)
   * @example [0.1, 0.5, 0.9].fast(2)
   */
  fast(this: Array<number>, multiplier: number): number & this;

  /**
   * Smoothly interpolates between array values instead of jumping
   * @param smoothness Smoothness amount (default: 1)
   * @example [3, 9].smooth()
   */
  smooth(this: Array<number>, smoothness?: number): number & this;

  /**
   * Applies easing function to smooth interpolation
   * @param easingFunction Name of easing function
   * @example [0.1, 0.5].smooth().ease('easeInOutCubic')
   */
  ease(this: Array<number>, easingFunction: HydraEasingFunction): number & this;

  /**
   * Offsets timing of array element transitions
   * @param amount Offset amount from 0 to 1
   * @example [1, 2, 3].offset(0.5)
   */
  offset(this: Array<number>, amount: number): number & this;

  /**
   * Remaps array values to specified range
   * @param min Minimum output value
   * @param max Maximum output value
   * @example [0, 1, 2].fit(0.1, 0.9)
   */
  fit(this: Array<number>, min: number, max: number): number & this;
}
