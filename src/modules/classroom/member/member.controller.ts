import { Controller, Post, Put, Get, Body, Param, UseGuards } from '@nestjs/common';
import { MemberService } from './member.service';
import { UserGuard } from '../../../shared/guards/user.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/user.decorator';
import { InviteMemberDto, InviteMemberResponse } from './dto/invite-member.dto';
import { RemoveMemberDto, RemoveMemberResponse } from './dto/remove-member.dto';
import { ChangeRoleDto, ChangeRoleResponse } from './dto/change-role.dto';
import { CreateVirtualStudentDto, CreateVirtualStudentResponse } from './dto/create-virtual-student.dto';
import { UpdateVirtualStudentDto, UpdateVirtualStudentResponse } from './dto/update-virtual-student.dto';
import { ConnectParentDto, ConnectParentResponse } from './dto/connect-parent.dto';
import { RegenerateCodeDto, RegenerateCodeResponse } from './dto/regenerate-code.dto';
import { InviteParentToStudentDto, InviteParentToStudentResponse } from './dto/invite-parent-to-student.dto';

@Controller('v1/classroom/member')
@UseGuards(UserGuard)
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Post('invite')
  async inviteMember(
    @Body() inviteMemberDto: InviteMemberDto,
    @CurrentUser() user: JwtPayload
  ): Promise<InviteMemberResponse> {
    return this.memberService.inviteMember(inviteMemberDto, user);
  }

  @Post('remove')
  async removeMember(
    @Body() removeMemberDto: RemoveMemberDto,
    @CurrentUser() user: JwtPayload
  ): Promise<RemoveMemberResponse> {
    return this.memberService.removeMember(removeMemberDto, user);
  }

  @Post('change-role')
  async changeRole(
    @Body() changeRoleDto: ChangeRoleDto,
    @CurrentUser() user: JwtPayload
  ): Promise<ChangeRoleResponse> {
    return this.memberService.changeRole(changeRoleDto, user);
  }

  // ==================== VIRTUAL STUDENT ENDPOINTS ====================

  @Post('virtual-student/create')
  async createVirtualStudent(
    @Body() createVirtualStudentDto: CreateVirtualStudentDto,
    @CurrentUser() user: JwtPayload
  ): Promise<CreateVirtualStudentResponse> {
    return this.memberService.createVirtualStudent(createVirtualStudentDto, user);
  }

  @Put('virtual-student/update')
  async updateVirtualStudent(
    @Body() updateVirtualStudentDto: UpdateVirtualStudentDto,
    @CurrentUser() user: JwtPayload
  ): Promise<UpdateVirtualStudentResponse> {
    return this.memberService.updateVirtualStudent(updateVirtualStudentDto, user);
  }

  @Post('virtual-student/connect-parent')
  async connectParent(
    @Body() connectParentDto: ConnectParentDto,
    @CurrentUser() user: JwtPayload
  ): Promise<ConnectParentResponse> {
    return this.memberService.connectParent(connectParentDto, user);
  }

  @Post('virtual-student/invite-parent')
  async inviteParentToVirtualStudent(
    @Body() inviteParentDto: InviteParentToStudentDto,
    @CurrentUser() user: JwtPayload
  ): Promise<InviteParentToStudentResponse> {
    return this.memberService.inviteParentToVirtualStudent(inviteParentDto, user);
  }

  @Post('virtual-student/remove-parent')
  async removeParentFromVirtualStudent(
    @Body() removeParentDto: { virtual_student_id: string },
    @CurrentUser() user: JwtPayload
  ): Promise<any> {
    return this.memberService.removeParentFromVirtualStudent(removeParentDto, user);
  }

  @Post('accept-invitation')
  async acceptInvitationFromEmail(
    @Body() acceptDto: { class_id: string, student_id?: string },
    @CurrentUser() user: JwtPayload
  ): Promise<any> {
    return this.memberService.acceptInvitationFromEmail(acceptDto, user);
  }

  @Post('virtual-student/regenerate-code')
  async regenerateCode(
    @Body() regenerateCodeDto: RegenerateCodeDto,
    @CurrentUser() user: JwtPayload
  ): Promise<RegenerateCodeResponse> {
    return this.memberService.regenerateCode(regenerateCodeDto, user);
  }

  @Get('virtual-student/classroom/:id')
  async getVirtualStudentsByClassroom(
    @Param('id') classroomId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<any> {
    return this.memberService.getVirtualStudentsByClassroom(classroomId, user);
  }

  @Get('virtual-student/parent/:id')
  async getVirtualStudentsByParent(
    @Param('id') parentId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<any> {
    return this.memberService.getVirtualStudentsByParent(parentId, user);
  }
} 