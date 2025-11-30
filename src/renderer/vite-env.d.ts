/// <reference types="vite/client" />

// Type declaration for Vite's ?raw import suffix
declare module '*.d.ts?raw' {
  const content: string;
  export default content;
}

// Type declarations for Vite's ?worker import suffix
declare module '*?worker' {
  const WorkerFactory: new () => Worker;
  export default WorkerFactory;
}
