import { Injectable, NotFoundException, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from '../../../common/decorators/user.decorator';
import { ClassroomPost } from './schemas/classroom-post.schema';
import { ClassroomPostComment } from './schemas/classroom-post-comment.schema';
import { Classroom } from '../core/schemas/classroom.schema';
import { ClassroomAccess } from '../core/schemas/classroom-access.schema';
import { User } from '../../auth/schemas/user.schema';
import { Notification } from '../member/schemas/notification.schema';
import { CreateClassroomPostDto } from './dto/create-classroom-post.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import * as DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { DeleteFileDto } from '../assignment/dto/delete-file.dto';
import { FileService } from '../../../shared/services/file.service';
import { PubSubService } from 'src/shared/services/pubsub.service';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(ClassroomPost)
    private classroomPostRepository: Repository<ClassroomPost>,
    @InjectRepository(ClassroomPostComment)
    private classroomPostCommentRepository: Repository<ClassroomPostComment>,
    @InjectRepository(Classroom)
    private classroomRepository: Repository<Classroom>,
    @InjectRepository(ClassroomAccess)
    private classroomAccessRepository: Repository<ClassroomAccess>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private fileService: FileService,
    private pubSubService: PubSubService
  ) {}

  async createPost(createPostDto: CreateClassroomPostDto, user: JwtPayload): Promise<{ status: string; message: string }> {
    try {
      const { classroom_id, content, files, audience, type, status, published_at } = createPostDto;

      // Validate content or files
      if (!content && (!files || files.length === 0)) {
        throw new BadRequestException('Content or files are required');
      }

      // Check if classroom exists
      const classroom = await this.classroomRepository.findOne({
        where: { id: classroom_id }
      });
      if (!classroom) {
        throw new NotFoundException('Classroom not found');
      }

      // Check if user is a member of the classroom
      const userAccess = await this.classroomAccessRepository.findOne({
        where: {
          classroom: { id: classroom_id },
          user: { id: user.user_id },
          status: 'accepted'
        }
      });

      if (!userAccess) {
        throw new BadRequestException('User not a member of the classroom');
      }

      // Check if child-only classroom and user is student
      if (classroom.child_only && userAccess.role === 'student') {
        throw new BadRequestException('Only teachers can post in this classroom');
      }

      // Get all classroom members
      const allMembers = await this.classroomAccessRepository.find({
        where: {
          classroom: { id: classroom_id },
          status: 'accepted'
        },
        relations: ['user']
      });

      const allMembersIds = allMembers.map(member => member.user.id);

      // Validate audience
      if (audience[0] !== '*') {
        const validAudience = audience.every((aud: string) => allMembersIds.includes(aud));
        if (!validAudience) {
          throw new BadRequestException('Invalid audience');
        }
      }

      // Sanitize content
      const window = new JSDOM('').window;
      const purify = DOMPurify(window);
      const cleanContent = purify.sanitize(content);

      // Create post
      const newPost = this.classroomPostRepository.create({
        classroom: { id: classroom_id },
        user: { id: user.user_id },
        audience,
        type,
        content: cleanContent,
        files,
        status,
        published_at: published_at ? new Date(published_at) : new Date()
      });

      await this.classroomPostRepository.save(newPost);

      await this.pubSubService.publish('post.updated', {
        cid: classroom_id,
      });

      return {
        status: 'success',
        message: 'Post created successfully'
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not create post');
    }
  }

  async deleteFile(deleteFileDto: DeleteFileDto, user: JwtPayload): Promise<{ status: string, message: string }> {
    try {
      // check if user is classroom owner or teacher
      const access = await this.classroomAccessRepository.findOne({
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

  async addComment(addCommentDto: AddCommentDto, user: JwtPayload): Promise<{ status: string; message: string }> {
    try {
      if (!addCommentDto.content) {
        throw new BadRequestException('Comment content is required');
      }

      // Check if classroom exists
      const classroom = await this.classroomRepository.findOne({
        where: { id: addCommentDto.class_id }
      });
      if (!classroom) {
        throw new NotFoundException('Classroom not found');
      }

      // Check if user is a member of the classroom
      const access = await this.classroomAccessRepository.findOne({
        where: {
          classroom: { id: addCommentDto.class_id },
          user: { id: user.user_id },
          status: 'accepted'
        }
      });

      if (!access) {
        throw new UnauthorizedException('You are not a member of this classroom');
      }

      // If child-only classroom, check if user is a student
      if (classroom.child_only && access.role === 'student') {
        throw new UnauthorizedException('Students cannot comment in this classroom');
      }

      // Check if post exists and get its details
      const post = await this.classroomPostRepository.findOne({
        where: {
          id: addCommentDto.post_id,
          classroom: { id: addCommentDto.class_id }
        },
        relations: ['user']
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      // Check post type
      if (post.type === 'announcement') {
        throw new BadRequestException('Cannot comment on announcements');
      }

      // Check audience permissions
      let canComment = false;
      if (post.audience[0] === '*' || access.role === 'teacher' || access.role === 'owner') {
        canComment = true;
      } else if (post.audience.includes(user.user_id)) {
        canComment = true;
      }

      if (!canComment) {
        throw new UnauthorizedException('You do not have permission to comment on this post');
      }

      // Create comment
      const newComment = this.classroomPostCommentRepository.create({
        classroom: { id: addCommentDto.class_id },
        post: { id: addCommentDto.post_id },
        user: { id: user.user_id },
        content: addCommentDto.content
      });

      await this.classroomPostCommentRepository.save(newComment);

      // Add notification for post author if different from commenter
      if (post.user.id !== user.user_id) {
        const userData = await this.userRepository.findOne({
          where: { id: user.user_id }
        });

        const notification = this.notificationRepository.create({
          user: { id: post.user.id },
          image: process.env.NOTIFICATION_COMMENT_CLASSROOM_IMAGE_URL,
          content: `${userData?.name} commented on your post in ${classroom.name}`,
          link: `/classroom/${addCommentDto.class_id}/#${addCommentDto.post_id}`,
          is_read: false
        });
        await this.notificationRepository.save(notification);
      }

      await this.pubSubService.publish('post.updated', {
        cid: addCommentDto.class_id,
        pid: addCommentDto.post_id,
      });

      return {
        status: 'success',
        message: 'Comment added successfully'
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not add comment');
    }
  }

  async deleteComment(commentId: string, user: JwtPayload): Promise<any> {
    try {
      const comment = await this.classroomPostCommentRepository.findOne({
        where: { id: commentId },
        relations: ['user', 'classroom', 'post']
      });

      if (!comment) {
        throw new NotFoundException('Comment not found');
      }

      // Check if user owns the comment or has teacher/owner role
      const access = await this.classroomAccessRepository.findOne({
        where: {
          classroom: { id: comment.classroom.id },
          user: { id: user.user_id },
          status: 'accepted'
        }
      });

      if (!access || (access.role === 'student' && comment.user.id !== user.user_id)) {
        throw new UnauthorizedException('You do not have permission to delete this comment');
      }

      await this.classroomPostCommentRepository.remove(comment);

      await this.pubSubService.publish('post.updated', {
        cid: comment.classroom.id,
        pid: comment.post.id,
      });

      return {
        status: 'success',
        message: 'Comment deleted successfully',
        data: {
          id: commentId
        }
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not delete comment');
    }
  }

  async deletePost(postId: string, user: JwtPayload): Promise<any> {
    try {
      const post = await this.classroomPostRepository.findOne({
        where: { id: postId },
        relations: ['user', 'classroom']
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      // Check if user has permission to delete
      const access = await this.classroomAccessRepository.findOne({
        where: {
          classroom: { id: post.classroom.id },
          user: { id: user.user_id },
          status: 'accepted'
        }
      });

      if (!access || (access.role === 'student' && post.user.id !== user.user_id)) {
        throw new UnauthorizedException('You do not have permission to delete this post');
      }

      // Delete associated comments first
      await this.classroomPostCommentRepository.delete({
        post: { id: postId }
      });

      // Delete post
      await this.classroomPostRepository.remove(post);

      await this.pubSubService.publish('post.updated', {
        cid: post.classroom.id,
        pid: postId,
      });

      return {
        status: 'success',
        message: 'Post deleted successfully',
        data: {
          id: postId
        }
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not delete post');
    }
  }

  async getClassroomPosts(cid: string, user: JwtPayload) {
    try {
      // Check if classroom exists
      const classroom = await this.classroomRepository.findOne({
        where: { id: cid }
      });
      if (!classroom) {
        throw new NotFoundException('Classroom not found');
      }

      // Check if user has access to the classroom
      const access = await this.classroomAccessRepository.findOne({
        where: {
          classroom: { id: cid },
          user: { id: user.user_id },
          status: 'accepted'
        }
      });

      if (!access) {
        throw new UnauthorizedException('You do not have access to this classroom');
      }

      // Get posts with relations
      const posts = await this.classroomPostRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.user', 'user')
        .leftJoinAndSelect('post.comments', 'comments')
        .leftJoinAndSelect('comments.user', 'commentUser')
        .where('post.classroom = :cid', { cid })
        .orderBy('post.created_at', 'DESC')
        .getMany();

      // Transform posts to match MongoDB output structure
      const transformedPosts = posts.map(post => {
        const latestComment = post.comments.length > 0 ? {
          id: post.comments[0].id,
          content: post.comments[0].content,
          created_at: post.comments[0].created_at,
          user: {
            id: post.comments[0].user.id,
            name: post.comments[0].user.name,
            avatar: post.comments[0].user.avatar,
            email: post.comments[0].user.email
          }
        } : null;

        return {
          id: post.id,
          type: post.type,
          files: post.files,
          status: post.status,
          content: post.content,
          audience: post.audience,
          created_at: post.created_at,
          user: {
            id: post.user.id,
            name: post.user.name,
            avatar: post.user.avatar
          },
          comments: latestComment ? [latestComment] : [],
          comments_count: post.comments.length
        };
      });

      return {
        status: 'success',
        message: 'Classroom posts retrieved successfully',
        data: transformedPosts
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not retrieve classroom posts');
    }
  }

  async getPostComments(pid: string, user: JwtPayload): Promise<{ status: string; message: string; data: any[] }> {
    try {
      const post = await this.classroomPostRepository.findOne({
        where: { id: pid },
        relations: ['classroom']
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      // Check if user has access to the classroom
      const access = await this.classroomAccessRepository.findOne({
        where: {
          classroom: { id: post.classroom.id },
          user: { id: user.user_id },
          status: 'accepted'
        }
      });

      if (!access) {
        throw new UnauthorizedException('You do not have access to this classroom');
      }

      const comments = await this.classroomPostCommentRepository
        .createQueryBuilder('comment')
        .leftJoinAndSelect('comment.user', 'user')
        .where('comment.post = :pid', { pid })
        .orderBy('comment.created_at', 'ASC')
        .getMany();

      // Transform comments to match MongoDB output structure
      const transformedComments = comments.map(comment => ({
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        user: {
          id: comment.user.id,
          name: comment.user.name,
          email: comment.user.email,
          avatar: comment.user.avatar
        }
      }));

      return {
        status: 'success',
        message: 'Post comments retrieved successfully',
        data: transformedComments
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not retrieve post comments');
    }
  }
} 