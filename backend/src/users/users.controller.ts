import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { UsersService, CreateUserDto, UpdateUserDto, UpdateProfileDto } from './users.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // ── Self-management endpoints (any authenticated user) ──────────
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Request() req: any) {
    return this.usersService.findOne(req.user.id);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  // ── Theme preference (per-user, stored in DB) ───────────────────
  @Get('me/theme')
  @UseGuards(JwtAuthGuard)
  async getTheme(@Request() req: any) {
    const theme = await this.usersService.getTheme(req.user.id);
    return { theme };
  }

  @Put('me/theme')
  @UseGuards(JwtAuthGuard)
  setTheme(@Request() req: any, @Body() body: { theme: string }) {
    return this.usersService.setTheme(req.user.id, body.theme);
  }

  // ── Admin-only endpoints ────────────────────────────────────────
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAll() { return this.usersService.findAll(); }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findOne(@Param('id') id: string) { return this.usersService.findOne(id); }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateUserDto) { return this.usersService.create(dto); }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) { return this.usersService.update(id, dto); }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) { return this.usersService.remove(id); }
}
