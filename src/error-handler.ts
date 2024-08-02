export class ErrorHandler {
    static checkWritePermission(data: any, key: string, path: string): void {
        if (!data.allowedToWrite(key)) {
            throw new Error(`Write access denied for key: ${key} in path: ${path}`);
        }
    }

    static checkReadPermission(data: any, key: string, path: string): void {
        if (!data.allowedToRead(key)) {
            throw new Error(`Read access denied for key: ${key} in path: ${path}`);
        }
    }
}
