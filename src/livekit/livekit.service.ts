import { Injectable, Logger } from '@nestjs/common';
import { AccessToken } from 'livekit-server-sdk';

@Injectable()
export class LivekitService {
  private readonly logger = new Logger(LivekitService.name);

  async mintToken(
    userId: string,
    room: string,
    role: 'host' | 'speaker' | 'listener',
    fullName?: string,
  ) {
    try {
      const apiKey = process.env.LIVEKIT_API_KEY;
      const apiSecret = process.env.LIVEKIT_API_SECRET;

      if (!apiKey || !apiSecret) {
        throw new Error('LiveKit API credentials not configured');
      }

      // Validate inputs
      if (!userId || !room || !role) {
        throw new Error(
          'Invalid parameters: userId, room, and role are required',
        );
      }

      // Create access token with proper identity
      const at = new AccessToken(apiKey, apiSecret, {
        identity: userId,
        name: fullName || userId, // Use fullName if provided, otherwise fallback to userId
      });

      // Set permissions based on role
      const canPublish = role === 'host' || role === 'speaker';
      const canPublishData =
        role === 'host' || role === 'speaker' || role === 'listener';

      at.addGrant({
        room,
        roomJoin: true,
        canPublish,
        canSubscribe: true,
        canPublishData,
        // Additional permissions for hosts
        ...(role === 'host' && {
          roomAdmin: true,
          roomCreate: true,
        }),
      });

      const jwt = await at.toJwt();

      // Validate JWT format
      if (!jwt || typeof jwt !== 'string' || jwt.split('.').length !== 3) {
        throw new Error('Generated JWT token is invalid');
      }

      this.logger.log(
        `Successfully generated LiveKit token for user ${fullName || userId} in room ${room} with role ${role}`,
      );

      return jwt;
    } catch (error) {
      this.logger.error(
        `Failed to generate LiveKit token: ${error.message}`,
        error.stack,
      );
      throw new Error(`Token generation failed: ${error.message}`);
    }
  }
}
