// The soft authenticator is TEST-ONLY plumbing: it mints real WebAuthn ceremony
// responses without a browser so later route tests can drive registration and
// login. The proof it works is that the REAL @simplewebauthn/server verifiers
// accept its output on the happy path and reject the three ways a ceremony can
// go wrong (wrong origin, wrong rpID, missing user verification). No Postgres,
// no network — pure crypto in and verdict out.

import { describe, it, expect } from "vitest";
import {
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { webcrypto } from "node:crypto";
import { createSoftAuthenticator } from "./webauthn-authenticator.js";

const RP_ID = "localhost";
const ORIGIN = "http://localhost:3000";

// A fresh server-side challenge is a random Base64URL string, exactly the shape
// generateRegistrationOptions() / generateAuthenticationOptions() would return.
function newChallenge(): string {
  return isoBase64URL.fromBuffer(webcrypto.getRandomValues(new Uint8Array(32)));
}

// A ceremony is "rejected" if the verifier either throws or returns
// verified:false. We accept both so the tests pin BEHAVIOUR, not the library's
// choice of how to signal failure.
async function expectRejected(
  run: () => Promise<{ verified: boolean }>,
): Promise<void> {
  let verified: boolean | undefined;
  try {
    ({ verified } = await run());
  } catch {
    // Throwing is a valid rejection.
    return;
  }
  expect(verified).toBe(false);
}

describe("soft authenticator — registration against the real verifier", () => {
  it("mints a RegistrationResponseJSON the real verifier accepts (UV=true)", async () => {
    const auth = await createSoftAuthenticator();
    const challenge = newChallenge();

    const reg = await auth.register({
      challenge,
      origin: ORIGIN,
      rpId: RP_ID,
      uv: true,
    });

    const result = await verifyRegistrationResponse({
      response: reg,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: true,
    });

    expect(result.verified).toBe(true);
    // The credential the verifier extracted must be the one our authenticator holds.
    expect(result.registrationInfo?.credential.id).toBe(auth.credentialId);
    expect(result.registrationInfo?.userVerified).toBe(true);
    expect(result.registrationInfo?.fmt).toBe("none");
  });

  it("is rejected when the origin does not match", async () => {
    const auth = await createSoftAuthenticator();
    const challenge = newChallenge();
    const reg = await auth.register({
      challenge,
      origin: ORIGIN,
      rpId: RP_ID,
      uv: true,
    });

    await expectRejected(() =>
      verifyRegistrationResponse({
        response: reg,
        expectedChallenge: challenge,
        expectedOrigin: "http://attacker.example",
        expectedRPID: RP_ID,
        requireUserVerification: true,
      }),
    );
  });

  it("is rejected when the rpID does not match", async () => {
    const auth = await createSoftAuthenticator();
    const challenge = newChallenge();
    const reg = await auth.register({
      challenge,
      origin: ORIGIN,
      rpId: RP_ID,
      uv: true,
    });

    await expectRejected(() =>
      verifyRegistrationResponse({
        response: reg,
        expectedChallenge: challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: "attacker.example",
        requireUserVerification: true,
      }),
    );
  });

  it("is rejected when UV=false but verification is required", async () => {
    const auth = await createSoftAuthenticator();
    const challenge = newChallenge();
    const reg = await auth.register({
      challenge,
      origin: ORIGIN,
      rpId: RP_ID,
      uv: false,
    });

    await expectRejected(() =>
      verifyRegistrationResponse({
        response: reg,
        expectedChallenge: challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        requireUserVerification: true,
      }),
    );
  });
});

describe("soft authenticator — authentication against the real verifier", () => {
  // Register + verify once, returning the credential record the library wants
  // for authentication (v13 shape: { id, publicKey, counter }).
  async function registeredCredential() {
    const auth = await createSoftAuthenticator();
    const challenge = newChallenge();
    const reg = await auth.register({
      challenge,
      origin: ORIGIN,
      rpId: RP_ID,
      uv: true,
    });
    const result = await verifyRegistrationResponse({
      response: reg,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: true,
    });
    if (!result.verified || !result.registrationInfo) {
      throw new Error("registration setup failed");
    }
    return { auth, credential: result.registrationInfo.credential };
  }

  it("mints an AuthenticationResponseJSON the real verifier accepts, correlated to registration", async () => {
    const { auth, credential } = await registeredCredential();
    const challenge = newChallenge();

    const assertion = await auth.authenticate({
      challenge,
      origin: ORIGIN,
      rpId: RP_ID,
      uv: true,
      signCount: 1,
    });

    const result = await verifyAuthenticationResponse({
      response: assertion,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential,
      requireUserVerification: true,
    });

    expect(result.verified).toBe(true);
    expect(result.authenticationInfo.newCounter).toBe(1);
    expect(result.authenticationInfo.credentialID).toBe(auth.credentialId);
  });

  it("verifies against the authenticator's own exposed credentialRecord (COSE key correlates)", async () => {
    // Prove auth.publicKey / auth.credentialRecord() are the real COSE key by
    // verifying authentication against them directly — no reliance on the
    // registration verifier's extraction. This is the record later route tests
    // would persist and pass back to verifyAuthenticationResponse().
    const auth = await createSoftAuthenticator();
    await auth.register({
      challenge: newChallenge(),
      origin: ORIGIN,
      rpId: RP_ID,
      uv: true,
    });

    const challenge = newChallenge();
    const assertion = await auth.authenticate({
      challenge,
      origin: ORIGIN,
      rpId: RP_ID,
      uv: true,
      signCount: 5,
    });

    const result = await verifyAuthenticationResponse({
      response: assertion,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: auth.credentialRecord(0),
      requireUserVerification: true,
    });

    expect(result.verified).toBe(true);
    expect(result.authenticationInfo.newCounter).toBe(5);
  });

  it("is rejected when the origin does not match", async () => {
    const { auth, credential } = await registeredCredential();
    const challenge = newChallenge();
    const assertion = await auth.authenticate({
      challenge,
      origin: ORIGIN,
      rpId: RP_ID,
      uv: true,
      signCount: 1,
    });

    await expectRejected(() =>
      verifyAuthenticationResponse({
        response: assertion,
        expectedChallenge: challenge,
        expectedOrigin: "http://attacker.example",
        expectedRPID: RP_ID,
        credential,
        requireUserVerification: true,
      }),
    );
  });

  it("is rejected when the rpID does not match", async () => {
    const { auth, credential } = await registeredCredential();
    const challenge = newChallenge();
    const assertion = await auth.authenticate({
      challenge,
      origin: ORIGIN,
      rpId: RP_ID,
      uv: true,
      signCount: 1,
    });

    await expectRejected(() =>
      verifyAuthenticationResponse({
        response: assertion,
        expectedChallenge: challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: "attacker.example",
        credential,
        requireUserVerification: true,
      }),
    );
  });

  it("is rejected when UV=false but verification is required", async () => {
    const { auth, credential } = await registeredCredential();
    const challenge = newChallenge();
    const assertion = await auth.authenticate({
      challenge,
      origin: ORIGIN,
      rpId: RP_ID,
      uv: false,
      signCount: 1,
    });

    await expectRejected(() =>
      verifyAuthenticationResponse({
        response: assertion,
        expectedChallenge: challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        credential,
        requireUserVerification: true,
      }),
    );
  });
});

describe("frozen real-browser registration fixture", () => {
  // A frozen fixture pins the verifier config so the soft authenticator cannot
  // co-drift with a misconfigured verifier. The installed @simplewebauthn/server
  // ships no usable browser-captured fixture (esm/script only, no test vectors),
  // and generating one from our own code would defeat the point (it would be the
  // very implementation under test). So the frozen fixture is deferred to Task
  // 16's real-browser smoke, where a genuine browser capture can be pasted in.
  // See task-3-report.md "fixture provenance".
  it.todo(
    "the real verifier accepts a captured real-browser RegistrationResponseJSON (Task 16 real-browser smoke)",
  );
});
