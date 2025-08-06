import { Injectable, UnauthorizedException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/schemas/user.schema';
import { JwtPayload } from '../../common/decorators/user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { ProcessedFile } from '../classroom/common/interfaces/response.interface';
import { FileService } from '../../shared/services/file.service';

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private fileService: FileService,
  ) {}

  async getProfile(userId: string, user: JwtPayload): Promise<any> {
    if (user.user_id !== userId) {
      throw new UnauthorizedException('You are not authorized to access this resource');
    }

    const userData = await this.userRepo.findOne({ where: { id: userId } });
    if (!userData) {
      throw new NotFoundException('User not found');
    }
    return userData;
  }

  async uploadAvatar(files: Array<ProcessedFile>, user: JwtPayload): Promise<boolean> {
    try {
      const userData = await this.userRepo.findOne({ where: { id: user.user_id } });
      if (!userData) {
        throw new NotFoundException('User not found');
      }

      const avatarFile = files[0];

      if (userData.avatar?.bucketKey) {
        await this.fileService.deleteFile(userData.avatar.bucketKey);
      }

      userData.avatar = {
        bucketKey: avatarFile.key,
        url: avatarFile.signedUrl,
      };

      await this.userRepo.save(userData);

      return true;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to upload avatar');
    }
  }

  async updateProfile(userId: string, updateData: UpdateProfileDto, user: JwtPayload): Promise<boolean> {
    if (user.user_id !== userId) {
      throw new UnauthorizedException('You are not authorized to access this resource');
    }

    const result = await this.userRepo.update({ id: userId }, updateData);
    return result.affected ? result.affected > 0 : false;
  }

  async updateAddress(userId: string, address: UpdateAddressDto, user: JwtPayload): Promise<boolean> {
    if (user.user_id !== userId) {
      throw new UnauthorizedException('You are not authorized to access this resource');
    }

    const result = await this.userRepo.update({ id: userId }, { address });
    return result.affected ? result.affected > 0 : false;
  }
} 