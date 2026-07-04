import { describe, it, expect } from "vitest";
import {
  inviteTemplate,
  passwordResetTemplate,
  verificationTemplate,
} from "../emailTemplates";

describe("email templates", () => {
  it("invite template embeds the invite URL and names", () => {
    const t = inviteTemplate({
      inviterName: "Ada",
      tenantName: "Acme",
      inviteUrl: "https://app/invite/tok123",
    });
    expect(t.subject).toContain("Acme");
    expect(t.html).toContain("https://app/invite/tok123");
    expect(t.text).toContain("https://app/invite/tok123");
  });

  it("escapes HTML in user-provided names to prevent injection", () => {
    const t = inviteTemplate({
      inviterName: "<script>alert(1)</script>",
      tenantName: "Acme",
      inviteUrl: "https://app/invite/x",
    });
    expect(t.html).not.toContain("<script>alert(1)</script>");
    expect(t.html).toContain("&lt;script&gt;");
  });

  it("reset & verification templates carry their action links", () => {
    expect(passwordResetTemplate({ resetUrl: "https://app/reset?t=1" }).html).toContain(
      "https://app/reset?t=1"
    );
    expect(
      verificationTemplate({ verifyUrl: "https://app/verify?t=2" }).html
    ).toContain("https://app/verify?t=2");
  });
});
