import { UserRole } from "@datechain/types";
import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { authReducer, type AuthState } from "../store/authSlice";

import { RoleGuard } from "./RoleGuard";

function renderGuard(auth: AuthState, min?: UserRole) {
  const store = configureStore({ reducer: { auth: authReducer }, preloadedState: { auth } });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/admin/audit"]}>
        <Routes>
          <Route path="/login" element={<div>login</div>} />
          <Route path="/admin" element={<div>dashboard</div>} />
          <Route
            path="/admin/audit"
            element={
              <RoleGuard min={min}>
                <div>audit page</div>
              </RoleGuard>
            }
          />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe("RoleGuard", () => {
  it("redirects a non-staff visitor to /login", () => {
    renderGuard({ accessToken: null, refreshToken: null, user: null });
    expect(screen.getByText("login")).toBeInTheDocument();
  });

  it("redirects a staff member without the required rank to the dashboard", () => {
    renderGuard(
      { accessToken: "a", refreshToken: "r", user: { id: "u", role: UserRole.Moderator } },
      UserRole.Admin,
    );
    expect(screen.getByText("dashboard")).toBeInTheDocument();
  });

  it("renders the page when the rank is sufficient", () => {
    renderGuard(
      { accessToken: "a", refreshToken: "r", user: { id: "u", role: UserRole.Admin } },
      UserRole.Admin,
    );
    expect(screen.getByText("audit page")).toBeInTheDocument();
  });
});
