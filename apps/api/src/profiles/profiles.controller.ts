import { createReadStream, existsSync } from "node:fs";

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";

import { CurrentUser, type AuthenticatedUser } from "../auth/decorators";

import { ReorderPhotosDto, UpsertProfileDto } from "./dto";
import { MediaAccessService } from "./media-access.service";
import { MediaService, type MediaVariant } from "./media.service";
import { PhotosService } from "./photos.service";
import { ProfilesService } from "./profiles.service";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = /^image\/(jpeg|png|webp|heic|heif)$/;

@ApiTags("profile")
@ApiBearerAuth("access-token")
@Controller("profile")
export class ProfilesController {
  constructor(
    private readonly profiles: ProfilesService,
    private readonly photos: PhotosService,
  ) {}

  @Get("me")
  async getMine(@CurrentUser() user: AuthenticatedUser) {
    const view = await this.profiles.getView(user.userId);
    if (!view) throw new NotFoundException("Profile not created yet");
    return view;
  }

  @Put("me")
  upsert(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertProfileDto) {
    return this.profiles.upsert(user.userId, dto);
  }

  @Get("me/photos")
  listPhotos(@CurrentUser() user: AuthenticatedUser) {
    return this.photos.list(user.userId);
  }

  @Post("me/photos")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: MAX_UPLOAD_BYTES },
      fileFilter: (_req, file, cb) => cb(null, ALLOWED_MIME.test(file.mimetype)),
    }),
  )
  uploadPhoto(@CurrentUser() user: AuthenticatedUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException("A valid image file is required");
    return this.photos.upload(user.userId, file.buffer);
  }

  @Patch("me/photos/reorder")
  reorder(@CurrentUser() user: AuthenticatedUser, @Body() dto: ReorderPhotosDto) {
    return this.photos.reorder(user.userId, dto.order);
  }

  @Delete("me/photos/:id")
  async deletePhoto(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    await this.photos.remove(user.userId, id);
    return { deleted: true };
  }
}

@ApiTags("media")
@ApiBearerAuth("access-token")
@Controller("media")
export class MediaController {
  constructor(
    private readonly photos: PhotosService,
    private readonly media: MediaService,
    private readonly access: MediaAccessService,
  ) {}

  @Get("photo/:id")
  full(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.stream(user, id, "full");
  }

  @Get("photo/:id/thumb")
  thumb(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.stream(user, id, "thumb");
  }

  private async stream(
    user: AuthenticatedUser,
    id: string,
    variant: MediaVariant,
  ): Promise<StreamableFile> {
    // Owner or a permitted viewer (discoverable owner, no block) — else 403.
    const photo = await this.photos.findById(id);
    await this.access.assertCanView(user.userId, photo);
    const path = this.media.filePath(photo.storageKey, variant);
    if (!existsSync(path)) throw new NotFoundException("File missing");
    return new StreamableFile(createReadStream(path), { type: "image/jpeg" });
  }
}
