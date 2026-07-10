import type { Meta, StoryObj } from "@storybook/react";

import { TextArea } from "./TextArea";

const meta: Meta<typeof TextArea> = {
  title: "Components/TextArea",
  component: TextArea,
  tags: ["autodocs"],
  args: { label: "О себе", placeholder: "Расскажите о себе…" },
};

export default meta;
type Story = StoryObj<typeof TextArea>;

export const Default: Story = {};
export const WithError: Story = { args: { error: "Слишком длинный текст" } };
