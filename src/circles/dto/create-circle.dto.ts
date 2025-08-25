import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsUrl,
  Min,
  Max,
  IsDateString,
  IsBoolean,
} from 'class-validator';

export class CreateCircleDto {
  @ApiProperty({ example: 'Music Lovers', description: 'Title of the Circle' })
  @IsString()
  readonly title: string;

  @ApiProperty({
    example: 'A great place to discuss music and share playlists',
    required: false,
    description: 'Description of the Circle',
  })
  @IsOptional()
  @IsString()
  readonly description?: string;

  @ApiProperty({ example: 'music', description: 'Category of the Circle' })
  @IsString()
  readonly category: string;

  @ApiProperty({
    example: 'public',
    enum: ['public', 'private', 'secret'],
    description: 'Privacy setting',
  })
  @IsEnum(['public', 'private', 'secret'])
  readonly privacy: 'public' | 'private' | 'secret';

  @ApiProperty({
    example: 'https://example.com/cover.jpg',
    required: false,
    description: 'Cover image URL',
  })
  @IsOptional()
  @IsUrl()
  readonly coverUrl?: string;

  @ApiProperty({
    example: '2025-08-06T15:00:00.000Z',
    required: false,
    description: 'Start time (ISO string)',
  })
  @IsOptional()
  @IsDateString()
  readonly startAt?: string;

  @ApiProperty({
    example: 8,
    required: false,
    description: 'Maximum number of speakers',
    default: 8,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  readonly maxSpeakers?: number;

  @ApiProperty({
    example: false,
    required: false,
    description: 'Whether this circle is a replay',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  readonly isReplay?: boolean;
}
