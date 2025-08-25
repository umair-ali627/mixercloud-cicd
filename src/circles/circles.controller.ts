import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CirclesService } from './circles.service';
import { CreateCircleDto } from './dto/create-circle.dto';
import { UpdateCircleDto } from './dto/update-circle.dto';
import { JoinCircleDto } from './dto/join-circle.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PromoteCircleDto } from './dto/promote-circle.dto';

export interface AuthenticatedRequest extends Request {
  user: { uid: string };
}

@ApiTags('circles')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('circles')
export class CirclesController {
  constructor(private readonly circlesService: CirclesService) {}

  @Post()
  @ApiOperation({ summary: 'Create Circle' })
  @ApiBody({ type: CreateCircleDto })
  @ApiResponse({
    status: 201,
    description: 'Circle created successfully',
    schema: {
      example: {
        circleId: 'abc123',
        sfuToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        circle: {
          id: 'abc123',
          title: 'Music Lovers',
          description: 'A great place to discuss music and share playlists',
          category: 'music',
          privacy: 'public',
          hostUid: 'user123',
          status: 'live',
          participantCount: 1,
          endedAt: null,
          isReplay: false,
          maxSpeakers: 8,
          createdAt: '2025-01-01T10:00:00Z',
          startAt: '2025-01-01T10:00:00Z',
          coverUrl:
            'https://fastly.picsum.photos/id/4/5000/3333.jpg?hmac=ghf06FdmgiD0-G4c9DdNM8RnBIN7BO0-ZGEw47khHP4',
          totalSpeakTime: 0,
          handRaiseCount: 0,
          roleChangeCount: 0,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() dto: CreateCircleDto, @Req() req: AuthenticatedRequest) {
    try {
      const userId = req.user?.uid;
      return await this.circlesService.createCircle(dto, userId);
    } catch (error) {
      throw new HttpException(
        error.message || ('Unexpected error' as string),
        error.message
          ? HttpStatus.BAD_REQUEST
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update Circle' })
  @ApiParam({ name: 'id', type: String, description: 'Circle ID' })
  @ApiBody({ type: UpdateCircleDto })
  @ApiResponse({
    status: 200,
    description: 'Circle updated successfully',
    schema: {
      example: {
        id: 'abc123',
        title: 'Updated Music Lovers',
        description: 'An updated description for the music circle',
        category: 'music',
        privacy: 'public',
        coverUrl:
          'https://fastly.picsum.photos/id/4/5000/3333.jpg?hmac=ghf06FdmgiD0-G4c9DdNM8RnBIN7BO0-ZGEw47khHP4',
        startAt: '2025-01-01T10:00:00Z',
        maxSpeakers: 8,
        isReplay: false,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - only host can update' })
  @ApiResponse({ status: 404, description: 'Circle not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCircleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const userId = req.user?.uid;
      return await this.circlesService.updateCircle(id, dto, userId);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          throw new HttpException(error.message, HttpStatus.NOT_FOUND);
        }
        if (error.message.includes('Only host can update')) {
          throw new HttpException(error.message, HttpStatus.FORBIDDEN);
        }
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }

      // if it's not an Error object (very rare)
      throw new HttpException(
        'Unexpected error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update Circle Status' })
  @ApiParam({ name: 'id', type: String, description: 'Circle ID' })
  @ApiBody({ type: UpdateStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Circle status updated successfully',
    schema: {
      example: {
        id: 'abc123',
        status: 'live',
        endedAt: null, // Only set when status is 'ended'
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid status transition',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only host can update status',
  })
  @ApiResponse({ status: 404, description: 'Circle not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body() statusDto: UpdateStatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const userId = req.user?.uid;
      return await this.circlesService.updateCircleStatus(
        id,
        statusDto.status,
        userId,
      );
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          throw new HttpException(error.message, HttpStatus.NOT_FOUND);
        }
        if (error.message.includes('Only host can update')) {
          throw new HttpException(error.message, HttpStatus.FORBIDDEN);
        }
        if (error.message.includes('Invalid status transition')) {
          throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
        }
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }

      throw new HttpException(
        'Unexpected error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'End Circle' })
  @ApiParam({ name: 'id', type: String, description: 'Circle ID' })
  @ApiResponse({
    status: 200,
    description: 'Circle ended successfully',
    schema: {
      example: {
        id: 'abc123',
        status: 'ended',
        endedAt: '2025-01-01T10:30:00Z', // Timestamp when circle was ended
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - only host can end' })
  @ApiResponse({ status: 404, description: 'Circle not found' })
  async end(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    try {
      const userId = req.user?.uid;
      return await this.circlesService.endCircle(id, userId);
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          throw new HttpException(error.message, HttpStatus.NOT_FOUND);
        }
        if (error.message.includes('Only host can update')) {
          throw new HttpException(error.message, HttpStatus.FORBIDDEN);
        }
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }

      // fallback if it's not an Error object
      throw new HttpException(
        'Unexpected error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id/delete')
  @ApiOperation({ summary: 'Delete Circle' })
  @ApiParam({ name: 'id', type: String, description: 'Circle ID' })
  @ApiResponse({
    status: 200,
    description: 'Circle deleted successfully',
    schema: {
      example: {
        id: 'abc123',
        deleted: true,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - only host can delete' })
  @ApiResponse({ status: 404, description: 'Circle not found' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - only scheduled circles can be deleted',
  })
  async delete(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    try {
      const userId = req.user?.uid;
      return await this.circlesService.deleteCircle(id, userId);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          throw new HttpException(error.message, HttpStatus.NOT_FOUND);
        }
        if (error.message.includes('Only host can delete')) {
          throw new HttpException(error.message, HttpStatus.FORBIDDEN);
        }
        if (error.message.includes('Only scheduled circles can be deleted')) {
          throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
        }
      }
      throw new HttpException(
        'Unexpected error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join Circle' })
  @ApiParam({ name: 'id', type: String, description: 'Circle ID' })
  @ApiBody({ type: JoinCircleDto })
  @ApiResponse({
    status: 200,
    description: 'Joined circle successfully',
    schema: {
      example: {
        webrtcToken: 'livekit_token_here',
        role: 'listener', // 'host', 'speaker', or 'listener'
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Circle not found' })
  @ApiResponse({ status: 409, description: 'Conflict - already a member' })
  async join(
    @Param('id') id: string,
    @Body() joinDto: JoinCircleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const userId = req.user?.uid;
      return await this.circlesService.joinCircle(id, userId, joinDto);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          throw new HttpException(error.message, HttpStatus.NOT_FOUND);
        }
        if (error.message.includes('already a member')) {
          throw new HttpException(error.message, HttpStatus.CONFLICT);
        }
      }
      throw new HttpException(
        'Unexpected error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/promote')
  @ApiOperation({
    summary: 'Promote or demote a circle member (e.g. listener -> speaker)',
  })
  @ApiBody({
    description: 'Target user and new role',
    type: PromoteCircleDto,
    examples: {
      promoteToSpeaker: {
        summary: 'Promote user to speaker',
        value: {
          targetUserId: 'user_12345',
          newRole: 'speaker',
        },
      },
      demoteToListener: {
        summary: 'Demote user to listener',
        value: {
          targetUserId: 'user_67890',
          newRole: 'listener',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Role updated successfully',
    schema: {
      example: {
        webrtcToken: 'askdhlihsflahweiralief',
        role: 'speaker',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only host can promote/demote',
  })
  @ApiResponse({ status: 404, description: 'Circle or member not found' })
  async promote(
    @Param('id') id: string,
    @Body() promoteDto: PromoteCircleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const userId = req.user?.uid;
      return await this.circlesService.promoteMember(id, userId, promoteDto);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          throw new HttpException(error.message, HttpStatus.NOT_FOUND);
        }
        if (error.message.includes('forbidden')) {
          throw new HttpException(error.message, HttpStatus.FORBIDDEN);
        }
      }
      throw new HttpException(
        'Unexpected error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/leave')
  @ApiOperation({ summary: 'Leave Circle' })
  @ApiParam({ name: 'id', type: String, description: 'Circle ID' })
  @ApiResponse({
    status: 200,
    description: 'Left circle successfully',
    schema: {
      example: {
        id: 'abc123',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - host cannot leave' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Circle not found' })
  async leave(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    try {
      const userId = req.user?.uid;
      return await this.circlesService.leaveCircle(id, userId);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          throw new HttpException(error.message, HttpStatus.NOT_FOUND);
        }
        if (error.message.includes('Host cannot leave')) {
          throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
        }
      }
      throw new HttpException(
        'Unexpected error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get circles directory' })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    enum: ['scheduled', 'live', 'ended'],
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    description: 'Filter by category',
  })
  @ApiQuery({
    name: 'privacy',
    required: false,
    type: String,
    enum: ['public', 'private', 'secret'],
    description: 'Filter by privacy',
  })
  @ApiQuery({
    name: 'isReplay',
    required: false,
    type: Boolean,
    description: 'Filter by replay status',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of results to return',
    default: 20,
  })
  @ApiQuery({
    name: 'startAfter',
    required: false,
    type: String,
    description: 'Cursor for pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'List of circles',
    schema: {
      example: [
        {
          id: 'abc123',
          title: 'Music Lovers',
          description: 'A great place to discuss music',
          category: 'music',
          privacy: 'public',
          hostUid: 'your-firebase-uid',
          status: 'scheduled',
          participantCount: 5,
          endedAt: null,
          isReplay: false,
          maxSpeakers: 8,
          createdAt: '2025-01-01T09:00:00Z',
          startAt: '2025-01-01T10:00:00Z',
          coverUrl:
            'https://fastly.picsum.photos/id/4/5000/3333.jpg?hmac=ghf06FdmgiD0-G4c9DdNM8RnBIN7BO0-ZGEw47khHP4',
          totalSpeakTime: 0,
          handRaiseCount: 0,
          roleChangeCount: 0,
        },
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCircles(@Query() query) {
    try {
      return await this.circlesService.getCircles(query);
    } catch (error) {
      throw new HttpException(
        error.message || ('Unexpected error' as string),
        error.message
          ? HttpStatus.BAD_REQUEST
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get circle details with members' })
  @ApiParam({ name: 'id', type: String, description: 'Circle ID' })
  @ApiResponse({
    status: 200,
    description: 'Circle details with members and hand raises',
    schema: {
      example: {
        id: 'abc123',
        title: 'Music Lovers',
        description: 'A great place to discuss music',
        category: 'music',
        privacy: 'public',
        hostUid: 'your-firebase-uid',
        status: 'scheduled',
        participantCount: 3,
        endedAt: null,
        isReplay: false,
        maxSpeakers: 8,
        createdAt: '2025-01-01T09:00:00Z',
        startAt: '2025-01-01T10:00:00Z',
        coverUrl:
          'https://fastly.picsum.photos/id/4/5000/3333.jpg?hmac=ghf06FdmgiD0-G4c9DdNM8RnBIN7BO0-ZGEw47khHP4',
        totalSpeakTime: 0,
        handRaiseCount: 0,
        roleChangeCount: 0,
        members: [
          {
            userId: 'user123',
            role: 'host',
            isMuted: false,
            joinedAt: '2025-01-01T09:00:00Z',
            lastSpokeAt: null,
            totalSpeakTime: 0,
            handRaiseCount: 0,
            roleChangeCount: 0,
            lastRoleChangeAt: null,
            isMutedByHost: null,
            muteReason: null,
            kickCount: 0,
            lastKickAt: null,
            kickReason: null,
          },
        ],
        handRaises: [
          {
            userId: 'user456',
            raisedAt: '2025-01-01T10:15:00Z',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Circle not found' })
  async getCircleDetails(@Param('id') id: string) {
    try {
      return await this.circlesService.getCircleDetails(id);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          throw new HttpException(error.message, HttpStatus.NOT_FOUND);
        }
      }
      throw new HttpException(
        'Unexpected error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/statuses')
  @ApiOperation({ summary: 'Get available status transitions' })
  @ApiParam({ name: 'id', type: String, description: 'Circle ID' })
  @ApiResponse({
    status: 200,
    description: 'Available status transitions',
    schema: {
      example: {
        currentStatus: 'scheduled',
        availableStatuses: ['live', 'ended'],
        allStatuses: ['scheduled', 'live', 'ended'],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - only host can view' })
  @ApiResponse({ status: 404, description: 'Circle not found' })
  async getAvailableStatuses(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      // const userId = this.getUserId(req);
      const userId = req.user?.uid;
      return await this.circlesService.getAvailableStatuses(id, userId);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          throw new HttpException(error.message, HttpStatus.NOT_FOUND);
        }
        if (error.message.includes('Only host can view')) {
          throw new HttpException(error.message, HttpStatus.FORBIDDEN);
        }
      }
      throw new HttpException(
        'Unexpected error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
