import { IsString, IsIn } from 'class-validator';

export class PromoteCircleDto {
  @IsString()
  targetUserId: string;

  @IsIn(['listener', 'speaker', 'host'])
  newRole: 'listener' | 'speaker' | 'host';
}
