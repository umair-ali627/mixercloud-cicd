import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';

export class JoinCircleDto {
  @ApiProperty({
    example: 'listener',
    enum: ['listener'],
    required: false,
    description:
      'Role to join as. Only listener is allowed for regular users. Host role is automatically assigned to circle creator.',
    default: 'listener',
  })
  @IsOptional()
  @IsEnum(['listener'])
  readonly role?: 'listener';
}
