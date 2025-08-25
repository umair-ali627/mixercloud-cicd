import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { WebhookReceiver, WebhookEvent, TrackType } from 'livekit-server-sdk';
import { CirclesService } from '../circles/circles.service';
import * as admin from 'firebase-admin';
import { CircleMember } from '../circles/entities/circle.entity';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly receiver: WebhookReceiver;

  constructor(private readonly circlesService: CirclesService) {
    // Initialize webhook receiver with environment variables
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      this.logger.error('LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set');
      throw new Error('LiveKit credentials not configured');
    }

    this.receiver = new WebhookReceiver(apiKey, apiSecret);
  }

  async processWebhook(rawBody: string, authHeader: string) {
    try {
      const event = await this.receiver.receive(rawBody, authHeader);

      this.logger.log(
        `Received webhook event: ${event.event} for room: ${event.room?.name}`,
      );

      // Check if this is an event we handle
      const handledEvents = [
        'participant_joined',
        'participant_left',
        'track_published',
        'track_unpublished',
      ];

      if (handledEvents.includes(event.event)) {
        // Process handled events asynchronously
        setImmediate(() => {
          this.handleEvent(event).catch((error) => {
            this.logger.error(
              `Event handling failed: ${error.message}`,
              error.stack,
            );
          });
        });

        return { status: 'received', event: event.event };
      } else {
        // For unhandled events, just log and return success without processing
        this.logger.log(`Ignoring unhandled webhook event: ${event.event}`);
        return { status: 'ignored', event: event.event };
      }
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`);
      throw new BadRequestException('Invalid webhook signature or payload');
    }
  }

  private async handleEvent(event: WebhookEvent) {
    try {
      switch (event.event) {
        // case 'room_started':
        //   await this.handleRoomCreated(event);
        //   break;
        // case 'room_finished':
        //   await this.handleRoomEnded(event);
        //   break;
        case 'participant_joined':
          await this.handleParticipantJoined(event);
          break;
        case 'participant_left':
          await this.handleParticipantLeft(event);
          break;
        case 'track_published':
          await this.handleTrackPublished(event);
          break;
        case 'track_unpublished':
          await this.handleTrackUnpublished(event);
          break;
        default:
          this.logger.warn(`Unhandled webhook event: ${event.event}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle event ${event.event}: ${error.message}`,
      );
      throw error;
    }
  }

  private async handleRoomCreated(event: WebhookEvent) {
    if (!event.room?.name) {
      this.logger.warn('Room created event missing room name');
      return;
    }

    try {
      // Update circle status to 'live' when room is created
      await this.circlesService.updateCircleStatus(
        event.room.name, // room name is circle ID
        'live',
        event.room.metadata
          ? JSON.parse(event.room.metadata).hostUid
          : undefined,
      );

      this.logger.log(`Room created: ${event.room.name}`);
    } catch (error) {
      this.logger.error(`Failed to handle room.created: ${error.message}`);
      throw error;
    }
  }

  private async handleRoomEnded(event: WebhookEvent) {
    if (!event.room?.name) {
      this.logger.warn('Room ended event missing room name');
      return;
    }

    try {
      // Update circle status to 'ended'
      await this.circlesService.updateCircleStatus(
        event.room.name,
        'ended',
        event.room.metadata
          ? JSON.parse(event.room.metadata).hostUid
          : undefined,
      );

      // Clean up any remaining data
      await this.cleanupRoomData(event.room.name);

      this.logger.log(`Room ended: ${event.room.name}`);
    } catch (error) {
      this.logger.error(`Failed to handle room.ended: ${error.message}`);
      throw error;
    }
  }

  private async handleParticipantJoined(event: WebhookEvent) {
    if (!event.room?.name || !event.participant?.identity) {
      this.logger.warn(
        'Participant joined event missing room name or participant identity',
      );
      return;
    }

    try {
      // Validate that the user exists in the system
      const db = admin.firestore();
      const userRef = db.collection('users').doc(event.participant.identity);
      const userSnap = await userRef.get();

      if (!userSnap.exists) {
        this.logger.error(
          `User not found: ${event.participant.identity} - cannot process participant join event`,
        );
        throw new Error(`User not found: ${event.participant.identity}`);
      }

      // Update participant count in circle
      await this.incrementParticipantCount(
        event.room.name,
        event.participant.identity,
      );

      this.logger.log(
        `Participant joined: ${event.participant.identity} in ${event.room.name}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle participant.joined: ${error.message}`,
      );
      throw error;
    }
  }

  private async handleParticipantLeft(event: WebhookEvent) {
    if (!event.room?.name || !event.participant?.identity) {
      this.logger.warn(
        'Participant left event missing room name or participant identity',
      );
      return;
    }

    try {
      // Validate that the user exists in the system
      const db = admin.firestore();
      const userRef = db.collection('users').doc(event.participant.identity);
      const userSnap = await userRef.get();

      if (!userSnap.exists) {
        this.logger.error(
          `User not found: ${event.participant.identity} - cannot process participant leave event`,
        );
        throw new Error(`User not found: ${event.participant.identity}`);
      }

      // Check if leaving participant is the host
      const circleRef = db.collection('circles').doc(event.room.name);
      const circleSnap = await circleRef.get();

      if (circleSnap.exists) {
        const circle = circleSnap.data();
        if (circle && circle.hostUid === event.participant.identity) {
          // Host is leaving, trigger disconnection handler
          await this.circlesService.handleHostDisconnection(
            event.room.name,
            event.participant.identity,
          );
          this.logger.log(
            `Host ${event.participant.identity} left circle ${event.room.name}. Starting disconnection timeout.`,
          );
          return;
        }
      }

      // Regular participant left
      await this.decrementParticipantCount(
        event.room.name,
        event.participant.identity,
      );

      // Remove from hand raises if they had raised hand
      await this.removeHandRaise(event.room.name, event.participant.identity);

      this.logger.log(
        `Participant left: ${event.participant.identity} from ${event.room.name}`,
      );
    } catch (error) {
      this.logger.error(`Failed to handle participant.left: ${error.message}`);
      throw error;
    }
  }

  private async handleTrackPublished(event: WebhookEvent) {
    if (!event.room?.name || !event.participant?.identity || !event.track) {
      this.logger.warn('Track published event missing required data');
      return;
    }

    try {
      // Validate that the user exists in the system
      const db = admin.firestore();
      const userRef = db.collection('users').doc(event.participant.identity);
      const userSnap = await userRef.get();

      if (!userSnap.exists) {
        this.logger.error(
          `User not found: ${event.participant.identity} - cannot process track published event`,
        );
        throw new Error(`User not found: ${event.participant.identity}`);
      }

      // Track speaking time for analytics (audio tracks only)
      if (event.track.type === TrackType.AUDIO) {
        await this.startSpeakingTime(
          event.room.name,
          event.participant.identity,
        );
      }

      this.logger.log(
        `Track published: ${event.track.type === TrackType.AUDIO ? 'audio' : 'video'} by ${event.participant.identity}`,
      );
    } catch (error) {
      this.logger.error(`Failed to handle track.published: ${error.message}`);
      throw error;
    }
  }

  private async handleTrackUnpublished(event: WebhookEvent) {
    if (!event.room?.name || !event.participant?.identity || !event.track) {
      this.logger.warn('Track unpublished event missing required data');
      return;
    }

    try {
      // Validate that the user exists in the system
      const db = admin.firestore();
      const userRef = db.collection('users').doc(event.participant.identity);
      const userSnap = await userRef.get();

      if (!userSnap.exists) {
        this.logger.error(
          `User not found: ${event.participant.identity} - cannot process track unpublished event`,
        );
        throw new Error(`User not found: ${event.participant.identity}`);
      }

      // End speaking time tracking (audio tracks only)
      if (event.track.type === TrackType.AUDIO) {
        await this.endSpeakingTime(event.room.name, event.participant.identity);
      }

      this.logger.log(
        `Track unpublished: ${event.track.type === TrackType.AUDIO ? 'audio' : 'video'} by ${event.participant.identity}`,
      );
    } catch (error) {
      this.logger.error(`Failed to handle track.unpublished: ${error.message}`);
      throw error;
    }
  }

  // Helper methods for participant count management
  private async incrementParticipantCount(circleId: string, userId: string) {
    const db = admin.firestore();
    const circleRef = db.collection('circles').doc(circleId);
    const memberRef = db.collection(`circles/${circleId}/members`).doc(userId);

    // Check if member is already active to avoid double counting
    const memberSnap = await memberRef.get();

    if (memberSnap.exists) {
      const member = memberSnap.data();
      // Only increment if member is not already active
      if (member?.status !== 'active') {
        await circleRef.update({
          participantCount: admin.firestore.FieldValue.increment(1),
        });
      }
    } else {
      // Member doesn't exist, increment count
      await circleRef.update({
        participantCount: admin.firestore.FieldValue.increment(1),
      });
    }
  }

  private async decrementParticipantCount(circleId: string, userId: string) {
    const db = admin.firestore();
    const circleRef = db.collection('circles').doc(circleId);
    const memberRef = db.collection(`circles/${circleId}/members`).doc(userId);

    // Check if member is active before decrementing
    const memberSnap = await memberRef.get();

    if (memberSnap.exists) {
      const member = memberSnap.data();
      // Only decrement if member is currently active
      if (member?.status === 'active') {
        await circleRef.update({
          participantCount: admin.firestore.FieldValue.increment(-1),
        });
      }
    }
  }

  private async removeHandRaise(circleId: string, userId: string) {
    const db = admin.firestore();
    await db.collection(`circles/${circleId}/handRaises`).doc(userId).delete();
  }

  private async startSpeakingTime(circleId: string, userId: string) {
    const db = admin.firestore();
    const memberRef = db.collection(`circles/${circleId}/members`).doc(userId);

    await memberRef.update({
      lastSpokeAt: admin.firestore.Timestamp.now(),
    });
  }

  private async endSpeakingTime(circleId: string, userId: string) {
    const db = admin.firestore();
    const memberRef = db.collection(`circles/${circleId}/members`).doc(userId);

    // Calculate speaking time and update total
    const memberSnap = await memberRef.get();
    const member = memberSnap.data() as CircleMember;

    if (member?.lastSpokeAt) {
      const speakDuration = Date.now() - member.lastSpokeAt.toMillis();
      const currentTotal = member.totalSpeakTime || 0;

      await memberRef.update({
        totalSpeakTime: currentTotal + speakDuration,
        lastSpokeAt: null,
      });
    } else {
      // Ensure lastSpokeAt is null if not set
      await memberRef.update({
        lastSpokeAt: null,
      });
    }
  }

  private async cleanupRoomData(roomName: string) {
    try {
      const db = admin.firestore();

      // Remove hand raises
      const handRaisesRef = db.collection(`circles/${roomName}/handRaises`);
      const handRaisesSnap = await handRaisesRef.get();
      const batch = db.batch();

      handRaisesSnap.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      this.logger.log(`Cleaned up room data for: ${roomName}`);
    } catch (error) {
      this.logger.error(
        `Failed to cleanup room data for ${roomName}: ${error.message}`,
      );
    }
  }
}
