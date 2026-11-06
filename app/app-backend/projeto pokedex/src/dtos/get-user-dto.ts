import { Trim } from './input-transforms';
export class GetUserDTO {
  id: number = 0;
  @Trim()
  name: string = '';
  email: string = '';
  createdAt: Date = new Date();
}
