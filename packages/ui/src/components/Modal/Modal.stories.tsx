import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useState } from "react";

import { Button } from "../Button/Button";

import { Modal } from "./Modal";

const meta: Meta<typeof Modal> = {
  title: "Components/Modal",
  component: Modal,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Modal>;

function Demo({ variant }: { variant?: "center" | "sheet" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Открыть</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Удалить аккаунт?" variant={variant}>
        <p>Это действие необратимо.</p>
        <Button variant="danger" onClick={() => setOpen(false)}>
          Удалить
        </Button>
      </Modal>
    </>
  );
}

export const Center: Story = { render: () => <Demo /> };
export const Sheet: Story = { render: () => <Demo variant="sheet" /> };

export const OpensAndCloses: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Открыть" }));
    const dialog = await within(document.body).findByRole("dialog");
    await expect(dialog).toBeInTheDocument();
    await userEvent.click(within(document.body).getByRole("button", { name: "Закрыть" }));
    await expect(within(document.body).queryByRole("dialog")).not.toBeInTheDocument();
  },
};
