import type { Meta, StoryObj } from "@storybook/react";

import { Badge } from "./Badge";

const meta: Meta<typeof Badge> = {
  title: "Components/Badge",
  component: Badge,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Count: Story = { args: { children: 3 } };
export const Dot: Story = { args: { dot: true } };
export const Neutral: Story = { args: { children: 12, variant: "neutral" } };
