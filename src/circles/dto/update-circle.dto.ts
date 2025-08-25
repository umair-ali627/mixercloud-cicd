import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsUrl,
  IsDateString,
  IsBoolean,
} from 'class-validator';

export class UpdateCircleDto {
  @ApiProperty({
    example: 'Music Lovers',
    required: false,
    description: 'Title of the Circle',
  })
  @IsOptional()
  @IsString()
  readonly title?: string;

  @ApiProperty({
    example: 'A great place to discuss music and share playlists',
    required: false,
    description: 'Description of the Circle',
  })
  @IsOptional()
  @IsString()
  readonly description?: string;

  @ApiProperty({
    example: 'music',
    required: false,
    description: 'Category of the Circle',
  })
  @IsOptional()
  @IsString()
  readonly category?: string;

  @ApiProperty({
    example: 'public',
    enum: ['public', 'private', 'secret'],
    required: false,
    description: 'Privacy setting',
  })
  @IsOptional()
  @IsEnum(['public', 'private', 'secret'])
  readonly privacy?: 'public' | 'private' | 'secret';

  @ApiProperty({
    example:
      'https://fastly.picsum.photos/id/4/5000/3333.jpg?hmac=ghf06FdmgiD0-G4c9DdNM8RnBIN7BO0-ZGEw47khHP4',
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
    example: false,
    required: false,
    description: 'Whether this circle is a replay',
  })
  @IsOptional()
  @IsBoolean()
  readonly isReplay?: boolean;
}
