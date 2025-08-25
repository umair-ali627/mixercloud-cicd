import {
  Controller,
  Post,
  Req,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WebhookService } from './webhook.service';
import { LivekitService } from '../livekit/livekit.service';
import { Request } from 'express';

interface RawBodyRequest<T> extends Request {
  rawBody: Buffer;
}

@ApiTags('webhook')
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly webhookService: WebhookService,
    private readonly livekitService: LivekitService,
  ) {}

  @Post('circles')
  @ApiOperation({ summary: 'LiveKit webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid signature' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid payload' })
  async handleLiveKitWebhook(@Req() req: RawBodyRequest<Request>) {
    const authHeader = req.headers.authorization as string;

    if (!authHeader) {
      this.logger.error('Missing authorization header');
      throw new UnauthorizedException('Missing authorization header');
    }

    if (!req.rawBody) {
      this.logger.error('Empty webhook body');
      throw new BadRequestException('Empty webhook body');
    }

    const rawBodyString = req.rawBody.toString('utf8');

    if (rawBodyString.length === 0) {
      this.logger.error('Empty webhook body string');
      throw new BadRequestException('Empty webhook body');
    }

    try {
      JSON.parse(rawBodyString);
    } catch (error) {
      this.logger.error('Invalid JSON in webhook body');
      throw new BadRequestException('Invalid JSON payload');
    }

    return await this.webhookService.processWebhook(rawBodyString, authHeader);
  }
}
