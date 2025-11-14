/// <reference types="vite/client" />

// Type declaration for Vite's ?raw import suffix
declare module '*.d.ts?raw' {
  const content: string;
  export default content;
}
