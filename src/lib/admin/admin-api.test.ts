import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFreshSession, isAdminUser, loadSession, signIn, signOut } from "./admin-api";

const json = (value: unknown) =>
  new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

describe("GOODSPOTLESS admin API", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("uses the user's JWT and does not grant admin access without a server-side role", async () => {
    const mockFetch = vi.fn().mockResolvedValue(json([]));
    vi.stubGlobal("fetch", mockFetch);
    const session = {
      access_token: "test-user-token",
      refresh_token: "refresh",
      expires_at: Date.now() + 3600000,
    };

    expect(await isAdminUser(session)).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/rest/v1/user_roles?");
    expect(options.headers.Authorization).toBe("Bearer test-user-token");
    expect(options.headers).not.toHaveProperty("service_role");
  });

  it("stores a password login session but never stores the password", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      json({
        access_token: "session-token",
        refresh_token: "rotate-me",
        expires_in: 3600,
      }),
    );
    vi.stubGlobal("fetch", mockFetch);

    const session = await signIn("owner@example.com", "unique-test-password");
    expect(session.access_token).toBe("session-token");
    expect(loadSession()?.access_token).toBe("session-token");
    expect(window.localStorage.getItem("goodspotless_admin_session_v1")).not.toContain(
      "unique-test-password",
    );
    expect(mockFetch.mock.calls[0][0]).toContain("grant_type=password");
  });

  it("rotates an expired refresh token only once for parallel requests", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      json({
        access_token: "new-token",
        refresh_token: "new-refresh",
        expires_in: 3600,
      }),
    );
    vi.stubGlobal("fetch", mockFetch);
    const expired = {
      access_token: "old",
      refresh_token: "old-refresh",
      expires_at: Date.now() - 1000,
    };

    const [a, b] = await Promise.all([getFreshSession(expired), getFreshSession(expired)]);
    expect(a.access_token).toBe("new-token");
    expect(b.refresh_token).toBe("new-refresh");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("removes local credentials on logout", async () => {
    const session = { access_token: "x", refresh_token: "y", expires_at: Date.now() + 3600000 };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await signOut(session);
    expect(loadSession()).toBeNull();
  });
});
