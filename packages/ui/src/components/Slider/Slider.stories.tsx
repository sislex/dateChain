import type { Meta, StoryObj } from "@storybook/react";

import { Slider } from "./Slider";

const meta: Meta<typeof Slider> = {
  title: "Components/Slider",
  component: Slider,
  tags: ["autodocs"],
  args: { label: "Расстояние", min: 1, max: 160, defaultValue: 40 },
};

export default meta;
type Story = StoryObj<typeof Slider>;

export const Distance: Story = {
  args: { formatValue: (v) => `${v} км` },
};

export const Age: Story = {
  args: { label: "Максимальный возраст", min: 18, max: 100, defaultValue: 32 },
};
