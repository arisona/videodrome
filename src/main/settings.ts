import * as fs from 'node:fs';
import * as path from 'node:path';

import { app } from 'electron';

import { APP_CONFIG } from '../shared/constants';

import type { Settings } from '../shared/ipc-types';

function getSettingsPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, APP_CONFIG.SETTINGS_FILENAME);
}

export function getDocumentsPath(): string {
  return app.getPath('documents');
}

export function loadSettings(): Settings | null {
  const settingsPath = getSettingsPath();

  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8');
      return JSON.parse(data) as Settings;
    }
  } catch (error: unknown) {
    console.error('Error loading settings:', error);
    return null;
  }

  // Return null if file doesn't exist
  return null;
}

export function saveSettings(settings: Settings): void {
  const settingsPath = getSettingsPath();

  try {
    const settingsDir = path.dirname(settingsPath);
    if (!fs.existsSync(settingsDir)) {
      fs.mkdirSync(settingsDir, { recursive: true });
    }

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (error: unknown) {
    console.error('Error saving settings:', error);
    throw error;
  }
}

export function ensureDirectoriesExist(
  patchDirectory: string,
  mediaDirectory: string,
): {
  success: boolean;
  errors: Array<string>;
} {
  const errors: Array<string> = [];

  // Create patch directory if it doesn't exist
  if (!fs.existsSync(patchDirectory)) {
    try {
      fs.mkdirSync(patchDirectory, { recursive: true });
    } catch (error: unknown) {
      const message = `Failed to create patch directory: ${patchDirectory}`;
      console.error(message, error);
      errors.push(message);
    }
  }

  // Create media directory if it doesn't exist
  if (!fs.existsSync(mediaDirectory)) {
    try {
      fs.mkdirSync(mediaDirectory, { recursive: true });
    } catch (error: unknown) {
      const message = `Failed to create media directory: ${mediaDirectory}`;
      console.error(message, error);
      errors.push(message);
    }
  }

  return { success: errors.length === 0, errors };
}
