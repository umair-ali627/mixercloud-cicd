export class Circle {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  coverUrl?: string | null;
  createdAt: any; // Firestore Timestamp
  hostUid: string;
  maxSpeakers: number;
  privacy: 'public' | 'private' | 'secret';
  startAt: any; // Firestore Timestamp
  status: 'scheduled' | 'live' | 'ended';
  participantCount?: number | null;
  endedAt?: any | null; // Firestore Timestamp
  endReason?: 'host_ended' | 'host_disconnected' | 'timeout' | null; // NEW
  hostDisconnectedAt?: any | null; // NEW - for timeout tracking
  isReplay: boolean;
  // Analytics fields
  totalSpeakTime?: number | null;
  handRaiseCount?: number | null;
  roleChangeCount?: number | null;
}

export class CircleMember {
  role: 'host' | 'speaker' | 'listener';
  isMuted: boolean;
  joinedAt: any; // Firestore Timestamp
  lastSpokeAt?: any | null; // Firestore Timestamp
  status?: 'active' | 'left' | 'disconnected' | null; // UPDATED
  leftAt?: any | null; // Firestore Timestamp
  disconnectedAt?: any | null; // NEW - for host timeout
  rejoinCount?: number | null;
  lastRejoinAt?: any | null; // Firestore Timestamp
  // Analytics fields
  totalSpeakTime?: number | null;
  isHandRaised?: boolean;
  handRaiseCount?: number | null;
  roleChangeCount?: number | null;
  lastRoleChangeAt?: any | null; // Firestore Timestamp
  isMutedByHost?: boolean | null;
  muteReason?: string | null;
  kickCount?: number | null;
  lastKickAt?: any | null; // Firestore Timestamp
  kickReason?: string | null;
}

export class HandRaise {
  raisedAt: any; // Firestore Timestamp
}
