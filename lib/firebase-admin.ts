import admin, { type ServiceAccount } from "firebase-admin";
import { readFileSync } from "fs";
import { join, isAbsolute } from "path";

let serviceAccount: ServiceAccount | undefined;

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    let jsonString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
    
    // Remove surrounding quotes if they exist
    if ((jsonString.startsWith('"') && jsonString.endsWith('"')) || 
        (jsonString.startsWith("'") && jsonString.endsWith("'"))) {
      jsonString = jsonString.slice(1, -1);
    }
    
    // First, escape any literal control characters (actual newlines, tabs, etc.)
    // These are invalid in JSON and must be escaped
    // We need to do this carefully to avoid double-escaping
    let result = '';
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString[i];
      const prevChar = i > 0 ? jsonString[i - 1] : '';
      
      // If it's a control character and not already escaped
      if (char === '\n' && prevChar !== '\\') {
        result += '\\n';
      } else if (char === '\r' && prevChar !== '\\') {
        result += '\\r';
      } else if (char === '\t' && prevChar !== '\\') {
        result += '\\t';
      } else if (char.charCodeAt(0) >= 0x00 && char.charCodeAt(0) <= 0x1F && prevChar !== '\\') {
        // Escape any other control characters
        result += '\\u' + ('0000' + char.charCodeAt(0).toString(16)).slice(-4);
      } else {
        result += char;
      }
    }
    jsonString = result;
    
    // Now handle double-escaped sequences from env files (\\n -> \n, \\" -> \")
    // This converts "\\n" (backslash + backslash + n) to "\n" (backslash + n) for JSON
    jsonString = jsonString.replace(/\\\\n/g, '\\n');
    jsonString = jsonString.replace(/\\\\"/g, '\\"');
    
    serviceAccount = JSON.parse(jsonString);
  } catch (error) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
    const preview = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.substring(0, 200);
    console.error("Preview (first 200 chars):", preview);
    console.error("Contains actual newlines:", preview?.includes('\n'));
  }
} else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  try {
    const resolvedPath = isAbsolute(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
      ? process.env.FIREBASE_SERVICE_ACCOUNT_PATH
      : join(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    const raw = readFileSync(resolvedPath, "utf-8");
    serviceAccount = JSON.parse(raw);
  } catch (error) {
    console.error(
      "Failed to read FIREBASE_SERVICE_ACCOUNT_PATH",
      error
    );
  }
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: serviceAccount
      ? admin.credential.cert(serviceAccount)
      : admin.credential.applicationDefault(),
  });
}

const adminApp = admin.app();
const adminAuth = adminApp.auth();
const adminDb = adminApp.firestore();

export { adminApp, adminAuth, adminDb };

