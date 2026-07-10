import type { Meta, StoryObj } from "@storybook/react";

import { Logo } from "./Logo";

const meta: Meta<typeof Logo> = {
  title: "Domain/Logo",
  component: Logo,
  tags: ["autodocs"],
  args: { size: 64 },
};

export default meta;
type Story = StoryObj<typeof Logo>;

export const Default: Story = {};
