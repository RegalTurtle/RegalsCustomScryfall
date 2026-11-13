import { Filter, Document, ObjectId } from "mongodb";

/** Fail closed even when a caller bypasses TypeScript. Never accept a client filter as ownership. */
export function requireUserId(userId: ObjectId): ObjectId {
  if (!(userId instanceof ObjectId)) throw new Error("Authenticated user ID required");
  return userId;
}

export function ownedFilter<T extends Document>(userId: ObjectId, filter: Filter<T> = {}): Filter<T> {
  return { $and: [{ userId: requireUserId(userId) }, filter] } as Filter<T>;
}
