import * as crypto from "crypto";
import EC from "elliptic";

const SHA256 = message => crypto.createHash("sha256").update(message).digest("hex");
const ec = new EC.ec("secp256k1");

const keyPair = ec.genKeyPair();

const pubKey = keyPair.getPublic("hex");
const privKey = keyPair.getPrivate("hex");
const address = SHA256(pubKey);

console.log("Address:", address);
console.log("Private key:", privKey);
console.log("Public key:", pubKey);
