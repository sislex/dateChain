import { UserRole } from "@datechain/types";
import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { authReducer, type AuthState } from "../store/authSlice";

import { ProtectedRoute } from "./ProtectedRoute";

function renderAt(auth: AuthState) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/app"]}>
        <Routes>
          <Route path="/welcome" element={<div>welcome screen</div>} />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <div>secret deck</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe("ProtectedRoute", () => {
  it("redirects unauthenticated users to /welcome", () => {
    renderAt({ accessToken: null, refreshToken: null, user: null });
    expect(screen.getByText("welcome screen")).toBeInTheDocument();
  });

  it("renders children when authenticated", () => {
    renderAt({
      accessToken: "a",
      refreshToken: "r",
      user: { id: "u1", role: UserRole.User },
    });
    expect(screen.getByText("secret deck")).toBeInTheDocument();
  });
});
