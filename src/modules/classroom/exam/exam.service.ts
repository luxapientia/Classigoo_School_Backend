import { Injectable, NotFoundException, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { JwtPayload } from '../../../common/decorators/user.decorator';
import { Exam } from './schemas/exam.schema';
import { ExamSubmission } from './schemas/exam-submission.schema';
import { Classroom } from '../core/schemas/classroom.schema';
import { ClassroomAccess } from '../core/schemas/classroom-access.schema';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { CreateExamSubmissionDto } from './dto/create-exam-submission.dto';
import { UpdateExamSubmissionDto } from './dto/update-exam-submission.dto';
import { UpdateExamSubmissionMarkingsDto } from './dto/update-exam-submission-markings.dto';
import { DeleteFileDto } from './dto/delete-file.dto';
import { User } from '../../../modules/auth/schemas/user.schema';
import { Notification } from '../../notification/schemas/notification.schema';
import { PubSubService } from '../../../shared/services/pubsub.service';
import { FileService } from '../../../shared/services/file.service';
import { ExamGradeDto } from './dto/list-exam-grades.dto';

@Injectable()
export class ExamService {
  constructor(
    @InjectRepository(Exam)
    private examRepo: Repository<Exam>,
    @InjectRepository(ExamSubmission)
    private examSubmissionRepo: Repository<ExamSubmission>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Classroom)
    private classroomRepo: Repository<Classroom>,
    @InjectRepository(ClassroomAccess)
    private classroomAccessRepo: Repository<ClassroomAccess>,
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
    private readonly pubSubService: PubSubService,
    private fileService: FileService
  ) {}

  async createExam(createExamDto: CreateExamDto, user: JwtPayload): Promise<any> {
    const classroom = await this.classroomRepo.findOne({
      where: { id: createExamDto.class_id }
    });
    
    if (!classroom) {
      throw new NotFoundException('Classroom not found');
    }

    const access = await this.classroomAccessRepo.findOne({
      where: {
        classroom: { id: createExamDto.class_id },
        user: { id: user.user_id },
        status: 'accepted',
        role: In(['owner', 'teacher'])
      }
    });

    if (!access) {
      throw new UnauthorizedException('You do not have permission to create exams in this classroom');
    }

    const exam = new Exam();
    exam.title = createExamDto.title;
    exam.content = createExamDto.content;
    exam.audience = createExamDto.audience;
    exam.questions = createExamDto.questions;
    exam.duration = createExamDto.duration ? parseInt(createExamDto.duration) : 0;
    exam.status = createExamDto.status;
    exam.classroom = classroom;
    exam.owner = { id: user.user_id } as User;
    
    if (createExamDto.start_once) {
      exam.start_once = new Date(createExamDto.start_once);
    }

    const createdExam = await this.examRepo.save(exam);

    // publish event
    await this.pubSubService.publish('exam.updated', {
      cid: createExamDto.class_id,
    });

    return {
      status: 'success',
      message: 'Exam created successfully',
      data: createdExam
    };
  }

  async updateExam(updateExamDto: UpdateExamDto, user: JwtPayload): Promise<any> {
    const exam = await this.examRepo.findOne({
      where: { id: updateExamDto.id },
      relations: ['classroom']
    });
    
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const access = await this.classroomAccessRepo.findOne({
      where: {
        classroom: { id: exam.classroom.id },
        user: { id: user.user_id },
        status: 'accepted',
        role: In(['owner', 'teacher'])
      }
    });

    if (!access) {
      throw new UnauthorizedException('You do not have permission to update this exam');
    }

    exam.title = updateExamDto.title;
    exam.content = updateExamDto.content;
    exam.audience = updateExamDto.audience;
    exam.questions = updateExamDto.questions;
    exam.duration = updateExamDto.duration ? parseInt(updateExamDto.duration) : 0;
    exam.status = updateExamDto.status;
    
    if (updateExamDto.start_once) {
      exam.start_once = new Date(updateExamDto.start_once);
    }

    const updatedExam = await this.examRepo.save(exam);

    if (!updatedExam) {
      throw new InternalServerErrorException('Failed to update exam');
    }

    // publish event
    await this.pubSubService.publish('exam.updated', {
      cid: exam.classroom.id,
      eid: updateExamDto.id
    });

    return {
      status: 'success',
      message: 'Exam updated successfully',
      data: updatedExam
    };
  }

  async deleteExam(examId: string, user: JwtPayload): Promise<boolean> {
    const exam = await this.examRepo.findOne({
      where: { id: examId },
      relations: ['classroom']
    });
    
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const access = await this.classroomAccessRepo.findOne({
      where: {
        classroom: { id: exam.classroom.id },
        user: { id: user.user_id },
        status: 'accepted',
        role: In(['owner', 'teacher'])
      }
    });

    if (!access) {
      throw new UnauthorizedException('You do not have permission to delete this exam');
    }

    const result = await this.examRepo.delete(examId);
    if (!result.affected) {
      throw new InternalServerErrorException('Failed to delete exam');
    }

    // publish event
    await this.pubSubService.publish('exam.updated', {
      cid: exam.classroom.id,
    });

    return true;
  }

  async deleteFile(deleteFileDto: DeleteFileDto, user: JwtPayload): Promise<{ status: string, message: string }> {
    try {
      // check if user is owner of this exam submission
      const submission = await this.examSubmissionRepo.findOne({
        where: { id: deleteFileDto.exam_submission_id },
        relations: ['user']
      });
      
      if (!submission) {
        throw new NotFoundException('Exam submission not found');
      }

      if (submission.user.id !== user.user_id) {
        throw new UnauthorizedException('You do not have permission to delete files in this exam submission');
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

  async getExamSubmission(submissionId: string, user: JwtPayload): Promise<any> {
    try {
      const submission = await this.examSubmissionRepo.findOne({
        where: { id: submissionId },
        relations: ['exam', 'exam.classroom', 'user'],
        select: {
          id: true,
          status: true,
          answers: true,
          markings: true,
          created_at: true,
          updated_at: true,
          user: {
            id: true
          },
          exam: {
            id: true,
            classroom: {
              id: true
            }
          }
        }
      });

      if (!submission) {
        return null;
      }

      // Check if user has access to view this submission
      const access = await this.classroomAccessRepo.findOne({
        where: {
          classroom: { id: submission.exam.classroom.id },
          user: { id: user.user_id },
        status: 'accepted'
        }
      });

      if (!access) {
        throw new UnauthorizedException('You do not have permission to view this submission');
      }

      // If user is a student, they can only view their own submissions
      if (access.role === 'student' && submission.user.id !== user.user_id) {
        throw new UnauthorizedException('You can only view your own submissions');
      }

      return submission;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not get exam submission');
    }
  }

  async createExamSubmission(createExamSubmissionDto: CreateExamSubmissionDto, user: JwtPayload): Promise<ExamSubmission> {
    try {
      const exam = await this.examRepo.findOne({
        where: { id: createExamSubmissionDto.exam_id },
        relations: ['classroom']
      });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

      // Check if user is a member of the classroom
      const access = await this.classroomAccessRepo.findOne({
        where: {
          classroom: { id: exam.classroom.id },
          user: { id: user.user_id },
          status: 'accepted',
          role: 'student'
        }
    });

    if (!access) {
        throw new UnauthorizedException('You do not have permission to submit to this exam');
    }

      // Check if user already has a submission
      const existingSubmission = await this.examSubmissionRepo.findOne({
        where: {
          exam: { id: createExamSubmissionDto.exam_id },
          user: { id: user.user_id }
        }
    });

    if (existingSubmission) {
        throw new BadRequestException('You have already submitted to this exam');
    }

      const submission = new ExamSubmission();
      submission.status = createExamSubmissionDto.status;
      submission.exam = exam;
      submission.user = { id: user.user_id } as User;

      const savedSubmission = await this.examSubmissionRepo.save(submission);

      // publish event
      await this.pubSubService.publish('exam.updated', {
        eid: createExamSubmissionDto.exam_id,
        cid: exam.classroom.id
    });

      return savedSubmission;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not create exam submission');
    }
  }

  async updateExamSubmission(updateExamSubmissionDto: UpdateExamSubmissionDto, user: JwtPayload): Promise<ExamSubmission> {
    try {
      const submission = await this.examSubmissionRepo.findOne({
        where: { id: updateExamSubmissionDto.id },
        relations: ['user', 'exam', 'exam.classroom']
      });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

      // Check if user owns this submission
      if (submission.user.id !== user.user_id) {
        throw new UnauthorizedException('You do not have permission to update this submission');
      }

      submission.answers = updateExamSubmissionDto.answers;
      submission.status = updateExamSubmissionDto.status;

      const updatedSubmission = await this.examSubmissionRepo.save(submission);

    // publish event
      await this.pubSubService.publish('exam.updated', {
        eid: submission.exam.id,
        cid: submission.exam.classroom.id
      });

    return updatedSubmission;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not update exam submission');
    }
  }

  async updateExamSubmissionMarkings(updateMarkingsDto: UpdateExamSubmissionMarkingsDto, user: JwtPayload): Promise<any> {
    try {
      const submission = await this.examSubmissionRepo.findOne({
        where: { id: updateMarkingsDto.id },
        relations: ['exam', 'exam.classroom', 'user']
      });

      if (!submission) {
        throw new NotFoundException('Submission not found');
      }

      // Get Current User Details
      const currentUser = await this.userRepo.findOne({ where: { id: user.user_id } });
      if (!currentUser) {
        throw new NotFoundException('User not found');
      }

      // Check if user has permission to mark submissions
      const access = await this.classroomAccessRepo.findOne({
        where: {
          classroom: { id: submission.exam.classroom.id },
          user: { id: user.user_id },
          status: 'accepted',
          role: In(['owner', 'teacher'])
        }
      });

      if (!access) {
        throw new UnauthorizedException('You do not have permission to mark submissions');
      }

      submission.markings = updateMarkingsDto.markings;
      const updatedSubmission = await this.examSubmissionRepo.save(submission);

      // Create notification
      await this.notificationRepo.save({
        user_id: submission.user.id,
        image: currentUser.avatar.url,
        content: `${currentUser.name} marked your submission for ${submission.exam.title}`,
        link: `/classroom/${submission.exam.classroom.id}/exams/${submission.exam.id}/submissions/${submission.id}`,
        is_read: false
      });

      // Publish event
      await this.pubSubService.publish('notification.updated', {
        target_id: submission.user.id.toString(),
      })

      // publish event
        await this.pubSubService.publish('exam.updated', {
          eid: submission.exam.id,
          cid: submission.exam.classroom.id
        });

      return {
        status: 'success',
          message: 'Markings updated successfully',
        data: updatedSubmission
    };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not update markings');
    }
  }

  async listExams(classId: string, user: JwtPayload) {
    try {
      const access = await this.classroomAccessRepo.findOne({
        where: {
          classroom: { id: classId },
          user: { id: user.user_id },
          status: 'accepted'
        }
      });

      if (!access) {
        throw new UnauthorizedException('You do not have permission to view exams in this classroom');
      }

      const exams = await this.examRepo.find({
        where: { classroom: { id: classId } },
        relations: ['owner'],
        order: { created_at: 'DESC' }
      });

      return {
        status: 'success',
        message: 'Exams retrieved successfully',
        data: exams.map(exam => ({
          id: exam.id,
          title: exam.title,
          content: exam.content,
          status: exam.status,
          duration: exam.duration,
          start_once: exam.start_once,
          audience: exam.audience,
          questions: exam.questions,
          owner: {
            id: exam.owner.id,
            name: exam.owner.name,
            email: exam.owner.email,
            avatar: exam.owner.avatar
          },
          created_at: exam.created_at,
          updated_at: exam.updated_at
        }))
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not list exams');
    }
  }

  async getExam(id: string, user: JwtPayload): Promise<any> {
    try {
      const exam = await this.examRepo.findOne({
        where: { id },
        relations: ['classroom', 'owner', 'submissions', 'submissions.user']
      });
      
      if (!exam) {
        throw new NotFoundException('Exam not found');
      }

      // Check if user has access to the classroom
      const access = await this.classroomAccessRepo.findOne({
        where: {
          classroom: { id: exam.classroom.id },
          user: { id: user.user_id },
          status: 'accepted'
        }
      });

      if (!access) {
        throw new UnauthorizedException('You do not have permission to view this exam');
      }

      return {
        status: 'success',
        message: 'Exam retrieved successfully',
        data: {
          id: exam.id,
          title: exam.title,
          content: exam.content,
          status: exam.status,
          duration: exam.duration,
          start_once: exam.start_once,
          audience: exam.audience,
          questions: exam.questions,
          owner: {
            id: exam.owner.id,
            name: exam.owner.name,
            email: exam.owner.email,
            avatar: exam.owner.avatar
          },
          submissions: exam.submissions.map(submission => ({
            id: submission.id,
            status: submission.status,
            answers: submission.answers,
            markings: submission.markings,
            created_at: submission.created_at,
            updated_at: submission.updated_at,
            user: {
              id: submission.user.id,
              name: submission.user.name,
              email: submission.user.email,
              avatar: submission.user.avatar
            }
          })),
          created_at: exam.created_at,
          updated_at: exam.updated_at
        }
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not get exam');
    }
  }

  async listExamSubmissions(examId: string, user: JwtPayload): Promise<{ status: string; message: string; data: any[] }> {
    try {
      const exam = await this.examRepo.findOne({
        where: { id: examId },
        relations: ['classroom']
      });

      if (!exam) {
        throw new NotFoundException('Exam not found');
      }

      // Check if user has access to view submissions
      const access = await this.classroomAccessRepo.findOne({
        where: {
          classroom: { id: exam.classroom.id },
          user: { id: user.user_id },
        status: 'accepted',
          role: In(['owner', 'teacher'])
        }
      });

      if (!access) {
        throw new UnauthorizedException('You do not have permission to view submissions');
      }

      const submissions = await this.examSubmissionRepo.find({
        where: { exam: { id: examId } },
        relations: ['user'],
        order: { created_at: 'DESC' }
      });

      return {
        status: 'success',
        message: 'Submissions retrieved successfully',
        data: submissions.map(submission => ({
          id: submission.id,
          status: submission.status,
          answers: submission.answers,
          markings: submission.markings,
          created_at: submission.created_at,
          updated_at: submission.updated_at,
          user: {
            id: submission.user.id,
            name: submission.user.name,
            email: submission.user.email,
            avatar: submission.user.avatar
          }
        }))
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not list submissions');
    }
  }

  async getMySubmissions(examId: string, userId: string, user: JwtPayload): Promise<{ status: string; message: string; data: any[] }> {
    try {
      const exam = await this.examRepo.findOne({
        where: { id: examId },
        relations: ['classroom']
      });

      if (!exam) {
        throw new NotFoundException('Exam not found');
      }

      // Check if user has access to view submissions
      const access = await this.classroomAccessRepo.findOne({
        where: {
          classroom: { id: exam.classroom.id },
          user: { id: user.user_id },
        status: 'accepted'
        }
      });

      if (!access) {
        throw new UnauthorizedException('You do not have permission to view submissions');
      }

      // If user is a student, they can only view their own submissions
      if (access.role === 'student' && userId !== user.user_id) {
        throw new UnauthorizedException('You can only view your own submissions');
      }

      const submissions = await this.examSubmissionRepo.find({
        where: {
          exam: { id: examId },
          user: { id: userId }
        },
        relations: ['user'],
        order: { created_at: 'DESC' }
      });

      return {
        status: 'success',
        message: 'Submissions retrieved successfully',
        data: submissions.map(submission => ({
          id: submission.id,
          status: submission.status,
          answers: submission.answers,
          markings: submission.markings,
          created_at: submission.created_at,
          updated_at: submission.updated_at,
          user: {
            id: submission.user.id,
            name: submission.user.name,
            email: submission.user.email,
            avatar: submission.user.avatar
          }
        }))
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not get submissions');
    }
  }

  async listExamGrades(classId: string, user: JwtPayload): Promise<{ status: string; message: string; data: ExamGradeDto[] }> {
    try {
      const access = await this.classroomAccessRepo.findOne({
        where: {
          classroom: { id: classId },
          user: { id: user.user_id },
        status: 'accepted'
        }
      });
      
      if (!access) {
        throw new UnauthorizedException('You do not have permission to view grades');
      }

      const exams = await this.examRepo.find({
        where: { classroom: { id: classId } },
        relations: ['submissions', 'submissions.user'],
        order: { created_at: 'DESC' }
      });

      const grades: ExamGradeDto[] = exams.map(exam => {
        const submission = exam.submissions.find(s => s.user.id === user.user_id);
        return {
          id: exam.id,
          exam: {
            id: exam.id,
            title: exam.title,
            status: exam.status,
            duration: exam.duration,
            questions: exam.questions,
            created_at: exam.created_at,
            start_once: !!exam.start_once
          },
          status: submission?.status || 'pending',
          user_id: user.user_id,
          exam_id: exam.id,
          markings: submission?.markings || [],
          created_at: submission?.created_at || exam.created_at,
          updated_at: submission?.updated_at || exam.updated_at
        };
      });

      return {
        status: 'success',
        message: 'Grades retrieved successfully',
        data: grades
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not list grades');
    }
  }
} 