import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp();

// Create user function
export const createUser = functions.https.onCall(async (data, context) => {
  // Verify that the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated to create accounts."
    );
  }

  // Verify that the user is an admin
  const adminDoc = await admin.firestore().collection("admins").doc(context.auth.uid).get();
  if (!adminDoc.exists) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can create user accounts."
    );
  }

  const { email, password, username, phone } = data;

  // Validate input
  if (!email || !password || !username || !phone) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "All fields are required."
    );
  }

  // Validate phone format
  if (phone.length !== 11 || !/^\d{11}$/.test(phone)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Please enter a valid 11-digit phone number."
    );
  }

  try {
    // Create the user in Firebase Auth (without signing them in)
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: username,
    });

    // Save user details in Firestore
    await admin.firestore().collection("users").doc(userRecord.uid).set({
      username: username,
      email: email,
      phone: phone,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, uid: userRecord.uid };
  } catch (error: any) {
    throw new functions.https.HttpsError(
      "internal",
      `Error creating user: ${error.message}`
    );
  }
});

// Create technician function
export const createTechnician = functions.https.onCall(async (data, context) => {
  // Verify that the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated to create accounts."
    );
  }

  // Verify that the user is an admin
  const adminDoc = await admin.firestore().collection("admins").doc(context.auth.uid).get();
  if (!adminDoc.exists) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can create technician accounts."
    );
  }

  const { email, password, username, phone } = data;

  // Validate input
  if (!email || !password || !username || !phone) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "All fields are required."
    );
  }

  // Validate phone format
  if (phone.length !== 11 || !/^\d{11}$/.test(phone)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Please enter a valid 11-digit phone number."
    );
  }

  try {
    // Create the user in Firebase Auth (without signing them in)
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: username,
    });

    // Save technician details in Firestore
    await admin.firestore().collection("technicians").doc(userRecord.uid).set({
      username: username,
      email: email,
      phone: phone,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isOnline: false,
      loginStatus: "offline",
      isSuspended: false,
      isBanned: false,
      status: "pending", // Pending status - not yet registered
      submitted: false, // Not submitted yet - needs to complete registration
    });

    return { success: true, uid: userRecord.uid };
  } catch (error: any) {
    throw new functions.https.HttpsError(
      "internal",
      `Error creating technician: ${error.message}`
    );
  }
});

