
import { ErrorHandler } from "./error-handler";
import { JSONArray, JSONObject, JSONPrimitive } from "./json-types";

export type Permission = "r" | "w" | "rw" | "none";

export type StoreResult = Store | JSONPrimitive | undefined;

export type StoreValue =
  | JSONObject
  | JSONArray
  | StoreResult
  | (() => StoreResult);

export interface IStore {
  defaultPolicy: Permission;
  allowedToRead(key: string): boolean;
  allowedToWrite(key: string): boolean;
  read(path: string): StoreResult;
  write(path: string, value: StoreValue): StoreValue;
  writeEntries(entries: JSONObject): void;
  entries(): JSONObject;
}
interface StoreConstructor {
  permissions?: { [key: string]: Permission };
}

export const Restrict = (permission: Permission = "none") => {
  return (target: any, key: string): void => {
    const defaultPermission = permission ?? target.defaultPolicy;
    if (!target.constructor.permissions) {
      target.constructor.permissions = {};
    }
    target.constructor.permissions[key] = defaultPermission;
  };
}
export class Store implements IStore {
  defaultPolicy: Permission = "rw";
  private permissions: { [key: string]: Permission } = {};

  constructor() {
    const constructor = this.constructor as typeof Store & StoreConstructor;
    const permissions = constructor.permissions;
    if (permissions) {
      this.permissions = permissions;
    }
  }

  private createStoreValue(value: StoreValue): StoreValue {
    if (typeof value === "object" && !(value instanceof Store)) {
      const newStore = new Store();
      newStore.writeEntries(value as JSONObject);
      return newStore;
    }
    return value;
  }

  private setNestedValue(path: string, value: StoreValue): StoreValue {
    const keys = path.split(':');
    let data: any = this;
    // Traverse all keys except the last one
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(data[key] instanceof Store)) {
        ErrorHandler.checkWritePermission(data, key, path);
        data[key] = new Store();
      }
      data = data[key];
    }
    // Handle the last key
    const lastKey = keys[keys.length - 1];
    ErrorHandler.checkWritePermission(data, lastKey, path);
    data[lastKey] = this.createStoreValue(value);

    return value;
  }

  private getNestedValue(path: string): StoreResult {
    const keys = path.split(':');
    let data: any = this;

    for (const key of keys) {
      ErrorHandler.checkReadPermission(data, key, path);
      data = data.storage?.[key] ?? (data as any)[key];
      if (typeof data === 'function') {
        data = data();
      }
    }
    return data;
  }

  private getPermission(key: string): Permission {
    return this.permissions[key] || this.defaultPolicy;
  }

  allowedToRead(key: string): boolean {
    const permission = this.getPermission(key);
    return permission === "r" || permission === "rw";
  }

  allowedToWrite(key: string): boolean {
    const permission = this.getPermission(key);
    return permission === "w" || permission === "rw";
  }

  read(path: string): StoreResult {
    return this.getNestedValue(path);
  }

  write(path: string, value: StoreValue): StoreValue {
    return this.setNestedValue(path, value);
  }

  writeEntries(entries: JSONObject): void {
    for (const key in entries) {
      if (entries.hasOwnProperty(key)) {
        this.write(key, entries[key]);
      }
    }
  }

  entries(): JSONObject {
    const result: JSONObject = {};
    for (const key in this) {
      if (this.allowedToRead(key)) {
        result[key] = (this as any)[key];
      }
    }
    return result;
  }
}