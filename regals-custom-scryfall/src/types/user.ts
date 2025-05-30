import { ObjectId } from "mongodb";

export interface User {
  _id?: ObjectId;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  permissionLevel: string;
}