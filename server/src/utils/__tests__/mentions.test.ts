import { describe, it, expect } from "vitest";
import { parseMentions, MentionMember } from "../mentions";

const members: MentionMember[] = [
  { id: "u1", name: "Jo Bloggs", email: "jo@acme.com" },
  { id: "u2", name: "Ada Lovelace", email: "ada@acme.com" },
  { id: "u3", name: "Bob", email: "bob@acme.com" },
];

describe("parseMentions", () => {
  it("returns nothing when there are no mentions", () => {
    expect(parseMentions("just a plain comment", members)).toEqual([]);
  });

  it("matches a mention by email", () => {
    expect(parseMentions("hey @ada@acme.com look", members)).toEqual(["u2"]);
  });

  it("matches a mention by whitespace-stripped name, case-insensitively", () => {
    expect(parseMentions("ping @jobloggs pls", members)).toEqual(["u1"]);
  });

  it("matches multiple distinct members once each", () => {
    const out = parseMentions("@Bob and @ada@acme.com and @Bob again", members);
    expect(out.sort()).toEqual(["u2", "u3"]);
  });

  it("ignores mentions that match no member", () => {
    expect(parseMentions("@nobody here", members)).toEqual([]);
  });
});
