import type { Meta, StoryObj } from "@storybook/react";

import { Skeleton } from "./Skeleton";

const meta: Meta<typeof Skeleton> = {
  title: "Components/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Line: Story = { args: { width: 240, height: 16 } };
export const Avatar: Story = { args: { width: 56, height: 56, circle: true } };
export const Card: Story = { args: { width: 320, height: 420 } };
