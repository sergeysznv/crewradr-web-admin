// Produced by the mobile app's Dart code (WebKeyHandoffCrypto.seal) with a throwaway
// browser P-256 key pair (one-off flutter test calling seal()). Keep in sync with the wire
// format in mobile lib/services/web_key_handoff_crypto.dart.
export const DART_FIXTURE = {
  "handoffId": "3f2b8c1e-5d4a-4b6c-9a7e-1c2d3e4f5a6b",
  "crewId": "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
  "crewKey": "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff",
  "browserPrivateJwk": {
    "kty": "EC",
    "crv": "P-256",
    "d": "X41L3ctnauHf36pPGvYAzuGtRkFhlV_bq9aRI5CNIIs",
    "x": "J1m0VJK6ESvb8w8sB5hzDpnZR7gD2Nzqh13M2s5EwQE",
    "y": "RUXWT1KpgxmaQWZUXawN9S2qLScKnFH5UWlnT1lcZ0Y"
  },
  "browserPublicKey": "eyJrdHkiOiJFQyIsImNydiI6IlAtMjU2IiwieCI6IkoxbTBWSks2RVN2Yjh3OHNCNWh6RHBuWlI3Z0QyTnpxaDEzTTJzNUV3UUU9IiwieSI6IlJVWFdUMUtwZ3htYVFXWlVYYXdOOVMycUxTY0tuRkg1VVdsblQxbGNaMFk9In0=",
  "payload": {
    "v": 1,
    "pub": "eyJrdHkiOiJFQyIsImNydiI6IlAtMjU2IiwieCI6Im5jc0VkNWNmc0JLMnhfRzUxVDJObFJ2WE5KSzFpUUxLdzdzdlgyRy1iazg9IiwieSI6IlhrZHRrMGRqOS1oMnlGRVM3T2VsYnk2ZG4wZTllejVGUWloeG02dm1TQzQ9In0=",
    "nonce": "mObkFJ0TqFjFu4Ph",
    "ct": "yKy0LcQMp5OpX9QDqDcFra38SP_3L1z6H02ubspzfSG6-a76EiN_yaxAHv2DzMq9CJ_GqVjdGjmGBllMqTBy-2dTwuc4lFRLfBBgzo-exLs"
  }
} as const;
