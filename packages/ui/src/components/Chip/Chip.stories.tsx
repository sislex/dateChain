import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";

import { Chip } from "./Chip";

const meta: Meta<typeof Chip> = {
  title: "Components/Chip",
  component: Chip,
  tags: ["autodocs"],
  args: { children: "Путешествия", onToggle: fn() },
};

export default meta;
type Story = StoryObj<typeof Chip>;

export const Default: Story = {};
export const Selected: Story = { args: { selected: true } };
export const Static: Story = { args: { interactive: false } };

export const TogglesAriaPressed: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const chip = canvas.getByRole("button", { name: "Путешествия" });
    await expect(chip).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(chip);
    await expect(args.onToggle).toHaveBeenCalledWith(true);
  },
};
