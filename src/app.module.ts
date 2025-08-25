import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CirclesModule } from './circles/circles.module';
import { WebhookModule } from './webhook/webhook.module';
import { FirebaseService } from './firebase/firebase.service';
import { LivekitService } from './livekit/livekit.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CirclesModule,
    WebhookModule,
  ],
  providers: [FirebaseService, LivekitService],
})
export class AppModule {}
