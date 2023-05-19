import * as crypto from "crypto";
import BN from "bn.js";
import EC from "elliptic";

const SHA256 = message => crypto.createHash("sha256").update(message).digest("hex");
const ec = new EC.ec("secp256k1");

// Transaction fields

// - to: 32 bytes | Hex string
// - value: 11 bytes | BigInt
// - gasPrice: 11 bytes | BigInt
// - nonce: 3 bytes | BigInt
// - r: 32 bytes | Hex string
// - s: 32 bytes | Hex string
// - v: 1 byte | Hex string

export function decodeTransaction(tx) {
    try {
        tx = tx.slice(2); // Removes "0x"

        const txObj = { sig: {} };

        txObj.to = tx.slice(0, 64);
        tx = tx.slice(64);

        txObj.value = BigInt("0x" + tx.slice(0, 22));
        tx = tx.slice(22);

        txObj.gasPrice = BigInt("0x" + tx.slice(0, 22));
        tx = tx.slice(22);

        txObj.nonce = parseInt(tx.slice(0, 6));
        tx = tx.slice(6);

        txObj.sig.r = tx.slice(0, 64);
        tx = tx.slice(64);

        txObj.sig.s = tx.slice(0, 64);
        tx = tx.slice(64);

        txObj.sig.v = tx.slice(0, 2);
        tx = tx.slice(2);
        
        return txObj;
    } catch(e) {
        throw new Error("Invalid transation format.");
    }
}

export function encodeTransaction(txObj) {
    const tx = (
        txObj.to                                      + 
        txObj.value.toString(16).padStart(22, "0")    +
        txObj.gasPrice.toString(16).padStart(22, "0") +
        txObj.nonce.toString(16).padStart(6, "0")     +
        txObj.sig.r                                   +
        txObj.sig.s                                   +
        txObj.sig.v
    );

    return "0x" + tx;
}

export function signTransaction(txObj, keyPair) {
    const sigObj = keyPair.sign(hashTransactionHeader(txObj));

    txObj.sig = {
        v: sigObj.recoveryParam.toString(16).padStart(2, "0"),
        r: sigObj.r.toString(16).padStart(64, "0"),
        s: sigObj.s.toString(16).padStart(64, "0")
    };
}

export function hashTransactionHeader(txObj) {
    return SHA256(
        txObj.to              +
        txObj.value           +
        txObj.gasPrice        +
        txObj.nonce.toString()
    )
}

export function getPubKey(txObj) {
    const msgHash = hashTransactionHeader(txObj);

    const sigObj = {
        r: new BN(txObj.sig.r, 16),
        s: new BN(txObj.sig.s, 16),
        recoveryParam: parseInt(txObj.sig.v, 16)
    };
    
    // Recover public key and get real address.
    const txSenderPubkey = ec.recoverPubKey(
        new BN(msgHash, 16).toString(10),
        sigObj,
        ec.getKeyRecoveryParam(msgHash, sigObj, ec.genKeyPair().getPublic())
    );

    return ec.keyFromPublic(txSenderPubkey).getPublic("hex");
}

export async function lightTxVerify(txObj) {
    let txSenderPubkey;

    // If recovering public key fails, then transaction is not valid.
    try {
        txSenderPubkey = getPubKey(txObj);
    } catch (e) {
        console.log(e);

        return false;
    }

    return true;
}
