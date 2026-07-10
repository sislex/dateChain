import type { Meta, StoryObj } from "@storybook/react";

import { Avatar } from "./Avatar";

const meta: Meta<typeof Avatar> = {
  title: "Components/Avatar",
  component: Avatar,
  tags: ["autodocs"],
  args: { name: "Alex Rivera" },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const InitialsFallback: Story = {};
export const WithRing: Story = { args: { ring: true, size: "lg" } };
export const WithImage: Story = {
  args: { src: "https://picsum.photos/seed/dc/120", size: "lg" },
};
