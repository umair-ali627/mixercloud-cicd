import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { CreateCircleDto } from './dto/create-circle.dto';
import { UpdateCircleDto } from './dto/update-circle.dto';
import { JoinCircleDto } from './dto/join-circle.dto';
import { FirebaseService } from '../firebase/firebase.service';
import { LivekitService } from '../livekit/livekit.service';
import { Circle, CircleMember, HandRaise } from './entities/circle.entity';
import * as admin from 'firebase-admin';
import { PromoteCircleDto } from './dto/promote-circle.dto';

@Injectable()
export class CirclesService {
  private readonly logger = new Logger(CirclesService.name);

  constructor(
    @Inject(FirebaseService) private readonly firebaseService: FirebaseService,
    @Inject(LivekitService) private readonly livekitService: LivekitService,
  ) {}

  // Valid status transitions
  private readonly validStatusTransitions = {
    scheduled: ['live', 'ended'],
    live: ['ended'],
    ended: [],
  };

  // Check if status transition is valid
  private isValidStatusTransition(
    currentStatus: string,
    newStatus: string,
  ): boolean {
    return (
      this.validStatusTransitions[currentStatus]?.includes(newStatus) || false
    );
  }

  // 1. Create Circle
  async createCircle(dto: CreateCircleDto, userId: string) {
    if (!userId) throw new Error('User not authenticated');

    const db = admin.firestore();
    const circleRef = db.collection('circles').doc();
    const circleId = circleRef.id;
    const now = admin.firestore.Timestamp.now();

    // ✅ Check daily limit
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfDayTs = admin.firestore.Timestamp.fromDate(startOfDay);

    const circlesSnap = await db
      .collection('circles')
      .where('hostUid', '==', userId)
      .where('createdAt', '>=', startOfDayTs)
      .get();

    if (circlesSnap.size >= 5) {
      throw new BadRequestException(
        'Daily limit reached: You can only create 5 circles per day.',
      );
    }

    // Determine initial status based on startAt
    const startTime = dto.startAt
      ? admin.firestore.Timestamp.fromDate(new Date(dto.startAt))
      : now;
    const initialStatus =
      dto.startAt && new Date(dto.startAt) > new Date() ? 'scheduled' : 'live';

    const circleData: Partial<Circle> = {
      id: circleId,
      title: dto.title,
      description: dto.description || null, // Explicit null for optional
      category: dto.category,
      privacy: dto.privacy,
      hostUid: userId,
      coverUrl: dto.coverUrl || null, // Explicit null for optional
      startAt: startTime,
      status: initialStatus, // 'scheduled' if future date, 'live' if now or past
      maxSpeakers: dto.maxSpeakers ?? 8,
      createdAt: now,
      participantCount: 1, // Host is the first participant
      endedAt: null, // Explicit null for optional
      endReason: null, // Explicit null for optional
      hostDisconnectedAt: null, // Explicit null for optional
      isReplay: dto.isReplay ?? false,
      // Analytics fields with explicit defaults
      totalSpeakTime: 0, // Explicit default for analytics
      handRaiseCount: 0, // Explicit default for analytics
      roleChangeCount: 0, // Explicit default for analytics
    };

    await circleRef.set(circleData);

    // Add host as member in nested collection
    const memberData: CircleMember = {
      role: 'host',
      isMuted: false,
      joinedAt: now,
      status: 'active', // Set initial status to active
      rejoinCount: 0, // Initial rejoin count
      lastRejoinAt: null, // No rejoin yet
      // Analytics fields with explicit defaults
      totalSpeakTime: 0,
      handRaiseCount: 0,
      roleChangeCount: 0,
      lastSpokeAt: null,
      lastRoleChangeAt: null,
      isMutedByHost: null,
      muteReason: null,
      kickCount: 0,
      lastKickAt: null,
      kickReason: null,
    };

    await db
      .collection(`circles/${circleId}/members`)
      .doc(userId)
      .set(memberData);

    // Get user data for full name
    const userData = await this.firebaseService.getUserData(userId);
    const fullName = userData?.fullName;

    // Mint LiveKit token for host
    const sfuToken = await this.livekitService.mintToken(
      userId,
      circleId,
      'host',
      fullName,
    );

    return {
      circleId,
      sfuToken,
      circle: circleData,
    };
  }

  // 2. Update Circle
  async updateCircle(id: string, dto: UpdateCircleDto, userId: string) {
    if (!userId) throw new Error('User not authenticated');

    const db = admin.firestore();
    const circleRef = db.collection('circles').doc(id);
    const circleSnap = await circleRef.get();

    if (!circleSnap.exists) throw new Error('Circle not found');

    const circle = circleSnap.data() as Circle;

    // Only host can update circle
    if (circle.hostUid !== userId) {
      throw new Error('Only host can update circle');
    }

    // Build update data
    const updateData: Partial<Circle> = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.privacy !== undefined) updateData.privacy = dto.privacy;
    if (dto.coverUrl !== undefined) updateData.coverUrl = dto.coverUrl;
    if (dto.startAt !== undefined)
      updateData.startAt = admin.firestore.Timestamp.fromDate(
        new Date(dto.startAt),
      );

    if (dto.isReplay !== undefined) updateData.isReplay = dto.isReplay;

    // Update status based on new startAt if provided
    if (dto.startAt) {
      const newStartTime = new Date(dto.startAt);
      const now = new Date();
      updateData.status = newStartTime > now ? 'scheduled' : 'live';
    }

    await circleRef.update(updateData);

    return { id, ...updateData };
  }

  // 3. Update Circle Status
  async updateCircleStatus(
    id: string,
    newStatus: 'scheduled' | 'live' | 'ended',
    userId: string,
  ) {
    if (!userId) throw new Error('User not authenticated');

    const db = admin.firestore();
    const circleRef = db.collection('circles').doc(id);
    const circleSnap = await circleRef.get();

    if (!circleSnap.exists) throw new Error('Circle not found');

    const circle = circleSnap.data() as Circle;
    if (circle.hostUid !== userId)
      throw new Error('Only host can update circle status');

    // Validate status transition
    if (!this.isValidStatusTransition(circle.status, newStatus)) {
      throw new Error(
        `Invalid status transition from ${circle.status} to ${newStatus}`,
      );
    }

    const updateData: Partial<Circle> = { status: newStatus };
    const now = admin.firestore.Timestamp.now();

    // Add timestamp when ending
    if (newStatus === 'ended') {
      updateData.endedAt = now;
    }

    await circleRef.update(updateData);

    return { id, status: newStatus, ...updateData };
  }

  // 4. End Circle
  async endCircle(id: string, userId: string) {
    if (!userId) throw new Error('User not authenticated');

    const db = admin.firestore();
    const circleRef = db.collection('circles').doc(id);
    const circleSnap = await circleRef.get();

    if (!circleSnap.exists) throw new Error('Circle not found');

    const circle = circleSnap.data() as Circle;

    // Only host can end circle
    if (circle.hostUid !== userId) {
      throw new Error('Only host can end circle');
    }

    // Only allow ending for scheduled and live circles
    if (!['scheduled', 'live'].includes(circle.status)) {
      throw new Error(`Cannot end circle with status: ${circle.status}`);
    }

    await circleRef.update({
      status: 'ended',
      endedAt: admin.firestore.Timestamp.now(),
      endReason: 'host_ended',
    });

    return { id, status: 'ended', endedAt: admin.firestore.Timestamp.now() };
  }

  // 5. Delete Circle (Hard Delete)
  async deleteCircle(id: string, userId: string) {
    if (!userId) throw new Error('User not authenticated');

    const db = admin.firestore();
    const circleRef = db.collection('circles').doc(id);
    const circleSnap = await circleRef.get();

    if (!circleSnap.exists) throw new Error('Circle not found');

    const circle = circleSnap.data() as Circle;

    // Only host can delete circle
    if (circle.hostUid !== userId) {
      throw new Error('Only host can delete circle');
    }

    // Only scheduled circles can be deleted
    if (circle.status !== 'scheduled') {
      throw new Error('Only scheduled circles can be deleted');
    }

    // Hard delete - completely remove from database
    await circleRef.delete();

    // Delete all subcollections
    const membersRef = db.collection(`circles/${id}/members`);
    const handRaisesRef = db.collection(`circles/${id}/handRaises`);

    // Delete members
    const membersSnap = await membersRef.get();
    const memberBatch = db.batch();
    membersSnap.docs.forEach((doc) => {
      memberBatch.delete(doc.ref);
    });
    await memberBatch.commit();

    // Delete hand raises
    const handRaisesSnap = await handRaisesRef.get();
    const handRaiseBatch = db.batch();
    handRaisesSnap.docs.forEach((doc) => {
      handRaiseBatch.delete(doc.ref);
    });
    await handRaiseBatch.commit();

    return { id, deleted: true };
  }

  // 6. Handle Host Disconnection
  async handleHostDisconnection(circleId: string, hostId: string) {
    const db = admin.firestore();
    const circleRef = db.collection('circles').doc(circleId);
    const memberRef = db.collection(`circles/${circleId}/members`).doc(hostId);

    // Set host status to disconnected
    await memberRef.update({
      status: 'disconnected',
      disconnectedAt: admin.firestore.Timestamp.now(),
    });

    // Set circle host disconnected timestamp
    await circleRef.update({
      hostDisconnectedAt: admin.firestore.Timestamp.now(),
    });

    // Start 5-minute timeout
    setTimeout(
      async () => {
        try {
          // Check if host has reconnected
          const memberSnap = await memberRef.get();
          if (memberSnap.exists) {
            const member = memberSnap.data() as CircleMember;
            if (member.status === 'disconnected') {
              // Host hasn't reconnected, end the circle
              await this.endCircleDueToHostDisconnection(circleId);
            }
          }
        } catch (error) {
          this.logger.error(
            `Error in host disconnection timeout: ${error.message}`,
          );
        }
      },
      5 * 60 * 1000,
    ); // 5 minutes

    this.logger.log(
      `Host ${hostId} disconnected from circle ${circleId}. Circle will end in 5 minutes if host doesn't reconnect.`,
    );
  }

  // 7. End Circle Due to Host Disconnection
  private async endCircleDueToHostDisconnection(circleId: string) {
    const db = admin.firestore();
    const circleRef = db.collection('circles').doc(circleId);

    await circleRef.update({
      status: 'ended',
      endedAt: admin.firestore.Timestamp.now(),
      endReason: 'host_disconnected',
    });

    this.logger.log(
      `Circle ${circleId} ended due to host disconnection timeout.`,
    );
  }

  // 5. Join Circle
  async joinCircle(id: string, userId: string, joinDto?: JoinCircleDto) {
    if (!userId) throw new Error('User not authenticated');

    const db = admin.firestore();
    const circleRef = db.collection('circles').doc(id);
    const circleSnap = await circleRef.get();

    if (!circleSnap.exists) throw new Error('Circle not found');

    const circle = circleSnap.data() as Circle;

    // Check if circle is joinable
    if (!['scheduled', 'live'].includes(circle.status)) {
      throw new Error(`Cannot join circle with status: ${circle.status}`);
    }

    const requestedRole = joinDto?.role || 'listener';

    // Check if user is already a member
    const memberRef = db.collection(`circles/${id}/members`).doc(userId);
    const memberSnap = await memberRef.get();

    let existingMember: CircleMember | null = null;
    if (memberSnap.exists) {
      existingMember = memberSnap.data() as CircleMember;
    }

    // Special case: Host joining their own scheduled circle
    if (circle.hostUid === userId && circle.status === 'scheduled') {
      // If host is already a member, just return their existing token
      if (existingMember) {
        const userData = await this.firebaseService.getUserData(userId);
        const fullName = userData?.fullName;

        const webrtcToken = await this.livekitService.mintToken(
          userId,
          id,
          'host',
          fullName,
        );
        return { webrtcToken, role: 'host' };
      }

      // Host can join their own scheduled circle as host
      const memberData: CircleMember = {
        role: 'host',
        isMuted: false,
        joinedAt: admin.firestore.Timestamp.now(),
        status: 'active', // Set initial status to active
        // Analytics fields with explicit defaults
        totalSpeakTime: 0,
        handRaiseCount: 0,
        roleChangeCount: 0,
        lastSpokeAt: null,
        lastRoleChangeAt: null,
        isMutedByHost: null,
        muteReason: null,
        kickCount: 0,
        lastKickAt: null,
        kickReason: null,
      };

      await memberRef.set(memberData);

      // Update participant count
      await circleRef.update({
        participantCount: admin.firestore.FieldValue.increment(1),
      });

      // Get user data for full name
      const userData = await this.firebaseService.getUserData(userId);
      const fullName = userData?.fullName;

      // Mint LiveKit token for host
      const webrtcToken = await this.livekitService.mintToken(
        userId,
        id,
        'host',
        fullName,
      );

      return { webrtcToken, role: 'host' };
    }

    // Regular user joining (not host) - requestedRole can only be 'listener' or 'speaker' from DTO

    // If user is already a member, handle rejoining
    if (existingMember) {
      // If user previously left, reactivate them and preserve their data
      if (existingMember.status === 'left') {
        const currentRejoinCount = existingMember.rejoinCount || 0;

        await memberRef.update({
          status: 'active',
          leftAt: null, // Clear the left timestamp
          rejoinCount: currentRejoinCount + 1, // Increment rejoin count
          lastRejoinAt: admin.firestore.Timestamp.now(), // Set rejoin timestamp
          // Preserve all existing analytics data
          // Update joinedAt to reflect rejoin time
          joinedAt: admin.firestore.Timestamp.now(),
        });

        // Increment participant count since they're rejoining
        await circleRef.update({
          participantCount: admin.firestore.FieldValue.increment(1),
        });

        this.logger.log(
          `User ${userId} rejoined circle ${id} with role ${existingMember.role} (rejoin #${currentRejoinCount + 1})`,
        );
      }

      // Get user data for full name
      const userData = await this.firebaseService.getUserData(userId);
      const fullName = userData?.fullName;

      // Return token with their existing role
      const webrtcToken = await this.livekitService.mintToken(
        userId,
        id,
        existingMember.role,
        fullName,
      );
      return { webrtcToken, role: existingMember.role };
    }

    // Add as new member in nested collection
    const memberData: CircleMember = {
      role: requestedRole,
      isMuted: requestedRole === 'listener',
      joinedAt: admin.firestore.Timestamp.now(),
      status: 'active', // Set initial status to active
      rejoinCount: 0, // Initial rejoin count
      lastRejoinAt: null, // No rejoin yet
      // Analytics fields with explicit defaults
      totalSpeakTime: 0,
      isHandRaised: false,
      handRaiseCount: 0,
      roleChangeCount: 0,
      lastSpokeAt: null,
      lastRoleChangeAt: null,
      isMutedByHost: null,
      muteReason: null,
      kickCount: 0,
      lastKickAt: null,
      kickReason: null,
    };

    await memberRef.set(memberData);

    // Update participant count
    await circleRef.update({
      participantCount: admin.firestore.FieldValue.increment(1),
    });

    // Get user data for full name
    const userData = await this.firebaseService.getUserData(userId);
    const fullName = userData?.fullName;

    // Mint LiveKit token
    const webrtcToken = await this.livekitService.mintToken(
      userId,
      id,
      requestedRole,
      fullName,
    );

    return { webrtcToken, role: requestedRole };
  }

  async promoteMember(
    circleId: string,
    requesterId: string,
    dto: PromoteCircleDto,
  ) {
    const db = admin.firestore();
    const circleRef = db.collection('circles').doc(circleId);
    const memberRef = circleRef.collection('members').doc(dto.targetUserId);

    const [circleSnap, targetSnap] = await Promise.all([
      circleRef.get(),
      memberRef.get(),
    ]);

    if (!circleSnap.exists) throw new Error('Circle not found');
    if (!targetSnap.exists) throw new Error('Target member not found');

    const circle = circleSnap.data() as Circle;

    // Permission check: only host can promote/demote
    if (circle.hostUid !== requesterId) {
      throw new Error('forbidden: only host can promote/demote');
    }

    // Update role
    await memberRef.update({
      role: dto.newRole,
      lastRoleChangeAt: admin.firestore.Timestamp.now(),
      roleChangeCount: admin.firestore.FieldValue.increment(1),
    });

    // Mint new token with new role
    const userData = await this.firebaseService.getUserData(dto.targetUserId);
    const fullName = userData?.fullName;

    const webrtcToken = await this.livekitService.mintToken(
      dto.targetUserId,
      circleId,
      dto.newRole,
      fullName,
    );

    return { webrtcToken, role: dto.newRole };
  }

  // 6. Leave Circle
  async leaveCircle(id: string, userId: string) {
    if (!userId) throw new Error('User not authenticated');

    const db = admin.firestore();
    const circleRef = db.collection('circles').doc(id);
    const circleSnap = await circleRef.get();

    if (!circleSnap.exists) throw new Error('Circle not found');

    const circle = circleSnap.data() as Circle;

    // Check if user is the host
    if (circle.hostUid === userId) {
      throw new Error('Host cannot leave circle. Use end circle instead.');
    }

    // Update member status to 'left' instead of deleting
    await db.collection(`circles/${id}/members`).doc(userId).update({
      leftAt: admin.firestore.Timestamp.now(),
      status: 'left',
    });

    // Remove from hand raises if exists (this is fine to delete since it's temporary)
    await db.collection(`circles/${id}/handRaises`).doc(userId).delete();

    // Update participant count
    await circleRef.update({
      participantCount: admin.firestore.FieldValue.increment(-1),
    });

    return { id };
  }

  // 7. Directory query
  async getCircles(query: any) {
    const db = admin.firestore();
    let ref = db.collection('circles') as FirebaseFirestore.Query;

    if (query.status) {
      ref = ref.where('status', '==', query.status);
    }

    if (query.category) {
      ref = ref.where('category', '==', query.category);
    }

    if (query.privacy) {
      ref = ref.where('privacy', '==', query.privacy);
    }

    if (query.isReplay !== undefined) {
      ref = ref.where('isReplay', '==', query.isReplay === 'true');
    }

    if (query.startAfter) {
      ref = ref.orderBy('startAt').startAfter(query.startAfter);
    } else {
      ref = ref.orderBy('startAt');
    }

    if (query.limit) {
      ref = ref.limit(Number(query.limit));
    } else {
      ref = ref.limit(8);
    }

    const snap = await ref.get();
    return snap.docs.map((doc) => doc.data() as Circle);
  }

  // 8. Get Circle Details with Members
  async getCircleDetails(id: string) {
    const db = admin.firestore();
    const circleRef = db.collection('circles').doc(id);
    const circleSnap = await circleRef.get();

    if (!circleSnap.exists) throw new Error('Circle not found');

    const circle = circleSnap.data() as Circle;

    // Get all members and filter for active ones
    const membersSnap = await db.collection(`circles/${id}/members`).get();
    const allMembers = membersSnap.docs.map((doc) => ({
      userId: doc.id,
      ...doc.data(),
    })) as (CircleMember & { userId: string })[];

    // Filter for active members (status is 'active' or null/undefined for backward compatibility)
    const members = allMembers.filter(
      (member) =>
        member.status === 'active' ||
        member.status === null ||
        member.status === undefined,
    );

    // Get hand raises
    const handRaisesSnap = await db
      .collection(`circles/${id}/handRaises`)
      .get();
    const handRaises = handRaisesSnap.docs.map((doc) => ({
      userId: doc.id,
      ...doc.data(),
    })) as (HandRaise & { userId: string })[];

    return {
      ...circle,
      members,
      handRaises,
    };
  }

  // 9. Get Available Statuses
  async getAvailableStatuses(id: string, userId: string) {
    if (!userId) throw new Error('User not authenticated');

    const db = admin.firestore();
    const circleRef = db.collection('circles').doc(id);
    const circleSnap = await circleRef.get();

    if (!circleSnap.exists) throw new Error('Circle not found');

    const circle = circleSnap.data() as Circle;

    // Only host can view available statuses
    if (circle.hostUid !== userId) {
      throw new Error('Only host can view available statuses');
    }

    const currentStatus = circle.status;
    const availableStatuses = this.validStatusTransitions[currentStatus] || [];
    const allStatuses = ['scheduled', 'live', 'ended'];

    return {
      currentStatus,
      availableStatuses,
      allStatuses,
    };
  }
}
