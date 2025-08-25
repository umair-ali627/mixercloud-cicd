import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { CirclesService } from '../circles/circles.service';
import { FirebaseService } from '../firebase/firebase.service';
import { LivekitService } from '../livekit/livekit.service';

@Module({
  controllers: [WebhookController],
  providers: [WebhookService, CirclesService, FirebaseService, LivekitService],
})
export class WebhookModule {}
