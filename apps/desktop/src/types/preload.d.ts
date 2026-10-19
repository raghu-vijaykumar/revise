export {};

declare global {
  interface Window {
    revise: {
      appVersion: string;
      chooseContentFolder(): Promise<string | null>;
    };
  }
}
