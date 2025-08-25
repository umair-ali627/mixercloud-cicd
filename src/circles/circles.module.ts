import { Module } from '@nestjs/common';
import { CirclesController } from './circles.controller';
import { CirclesService } from './circles.service';
import { FirebaseService } from '../firebase/firebase.service';
import { LivekitService } from '../livekit/livekit.service';

@Module({
  controllers: [CirclesController],
  providers: [CirclesService, FirebaseService, LivekitService],
  exports: [CirclesService],
})
export class CirclesModule {}
