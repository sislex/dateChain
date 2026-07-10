import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";

import { Input } from "./Input";

const meta: Meta<typeof Input> = {
  title: "Components/Input",
  component: Input,
  tags: ["autodocs"],
  args: { label: "Имя", placeholder: "Введите имя" },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {};
export const WithError: Story = {
  args: { error: "Обязательное поле", value: "" },
};
export const Disabled: Story = { args: { disabled: true, value: "Alex" } };

export const TypingUpdatesValue: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText("Имя");
    await userEvent.type(input, "Sam");
    await expect(input).toHaveValue("Sam");
  },
};

export const ErrorIsAnnounced: Story = {
  args: { error: "Обязательное поле" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toHaveTextContent("Обязательное поле");
    await expect(canvas.getByLabelText("Имя")).toHaveAttribute("aria-invalid", "true");
  },
};
