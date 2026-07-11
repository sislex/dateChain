import { ForbiddenException } from "@nestjs/common";

import { MediaAccessService } from "./media-access.service";
import type { Photo } from "./photo.entity";

const photo = { id: "ph1", userId: "owner" } as Photo;

function setup(opts: {
  viewerProfile?: object | null;
  ownerProfile?: object | null;
  block?: object | null;
}) {
  const profiles = {
    findOne: jest
      .fn()
      .mockResolvedValueOnce(opts.viewerProfile ?? null)
      .mockResolvedValueOnce(opts.ownerProfile ?? null),
  };
  const blocks = { findOne: jest.fn().mockResolvedValue(opts.block ?? null) };
  return new MediaAccessService(profiles as never, blocks as never);
}

describe("MediaAccessService", () => {
  it("always allows the owner", async () => {
    const service = setup({});
    await expect(service.assertCanView("owner", photo)).resolves.toBeUndefined();
  });

  it("allows a viewer with a profile when the owner is discoverable and unblocked", async () => {
    const service = setup({
      viewerProfile: { userId: "viewer" },
      ownerProfile: { discoverable: true },
      block: null,
    });
    await expect(service.assertCanView("viewer", photo)).resolves.toBeUndefined();
  });

  it("denies a viewer without a profile", async () => {
    const service = setup({ viewerProfile: null, ownerProfile: { discoverable: true } });
    await expect(service.assertCanView("stranger", photo)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("denies when the owner is not discoverable", async () => {
    const service = setup({
      viewerProfile: { userId: "v" },
      ownerProfile: { discoverable: false },
    });
    await expect(service.assertCanView("v", photo)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("denies when a block exists between the users", async () => {
    const service = setup({
      viewerProfile: { userId: "v" },
      ownerProfile: { discoverable: true },
      block: { id: "b1" },
    });
    await expect(service.assertCanView("v", photo)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
