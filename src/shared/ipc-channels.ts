/**
 * Type-safe IPC channel definitions
 * This file provides compile-time type safety for IPC communication between main and renderer processes
 */

import type { IPC_CHANNELS } from './constants';
import type {
  AudioAnalyzerParams,
  MediaFile,
  MediaType,
  PatchFile,
  ResultsPayload,
  Settings,
} from './ipc-types';
import type { IpcRenderer, IpcRendererEvent } from 'electron';
import type { HydraSourceSlot } from 'hydra-synth';

/**
 * Central definition of all IPC channels with their request and response types
 * Format: [RequestType, ResponseType]
 *
 * - For channels with no parameters, use undefined as RequestType
 * - For channels with multiple parameters, use a tuple type [arg1Type, arg2Type, ...]
 * - For channels with no return value, use undefined as ResponseType
 * - For ipcRenderer.send() (fire-and-forget), ResponseType is undefined
 * - For ipcRenderer.invoke() (request-response), ResponseType is the Promise result type
 */
export interface IPCChannelMap {
  // Settings channels (invoke)
  [IPC_CHANNELS.SETTINGS_GET_DOCUMENTS_PATH]: [undefined, string];
  [IPC_CHANNELS.SETTINGS_LOAD]: [undefined, Settings | null];
  [IPC_CHANNELS.SETTINGS_SAVE]: [Settings, undefined];
  [IPC_CHANNELS.SETTINGS_ENSURE_DIRECTORIES]: [
    [patchDirectory: string, mediaDirectory: string],
    { success: boolean; errors: Array<string> },
  ];
  [IPC_CHANNELS.SETTINGS_UPDATE_DIRECTORIES]: [
    [patchDirectory: string, mediaDirectory: string],
    undefined,
  ];

  // Editor channels (invoke)
  [IPC_CHANNELS.EDITOR_DIRECTORY_SELECT]: [[title: string, defaultPath?: string], string | null];
  [IPC_CHANNELS.EDITOR_PATCHES_LIST]: [undefined, Array<PatchFile>];
  [IPC_CHANNELS.EDITOR_PATCH_READ]: [string, string];
  [IPC_CHANNELS.EDITOR_PATCH_SAVE]: [[filePath: string, content: string], boolean];
  [IPC_CHANNELS.EDITOR_PATCH_EXISTS]: [string, boolean];
  [IPC_CHANNELS.EDITOR_PATCH_RENAME]: [[oldPath: string, newName: string], string];
  [IPC_CHANNELS.EDITOR_PATCH_DELETE]: [[filePath: string, isDirectory: boolean], boolean];
  [IPC_CHANNELS.EDITOR_FOLDER_CREATE]: [[parentPath: string, folderName: string], string];
  [IPC_CHANNELS.EDITOR_MEDIA_LIST]: [undefined, Array<MediaFile>];
  [IPC_CHANNELS.EDITOR_OUTPUT_GET_STATE]: [undefined, boolean];

  // Editor channels (send - fire and forget)
  [IPC_CHANNELS.EDITOR_CODE_RUN]: [string, undefined];
  [IPC_CHANNELS.EDITOR_OUTPUT_TOGGLE]: [undefined, undefined];
  [IPC_CHANNELS.EDITOR_OUTPUT_SET_FULLSCREEN]: [undefined, undefined];
  [IPC_CHANNELS.EDITOR_HYDRA_SET_SOURCE]: [
    {
      sourceSlot: HydraSourceSlot;
      mediaUrl: string;
      mediaType: MediaType;
      playbackSpeed: number;
    },
    undefined,
  ];
  [IPC_CHANNELS.EDITOR_HYDRA_SET_PLAYBACK_SPEED]: [
    { sourceSlot: HydraSourceSlot; speed: number },
    undefined,
  ];
  [IPC_CHANNELS.EDITOR_AUDIO_ANALYZER_PARAMS]: [AudioAnalyzerParams, undefined];

  // Output window channels (send to renderer)
  [IPC_CHANNELS.OUTPUT_CODE_RUN]: [string, undefined];
  [IPC_CHANNELS.OUTPUT_HYDRA_SET_SOURCE]: [
    {
      sourceSlot: HydraSourceSlot;
      mediaUrl: string;
      mediaType: MediaType;
      playbackSpeed: number;
    },
    undefined,
  ];
  [IPC_CHANNELS.OUTPUT_HYDRA_SET_PLAYBACK_SPEED]: [
    { sourceSlot: HydraSourceSlot; speed: number },
    undefined,
  ];
  [IPC_CHANNELS.OUTPUT_AUDIO_ANALYZER_PARAMS]: [AudioAnalyzerParams, undefined];
  [IPC_CHANNELS.OUTPUT_READY]: [undefined, undefined];
  [IPC_CHANNELS.OUTPUT_EXECUTION_RESULT]: [ResultsPayload, undefined];

  // Editor window events (sent from main to renderer)
  [IPC_CHANNELS.EDITOR_OUTPUT_STATE_CHANGED]: [boolean, undefined];
  [IPC_CHANNELS.EDITOR_PATCHES_CHANGED]: [Array<PatchFile>, undefined];
  [IPC_CHANNELS.EDITOR_MEDIA_CHANGED]: [Array<MediaFile>, undefined];

  // Preview channel (special case - uses MessagePort)
  [IPC_CHANNELS.EDITOR_PREVIEW_CHANNEL]: [undefined, undefined];
}

/**
 * Extract the request type for a given IPC channel
 */
export type IPCRequest<T extends keyof IPCChannelMap> = IPCChannelMap[T][0];

/**
 * Extract the response type for a given IPC channel
 */
export type IPCResponse<T extends keyof IPCChannelMap> = IPCChannelMap[T][1];

/**
 * Type guard to check if a channel uses invoke (returns a Promise)
 * This is determined by whether the response type is not undefined
 */
export type IsInvokeChannel<T extends keyof IPCChannelMap> =
  IPCResponse<T> extends undefined ? false : true;

/**
 * Typed wrapper for ipcRenderer.invoke()
 * Enforces type safety for request and response types
 *
 * @example
 * // No parameters
 * const settings = await typedInvoke(ipcRenderer, IPC_CHANNELS.SETTINGS_LOAD);
 * // TypeScript knows settings is Settings | null
 *
 * @example
 * // Multiple parameters
 * const result = await typedInvoke(
 *   ipcRenderer,
 *   IPC_CHANNELS.SETTINGS_ENSURE_DIRECTORIES,
 *   '/path/to/patches',
 *   '/path/to/media'
 * );
 */
export function typedInvoke<T extends keyof IPCChannelMap>(
  ipcRenderer: IpcRenderer,
  channel: T,
  ...args: IPCRequest<T> extends undefined
    ? []
    : IPCRequest<T> extends ReadonlyArray<unknown>
      ? IPCRequest<T>
      : [IPCRequest<T>]
): Promise<IPCResponse<T>> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
  return ipcRenderer.invoke(channel, ...(args as any));
}

/**
 * Typed wrapper for ipcRenderer.send()
 * Enforces type safety for request type (fire-and-forget, no response)
 *
 * @example
 * typedSend(ipcRenderer, IPC_CHANNELS.EDITOR_CODE_RUN, "console.log('hello')");
 */
export function typedSend<T extends keyof IPCChannelMap>(
  ipcRenderer: IpcRenderer,
  channel: T,
  ...args: IPCRequest<T> extends undefined
    ? []
    : IPCRequest<T> extends ReadonlyArray<unknown>
      ? IPCRequest<T>
      : [IPCRequest<T>]
): void {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
  ipcRenderer.send(channel, ...(args as any));
}

/**
 * Typed wrapper for ipcRenderer.on()
 * Enforces type safety for the callback parameter type
 *
 * @example
 * typedOn(ipcRenderer, IPC_CHANNELS.OUTPUT_CODE_RUN, (code) => {
 *   // TypeScript knows code is string
 * });
 */
export function typedOn<T extends keyof IPCChannelMap>(
  ipcRenderer: IpcRenderer,
  channel: T,
  callback: (data: IPCRequest<T>) => void,
): void {
  ipcRenderer.on(channel, (_event: IpcRendererEvent, data: IPCRequest<T>) => {
    callback(data);
  });
}
