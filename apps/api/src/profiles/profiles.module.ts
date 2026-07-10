import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { MediaService } from "./media.service";
import { Photo } from "./photo.entity";
import { PhotosService } from "./photos.service";
import { Profile } from "./profile.entity";
import { MediaController, ProfilesController } from "./profiles.controller";
import { ProfilesService } from "./profiles.service";

@Module({
  imports: [TypeOrmModule.forFeature([Profile, Photo])],
  controllers: [ProfilesController, MediaController],
  providers: [ProfilesService, PhotosService, MediaService],
  exports: [ProfilesService, PhotosService],
})
export class ProfilesModule {}
