import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";

import { PhotoPager } from "./PhotoPager";

const meta: Meta<typeof PhotoPager> = {
  title: "Domain/PhotoPager",
  component: PhotoPager,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: 320, height: 420 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    alt: "Alex",
    photos: [
      "https://picsum.photos/seed/a/320/420",
      "https://picsum.photos/seed/b/320/420",
      "https://picsum.photos/seed/c/320/420",
    ],
  },
};

export default meta;
type Story = StoryObj<typeof PhotoPager>;

export const Default: Story = {};

export const NextPhoto: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("img")).toHaveAttribute("alt", "Alex — фото 1");
    await userEvent.click(canvas.getByRole("button", { name: "Следующее фото" }));
    await expect(canvas.getByRole("img")).toHaveAttribute("alt", "Alex — фото 2");
  },
};
