import type { Meta, StoryObj } from "@storybook/react";

import { Select } from "./Select";

const meta: Meta<typeof Select> = {
  title: "Components/Select",
  component: Select,
  tags: ["autodocs"],
  args: {
    label: "Пол",
    placeholder: "Выберите",
    options: [
      { value: "man", label: "Мужчина" },
      { value: "woman", label: "Женщина" },
      { value: "more", label: "Больше вариантов" },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {};
export const WithError: Story = { args: { error: "Выберите значение" } };
