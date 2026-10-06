declare module "open-location-code" {
  export class OpenLocationCode {
    isShort(code: string): boolean;
    isFull(code: string): boolean;
    decode(code: string): {
      latitudeCenter: number;
      longitudeCenter: number;
    };
    recoverNearest(shortCode: string, latitude: number, longitude: number): string;
  }
}
