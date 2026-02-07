/**
 * Type declarations for dcmjs library
 */

declare module 'dcmjs' {
  export namespace data {
    export class DicomMessage {
      static readFile(buffer: Buffer): DicomDict;
    }
  }

  export class DicomDict {
    dict: Record<string, DicomElement>;
  }

  export interface DicomElement {
    Value?: any;
    vr?: string;
    offset?: number;
  }
}
