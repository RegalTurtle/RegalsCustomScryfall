import { ObjectId } from "mongodb";

export interface User {
  _id?: ObjectId;
  username: string;
  email?: string;
  password: string;
  permissionLevel: string;
}

export type AccountDetails = Pick<User, "username" | "email" | "permissionLevel">;
export type ManagedAccount = AccountDetails & { id: string };
