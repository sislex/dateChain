import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";

import { IconButton } from "./IconButton";

const meta: Meta<typeof IconButton> = {
  title: "Components/IconButton",
  component: IconButton,
  tags: ["autodocs"],
  args: { label: "Like", icon: "♥", accent: "like", onClick: fn() },
};

export default meta;
type Story = StoryObj<typeof IconButton>;

export const Like: Story = { args: { accent: "like", icon: "♥", label: "Like" } };
export const Nope: Story = { args: { accent: "nope", icon: "✕", label: "Nope" } };
export const SuperLike: Story = { args: { accent: "superlike", icon: "★", label: "Super Like" } };
export const Rewind: Story = { args: { accent: "rewind", icon: "↺", label: "Rewind", size: "sm" } };
export const Boost: Story = { args: { accent: "boost", icon: "⚡", label: "Boost", size: "sm" } };

export const HasAccessibleName: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const btn = canvas.getByRole("button", { name: /like/i });
    await expect(btn).toBeInTheDocument();
    await userEvent.click(btn);
    await expect(args.onClick).toHaveBeenCalled();
  },
};
