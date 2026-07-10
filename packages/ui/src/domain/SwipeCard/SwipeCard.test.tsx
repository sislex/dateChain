import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";

import { SwipeCard, resolveSwipeFromOffset } from "./SwipeCard";
import type { SwipeCardHandle, SwipeCardProfile } from "./SwipeCard";

const THRESHOLD = 120;

describe("resolveSwipeFromOffset", () => {
  it("returns 'like' when dragged right past the threshold", () => {
    expect(resolveSwipeFromOffset({ x: 200, y: 0 }, THRESHOLD)).toBe("like");
  });

  it("returns 'nope' when dragged left past the threshold", () => {
    expect(resolveSwipeFromOffset({ x: -200, y: 0 }, THRESHOLD)).toBe("nope");
  });

  it("returns 'superlike' when dragged up past the threshold", () => {
    expect(resolveSwipeFromOffset({ x: 0, y: -200 }, THRESHOLD)).toBe("superlike");
  });

  it("prefers a horizontal swipe over super-like when both axes exceed the threshold", () => {
    expect(resolveSwipeFromOffset({ x: 200, y: -200 }, THRESHOLD)).toBe("like");
  });

  it("returns null when the drag is below the threshold", () => {
    expect(resolveSwipeFromOffset({ x: 40, y: -30 }, THRESHOLD)).toBeNull();
  });
});

describe("SwipeCard imperative handle", () => {
  const profile: SwipeCardProfile = {
    id: "u1",
    name: "Alex",
    age: 27,
    photos: ["/photo.jpg"],
  };

  it("invokes onSwipe with the direction and profile id", () => {
    const onSwipe = jest.fn();
    const ref = createRef<SwipeCardHandle>();
    render(<SwipeCard ref={ref} profile={profile} onSwipe={onSwipe} />);

    act(() => ref.current?.swipe("like"));
    expect(onSwipe).toHaveBeenCalledWith("like", "u1");
  });

  it("renders the profile name and age", () => {
    render(<SwipeCard profile={profile} onSwipe={jest.fn()} />);
    expect(screen.getByText("Alex")).toBeInTheDocument();
    expect(screen.getByText("27")).toBeInTheDocument();
  });
});
