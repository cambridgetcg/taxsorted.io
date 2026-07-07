// A software WebAuthn authenticator — TEST-ONLY. It mints real registration and
// authentication ceremony responses (RegistrationResponseJSON /
// AuthenticationResponseJSON) without a browser, so route tests can drive the
// passkey flows end to end. Every byte it emits is real: correctly CBOR-encoded
// attestation objects, COSE EC2/P-256 public keys, and ECDSA signatures that the
// real @simplewebauthn/server verifiers accept.
//
// Nothing here ships to production paths; it lives under src/__tests__/ and is
// imported only by tests.
//
// References (all in node_modules/@simplewebauthn/server):
//   - registration/verifyRegistrationResponse.js — what the verifier reads back
//   - helpers/parseAuthenticatorData.js — the authData byte layout & flag bits
//   - helpers/iso/isoCrypto/unwrapEC2Signature.js — proves signatures must be DER

import { webcrypto } from "node:crypto";
import { isoBase64URL, isoCBOR } from "@simplewebauthn/server/helpers";
import type {
  AuthenticationResponseJSON,
  Base64URLString,
  RegistrationResponseJSON,
  Uint8Array_,
} from "@simplewebauthn/server";

// tiny-cbor's encoder accepts numbers/strings/bytes/Maps; we build Maps with
// numeric COSE labels and string attestation keys, so we cast to its input type
// at the encode boundary rather than fight Map's invariant generics.
type CBORInput = Parameters<typeof isoCBOR.encode>[0];

// WebAuthn authenticator-data flag bits (see parseAuthenticatorData.js).
const FLAG_UP = 0b0000_0001; // User Present
const FLAG_UV = 0b0000_0100; // User Verified
const FLAG_AT = 0b0100_0000; // Attested credential data included

// COSE label / value constants for an EC2 P-256 (ES256) public key.
const COSE_KTY = 1;
const COSE_ALG = 3;
const COSE_CRV = -1;
const COSE_X = -2;
const COSE_Y = -3;
const COSE_KTY_EC2 = 2;
const COSE_ALG_ES256 = -7;
const COSE_CRV_P256 = 1;

export interface RegisterParams {
  /** The server's Base64URL challenge, echoed verbatim into clientDataJSON. */
  challenge: Base64URLString;
  origin: string;
  rpId: string;
  /** Whether the authenticator verified the user (sets the UV flag). */
  uv: boolean;
  /** Signature counter to report in authData; defaults to 0. */
  signCount?: number;
}

export interface AuthenticateParams {
  challenge: Base64URLString;
  origin: string;
  rpId: string;
  uv: boolean;
  /** Signature counter to report; defaults to one past the last used value. */
  signCount?: number;
}

export interface SoftAuthenticator {
  /** Base64URL credential id — matches the `id`/`rawId` of every response. */
  readonly credentialId: Base64URLString;
  /** COSE-encoded EC2 public key bytes, i.e. WebAuthnCredential.publicKey. */
  readonly publicKey: Uint8Array_;
  /** The record shape verifyAuthenticationResponse() wants (v13). */
  credentialRecord(counter?: number): {
    id: Base64URLString;
    publicKey: Uint8Array_;
    counter: number;
  };
  register(params: RegisterParams): Promise<RegistrationResponseJSON>;
  authenticate(params: AuthenticateParams): Promise<AuthenticationResponseJSON>;
}

const textEncoder = new TextEncoder();

function concatBytes(chunks: Uint8Array[]): Uint8Array_ {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

function uint16BE(value: number): Uint8Array_ {
  const buf = new Uint8Array(2);
  new DataView(buf.buffer).setUint16(0, value, false);
  return buf;
}

function uint32BE(value: number): Uint8Array_ {
  const buf = new Uint8Array(4);
  new DataView(buf.buffer).setUint32(0, value, false);
  return buf;
}

async function sha256(data: Uint8Array): Promise<Uint8Array_> {
  const digest = await webcrypto.subtle.digest("SHA-256", data);
  return new Uint8Array(digest);
}

/**
 * Convert a WebCrypto raw ECDSA signature (r||s, fixed-width, big-endian) into
 * the ASN.1 DER encoding WebAuthn requires:  SEQUENCE { INTEGER r, INTEGER s }.
 * @simplewebauthn unwraps DER via @peculiar/asn1-ecc before verifying, so a raw
 * signature would be rejected. For P-256 the total length is always < 128, so a
 * single-byte DER length is sufficient.
 */
export function rawSignatureToDER(raw: Uint8Array): Uint8Array_ {
  const half = raw.length / 2;
  const r = derInteger(raw.subarray(0, half));
  const s = derInteger(raw.subarray(half));
  const body = concatBytes([r, s]);
  return concatBytes([Uint8Array.of(0x30, body.length), body]);
}

// Encode one DER INTEGER: strip leading zero bytes, then re-add a single 0x00 if
// the high bit is set (so the value stays positive).
function derInteger(component: Uint8Array): Uint8Array_ {
  let start = 0;
  while (start < component.length - 1 && component[start] === 0) {
    start += 1;
  }
  let value = component.subarray(start);
  if ((value[0] & 0x80) !== 0) {
    value = concatBytes([Uint8Array.of(0x00), value]);
  }
  return concatBytes([Uint8Array.of(0x02, value.length), value]);
}

function clientDataJSON(
  type: "webauthn.create" | "webauthn.get",
  challenge: Base64URLString,
  origin: string,
): Uint8Array_ {
  // Browsers echo the challenge as the Base64URL string the RP sent, then sign
  // over these exact bytes — so we serialise once and reuse for both the encoded
  // response field and the signature base.
  const json = JSON.stringify({ type, challenge, origin, crossOrigin: false });
  return concatBytes([textEncoder.encode(json)]);
}

// authData = rpIdHash(32) || flags(1) || signCount(4) || [attestedCredentialData]
async function buildAuthData(
  rpId: string,
  flags: number,
  signCount: number,
  attestedCredentialData?: Uint8Array_,
): Promise<Uint8Array_> {
  const rpIdHash = await sha256(textEncoder.encode(rpId));
  const chunks = [rpIdHash, Uint8Array.of(flags), uint32BE(signCount)];
  if (attestedCredentialData) {
    chunks.push(attestedCredentialData);
  }
  return concatBytes(chunks);
}

export async function createSoftAuthenticator(): Promise<SoftAuthenticator> {
  const keyPair = await webcrypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );

  // Raw EC point: 0x04 || X(32) || Y(32).
  const rawPublicKey = new Uint8Array(
    await webcrypto.subtle.exportKey("raw", keyPair.publicKey),
  );
  const x = rawPublicKey.subarray(1, 33);
  const y = rawPublicKey.subarray(33, 65);

  // COSE_Key for EC2/P-256 — a CBOR map with numeric labels. Encoding it with
  // the library's own encoder guarantees it round-trips to the exact same bytes
  // the verifier re-encodes, so authData length checks line up.
  const coseKey = new Map<number, number | Uint8Array>([
    [COSE_KTY, COSE_KTY_EC2],
    [COSE_ALG, COSE_ALG_ES256],
    [COSE_CRV, COSE_CRV_P256],
    [COSE_X, x],
    [COSE_Y, y],
  ]);
  const publicKey = isoCBOR.encode(coseKey as unknown as CBORInput);

  const credentialIdBytes = webcrypto.getRandomValues(new Uint8Array(32));
  const credentialId = isoBase64URL.fromBuffer(credentialIdBytes);

  // Attested credential data (registration only):
  //   aaguid(16 zeros) || credIdLen(2) || credentialId || COSE publicKey
  const attestedCredentialData = concatBytes([
    new Uint8Array(16),
    uint16BE(credentialIdBytes.length),
    credentialIdBytes,
    publicKey,
  ]);

  // Highest signCount reported so far, so authenticate() can auto-increment and
  // stay ahead of the verifier's stored counter.
  let lastSignCount = 0;

  async function sign(data: Uint8Array): Promise<Uint8Array_> {
    const raw = new Uint8Array(
      await webcrypto.subtle.sign(
        { name: "ECDSA", hash: "SHA-256" },
        keyPair.privateKey,
        data,
      ),
    );
    return rawSignatureToDER(raw);
  }

  async function register(
    params: RegisterParams,
  ): Promise<RegistrationResponseJSON> {
    const signCount = params.signCount ?? 0;
    lastSignCount = signCount;

    const flags = FLAG_UP | FLAG_AT | (params.uv ? FLAG_UV : 0);
    const authData = await buildAuthData(
      params.rpId,
      flags,
      signCount,
      attestedCredentialData,
    );

    // fmt 'none' attestation: empty attStmt map, authData carrying the new key.
    const attestationObject = isoCBOR.encode(
      new Map<string, unknown>([
        ["fmt", "none"],
        ["attStmt", new Map()],
        ["authData", authData],
      ]) as unknown as CBORInput,
    );

    const clientData = clientDataJSON(
      "webauthn.create",
      params.challenge,
      params.origin,
    );

    return {
      id: credentialId,
      rawId: credentialId,
      response: {
        clientDataJSON: isoBase64URL.fromBuffer(clientData),
        attestationObject: isoBase64URL.fromBuffer(attestationObject),
        transports: ["internal"],
      },
      clientExtensionResults: {},
      type: "public-key",
      authenticatorAttachment: "platform",
    };
  }

  async function authenticate(
    params: AuthenticateParams,
  ): Promise<AuthenticationResponseJSON> {
    const signCount = params.signCount ?? lastSignCount + 1;
    lastSignCount = signCount;

    const flags = FLAG_UP | (params.uv ? FLAG_UV : 0);
    const authData = await buildAuthData(params.rpId, flags, signCount);

    const clientData = clientDataJSON(
      "webauthn.get",
      params.challenge,
      params.origin,
    );

    // Signature is over authData || SHA-256(clientDataJSON).
    const signatureBase = concatBytes([authData, await sha256(clientData)]);
    const signature = await sign(signatureBase);

    return {
      id: credentialId,
      rawId: credentialId,
      response: {
        clientDataJSON: isoBase64URL.fromBuffer(clientData),
        authenticatorData: isoBase64URL.fromBuffer(authData),
        signature: isoBase64URL.fromBuffer(signature),
      },
      clientExtensionResults: {},
      type: "public-key",
      authenticatorAttachment: "platform",
    };
  }

  return {
    credentialId,
    publicKey,
    credentialRecord(counter = 0) {
      return { id: credentialId, publicKey, counter };
    },
    register,
    authenticate,
  };
}
