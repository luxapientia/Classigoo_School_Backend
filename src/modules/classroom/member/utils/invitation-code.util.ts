import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VirtualStudent } from '../schemas/virtual-student.schema';
import * as randomstring from 'randomstring';

@Injectable()
export class InvitationCodeUtil {
  constructor(
    @InjectRepository(VirtualStudent)
    private virtualStudentRepository: Repository<VirtualStudent>,
  ) {}

  /**
   * Generate a unique invitation code for virtual students
   * @returns Promise<string> - Unique 10-character alphanumeric code
   */
  async generateUniqueCode(): Promise<string> {
    let code: string = '';
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      // Generate 10-character alphanumeric code
      code = randomstring.generate({
        length: 10,
        charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        readable: true, // Avoid confusing characters like 0 and O
      });

      // Check if code already exists
      const existingStudent = await this.virtualStudentRepository.findOne({
        where: { invitation_code: code }
      });

      if (!existingStudent) {
        isUnique = true;
      }

      attempts++;
    }

    if (!isUnique) {
      throw new Error('Failed to generate unique invitation code after maximum attempts');
    }

    return code;
  }

  /**
   * Validate if an invitation code exists and is available
   * @param code - The invitation code to validate
   * @returns Promise<{exists: boolean, available: boolean, student?: VirtualStudent}>
   */
  async validateCode(code: string): Promise<{
    exists: boolean;
    available: boolean;
    student?: VirtualStudent;
  }> {
    const student = await this.virtualStudentRepository.findOne({
      where: { invitation_code: code },
      relations: ['classroom', 'parent']
    });

    if (!student) {
      return { exists: false, available: false };
    }

    return {
      exists: true,
      available: !student.parent_connected,
      student
    };
  }
} 