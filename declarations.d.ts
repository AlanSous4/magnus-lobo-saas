// declarations.d.ts
declare module 'esc-pos-encoder';

interface Navigator {
  serial: {
    requestPort(): Promise<any>;
    getPorts(): Promise<any[]>;
  };
}