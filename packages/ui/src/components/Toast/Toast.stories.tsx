import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";

import { Button } from "../Button/Button";

import { ToastProvider, useToast } from "./Toast";

const meta: Meta = {
  title: "Components/Toast",
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

function Trigger() {
  const { show } = useToast();
  return (
    <>
      <Button onClick={() => show("Новый мэтч!", "success")}>Показать тост</Button>
    </>
  );
}

export const Default: Story = {
  render: () => (
    <ToastProvider duration={100000}>
      <Trigger />
    </ToastProvider>
  ),
};

export const ShowsOnAction: Story = {
  render: () => (
    <ToastProvider duration={100000}>
      <Trigger />
    </ToastProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Показать тост" }));
    await expect(await canvas.findByRole("status")).toHaveTextContent("Новый мэтч!");
  },
};
