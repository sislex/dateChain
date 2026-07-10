import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";

import { colors, gradients } from "../tokens/tokens";

/**
 * Foundations story: renders the design-token palette so Storybook has a
 * verifiable "tokens loaded" surface. Doubles as a smoke test for the
 * test-runner via the play function below.
 */
function Palette() {
  const swatches: Array<{ name: string; value: string }> = [
    { name: "flame", value: gradients.flame },
    { name: "like", value: colors.like },
    { name: "nope", value: colors.nope },
    { name: "superlike", value: colors.superlike },
    { name: "boost", value: colors.boost },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: "var(--dc-space-4)",
        padding: "var(--dc-space-6)",
        fontFamily: "var(--dc-font-family)",
        color: "var(--dc-color-text)",
      }}
    >
      {swatches.map((s) => (
        <div key={s.name} data-testid={`swatch-${s.name}`}>
          <div
            style={{
              height: 88,
              borderRadius: "var(--dc-radius-md)",
              background: s.value,
              boxShadow: "var(--dc-shadow-card)",
            }}
          />
          <div
            style={{
              marginTop: "var(--dc-space-2)",
              fontSize: "var(--dc-font-size-sm)",
              fontWeight: "var(--dc-font-weight-semibold)" as unknown as number,
            }}
          >
            {s.name}
          </div>
          <div
            style={{
              fontSize: "var(--dc-font-size-xs)",
              color: "var(--dc-color-text-secondary)",
            }}
          >
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}

const meta: Meta<typeof Palette> = {
  title: "Foundations/Tokens",
  component: Palette,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Palette>;

export const Colors: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verifies tokens rendered and the story is interactive under the test-runner.
    await expect(canvas.getByTestId("swatch-flame")).toBeInTheDocument();
    await expect(canvas.getByText("like")).toBeInTheDocument();
  },
};
