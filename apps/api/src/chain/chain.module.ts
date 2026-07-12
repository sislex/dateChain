import { Global, Module } from "@nestjs/common";

import { ChainService } from "./chain.service";

/** Global so wallet/dates modules can inject ChainService without re-importing. */
@Global()
@Module({
  providers: [ChainService],
  exports: [ChainService],
})
export class ChainModule {}
