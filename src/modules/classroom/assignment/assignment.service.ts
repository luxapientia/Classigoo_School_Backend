import { Injectable, NotFoundException, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { JwtPayload } from '../../../common/decorators/user.decorator';
import { Assignment } from './schemas/assignment.schema';
import { AssignmentSubmission } from './schemas/assignment-submission.schema';
import { Classroom } from '../core/schemas/classroom.schema';
import { ClassroomAccess } from '../core/schemas/classroom-access.schema';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { CreateAssignmentSubmissionDto } from './dto/create-assignment-submission.dto';
import { UpdateAssignmentSubmissionDto } from './dto/update-assignment-submission.dto';
import { DeleteFileDto } from './dto/delete-file.dto';
import { FileService } from '../../../shared/services/file.service';
import { PubSubService } from 'src/shared/services/pubsub.service';

@Injectable()
export class AssignmentService {
  constructor(
    @InjectRepository(Assignment)
    private assignmentRepo: Repository<Assignment>,
    @InjectRepository(AssignmentSubmission)
    private assignmentSubmissionRepo: Repository<AssignmentSubmission>,
    @InjectRepository(Classroom)
    private classroomRepo: Repository<Classroom>,
    @InjectRepository(ClassroomAccess)
    private classroomAccessRepo: Repository<ClassroomAccess>,
    private fileService: FileService,
    private pubSubService: PubSubService
  ) {}

  async createAssignment(createAssignmentDto: CreateAssignmentDto, user: JwtPayload): Promise<any> {
    try {
      // Check if user has permission to create assignment in this classroom
      const access = await this.classroomAccessRepo.findOne({
        where: {
          classroom: { id: createAssignmentDto.class_id },
          user: { id: user.user_id },
        status: 'accepted',
          role: In(['owner', 'teacher'])
        }
      });

      if (!access) {
        throw new UnauthorizedException('You do not have permission to create assignments in this classroom');
      }

      const assignment = this.assignmentRepo.create({
        ...createAssignmentDto,
        deadline: new Date(createAssignmentDto.deadline),
        creator: { id: user.user_id },
        classroom: { id: createAssignmentDto.class_id }
      });

      const createdAssignment = await this.assignmentRepo.save(assignment);

      // publish event
      await this.pubSubService.publish('assignment.updated', {
        cid: createAssignmentDto.class_id,
      });

      return {
        status: 'success',
        message: 'Assignment created successfully',
        data: createdAssignment
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not create assignment');
    }
  }

  async updateAssignment(updateAssignmentDto: UpdateAssignmentDto, user: JwtPayload): Promise<any> {
    try {
      const assignment = await this.assignmentRepo.findOne({
        where: { id: updateAssignmentDto.id },
        relations: ['classroom']
      });
      
      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }

      // Check if user has permission to update this assignment
      const access = await this.classroomAccessRepo.findOne({
        where: {
          classroom: { id: assignment.classroom.id },
          user: { id: user.user_id },
        status: 'accepted',
          role: In(['owner', 'teacher'])
        }
      });

      if (!access) {
        throw new UnauthorizedException('You do not have permission to update this assignment');
      }

      const { id, ...updateData } = updateAssignmentDto;
      const updatedAssignment = await this.assignmentRepo.save({
        id,
        ...updateData,
        deadline: new Date(updateAssignmentDto.deadline),
      });

      if (!updatedAssignment) {
        throw new InternalServerErrorException('Failed to update assignment');
      }

      // publish event
      await this.pubSubService.publish('assignment.updated', {
        cid: assignment.classroom.id,
        aid: updateAssignmentDto.id
      });
      
      return {
        status: 'success',
        message: 'Assignment updated successfully',
        data: updatedAssignment
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not update assignment');
    }
  }

  async deleteFile(deleteFileDto: DeleteFileDto, user: JwtPayload): Promise<{ status: string, message: string }> {
    try {
      // check if user is classroom owner or teacher
      const access = await this.classroomAccessRepo.findOne({
        where: {
          classroom: { id: deleteFileDto.classroom_id },
          user: { id: user.user_id },
        status: 'accepted',
        }
      });

      if (!access) {
        throw new UnauthorizedException('You do not have permission to delete files in this classroom');
      }

      // delete file
      await this.fileService.deleteFile(deleteFileDto.files[0]);

      return { status: 'success', message: 'File deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not delete file');
    }
  }

  async deleteAssignment(assignmentId: string, user: JwtPayload): Promise<{ status: string, message: string }> {
    try {
      const assignment = await this.assignmentRepo.findOne({
        where: { id: assignmentId },
        relations: ['classroom']
      });
      
      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }

      // Check if user has permission to delete this assignment
      const access = await this.classroomAccessRepo.findOne({
        where: {
          classroom: { id: assignment.classroom.id },
          user: { id: user.user_id },
        status: 'accepted',
          role: In(['owner', 'teacher'])
        }
      });

      if (!access) {
        throw new UnauthorizedException('You do not have permission to delete this assignment');
      }

      const result = await this.assignmentRepo.delete(assignmentId);
      if (!result) {
        throw new InternalServerErrorException('Failed to delete assignment');
      }

      // publish event
      await this.pubSubService.publish('assignment.updated', {
        cid: assignment.classroom.id,
        aid: assignmentId
      });

      return {
        status: 'success',
        message: 'Assignment deleted succesfully'
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not delete assignment');
    }
  }

  async getAssignmentSubmission(submissionId: string, user: JwtPayload): Promise<AssignmentSubmission | null> {
    try {
      const submission = await this.assignmentSubmissionRepo.findOne({
        where: { id: submissionId },
        relations: ['assignment']
      });
      if (!submission) {
        return null;
      }

      // Get the assignment to check classroom access
      const assignment = await this.assignmentRepo.findOne({
        where: { id: submission.assignment.id },
        relations: ['classroom']
      });
      if (!assignment) {
        throw new NotFoundException('Associated assignment not found');
      }

      // Check if user has access to view this submission
      const access = await this.classroomAccessRepo.findOne({
        where: {
          classroom: { id: assignment.classroom.id },
          user: { id: user.user_id },
        status: 'accepted'
        }
      });

      if (!access) {
        throw new UnauthorizedException('You do not have access to view this submission');
      }

      // If user is a student, they can only view their own submissions
      if (access.role === 'student' && submission.user.id.toString() !== user.user_id) {
        throw new UnauthorizedException('You can only view your own submissions');
      }

      return submission;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not get assignment submission');
    }
  }

  async createAssignmentSubmission(createAssignmentSubmissionDto: CreateAssignmentSubmissionDto, user: JwtPayload): Promise<AssignmentSubmission> {
    try {
      const assignment = await this.assignmentRepo.findOne({
        where: { id: createAssignmentSubmissionDto.assignment_id },
        relations: ['classroom']
      });
      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }

      // Check if assignment is published
      if (assignment.status !== 'published') {
        throw new BadRequestException('Cannot submit to an unpublished assignment');
      }

      // Check if user is a member of the classroom
      const access = await this.classroomAccessRepo.findOne({
        where: {
          classroom: { id: assignment.classroom.id },
          user: { id: user.user_id },
        status: 'accepted',
        role: 'student'
        }
      });

      if (!access) {
        throw new UnauthorizedException('You do not have permission to submit to this assignment');
      }

      // Check if user already has a submission
      const existingSubmission = await this.assignmentSubmissionRepo.findOne({
        where: {
          assignment: { id: createAssignmentSubmissionDto.assignment_id },
          user: { id: user.user_id }
        }
      });

      if (existingSubmission) {
        throw new BadRequestException('You have already submitted to this assignment');
      }

      const submission = this.assignmentSubmissionRepo.create({
        ...createAssignmentSubmissionDto,
        user: { id: user.user_id },
        assignment: { id: createAssignmentSubmissionDto.assignment_id }
      });

      // publish event
      await this.pubSubService.publish('assignment.updated', {
        aid: createAssignmentSubmissionDto.assignment_id,
        cid: assignment.classroom.id
      });

      return await this.assignmentSubmissionRepo.save(submission);
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not create submission');
    }
  }

  async updateAssignmentSubmission(updateAssignmentSubmissionDto: UpdateAssignmentSubmissionDto, user: JwtPayload): Promise<AssignmentSubmission> {
    try {
      const submission = await this.assignmentSubmissionRepo.findOne({
        where: { id: updateAssignmentSubmissionDto.id },
        relations: ['assignment']
      });
      if (!submission) {
        throw new NotFoundException('Submission not found');
      }

      // Check if user owns this submission
      if (submission.user.id.toString() !== user.user_id) {
        throw new UnauthorizedException('You do not have permission to update this submission');
      }

      // Get the assignment id of the updated submission


      const { id, ...updateData } = updateAssignmentSubmissionDto;
      const updatedSubmission = await this.assignmentSubmissionRepo.save({
        id,
        ...updateData
      });
      if (!updatedSubmission) {
        throw new InternalServerErrorException('Failed to update submission');
      }

      // publish event
      await this.pubSubService.publish('assignment.updated', {
        aid: submission.assignment.id.toString(),
      });

      return updatedSubmission;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not update submission');
    }
  }

  async listAssignments(classId: string, user: JwtPayload): Promise<any> {
    try {
      const access = await this.classroomAccessRepo.findOne({
        where: {
          classroom: { id: classId },
          user: { id: user.user_id },
        status: 'accepted',
        }
      });

      if (!access) {
        throw new UnauthorizedException('You do not have permission to view the assignments');
      }

      const result = await this.assignmentRepo.find({
        where: { classroom: { id: classId } },
        order: { created_at: 'DESC' },
        relations: ['creator']
      });

      return {
        status: 'success',
        message: 'Assignments retrieved successfully',
        data: result.map(assignment => ({
          _id: assignment.id,
          status: assignment.status,
          title: assignment.title,
          content: assignment.content,
          deadline: assignment.deadline,
          audience: assignment.audience,
          creator_id: assignment.creator.id,
          owner: {
            id: assignment.creator.id,
            name: assignment.creator.name,
            avatar: assignment.creator.avatar,
            email: assignment.creator.email
          },
          updated_at: assignment.updated_at
        }))
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not retrieve assignments');
    }
  }

  async getAssignment(id: string, user: JwtPayload): Promise<any> {
    try {
      const assignment = await this.assignmentRepo.findOne({
        where: { id },
        relations: ['classroom', 'creator']
      });
      
      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }

      // Check if user has access to the classroom
      const access = await this.classroomAccessRepo.findOne({
        where: {
          classroom: { id: assignment.classroom.id },
          user: { id: user.user_id },
        status: 'accepted',
        }
      });

      if (!access) {
        throw new UnauthorizedException('You do not have permission to view this assignment');
      }

      // Get assignment with owner and submissions using TypeORM
      const result = await this.assignmentRepo.findOne({
        where: { id },
        relations: ['creator', 'submissions', 'submissions.user']
      });

      if (!result) {
        throw new NotFoundException('Assignment not found');
      }

      return {
        status: 'success',
        message: 'Assignment retrieved successfully',
        data: {
          id: result.id,
          title: result.title,
          files: result.files,
          status: result.status,
          content: result.content,
          deadline: result.deadline,
          audience: result.audience,
          class_id: result.classroom.id,
          creator_id: result.creator.id,
          created_at: result.created_at,
          updated_at: result.updated_at,
          owner: {
            id: result.creator.id,
            name: result.creator.name,
            email: result.creator.email,
            avatar: result.creator.avatar
          },
          assignment_submissions: result.submissions?.map(submission => ({
            id: submission.id,
            files: submission.files,
            status: submission.status,
            created_at: submission.created_at,
            updated_at: submission.updated_at,
            submitter: {
              id: submission.user.id,
              name: submission.user.name,
              email: submission.user.email,
              avatar: submission.user.avatar
            }
          })) || []
        }
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not retrieve assignment');
    }
  }
} 