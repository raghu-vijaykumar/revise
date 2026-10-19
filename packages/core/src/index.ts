// Domain contracts are exported here so privileged and renderer code share one schema.
export const CORE_SCHEMA_VERSION = 1;
export * from './contracts/workspace';
export * from './contracts/document';
export * from './contracts/source';
export * from './contracts/ipc';
export * from './documents/parseMarkdown';
export * from './documents/text';
export * from './documents/changeEngine';
export * from './documents/renderMarkdown';
export * from './documents/videoLinks';
