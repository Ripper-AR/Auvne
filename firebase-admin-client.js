import { getAuth } from "firebase/auth";
import { firebaseApp } from "./firebase-client.js";

export { db, firebaseConfigError } from "./firebase-client.js";
export const auth = firebaseApp ? getAuth(firebaseApp) : null;
