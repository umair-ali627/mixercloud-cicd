import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

interface UserData {
  fullName?: string;
  email?: string;
  [key: string]: any;
}

@Injectable()
export class FirebaseService implements OnModuleInit {
  onModuleInit() {
    if (!admin.apps.length) {
      let credential: admin.credential.Credential;

      if (
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY
      ) {
        credential = admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
      } else {
        credential = admin.credential.applicationDefault();
      }

      admin.initializeApp({
        credential,
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    }
  }

  async getUserData(userId: string): Promise<UserData | null> {
    try {
      const db = admin.firestore();
      const userDoc = await db.collection('users').doc(userId).get();

      if (userDoc.exists) {
        return userDoc.data() as UserData;
      }

      return null;
    } catch (error) {
      console.error(`Error fetching user data for ${userId}:`, error);
      return null;
    }
  }
}
