import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum } from 'class-validator';

export class UpdateStatusDto {
  @ApiProperty({
    example: 'live',
    enum: ['scheduled', 'live', 'ended'],
    description: 'New status for the circle',
  })
  @IsString()
  @IsEnum(['scheduled', 'live', 'ended'])
  readonly status: 'scheduled' | 'live' | 'ended';
}
