import fs from "fs";
import * as crypto from "crypto";
import EC from "elliptic";
import { Level } from "level";

const SHA256 = message => crypto.createHash("sha256").update(message).digest("hex");
const ec = new EC.ec("secp256k1");

import { decodeTransaction, encodeTransaction, signTransaction, hashTransactionHeader, getPubKey, lightTxVerify } from "./txn.js";
import { decodeBatch, encodeBatch } from "./batch.js";
import { transitState } from "./runtime.js";
import config from "../../config.js";


// Init

const {
    PRIVKEY,
    START_SYNC,
    LEVEL_PATH,
    LOG_FILE,
    FIRST_MINT_ADDR,
    FIRST_MINT_AMOUNT
} = config;

const bitrollKeyPair = ec.keyFromPrivate(PRIVKEY);

const stateDB = new Level(LEVEL_PATH, { valueEncoding: "json" });


// Init sync height

let counter;

if (!fs.existsSync(LOG_FILE)) {
    counter = START_SYNC;

    // Initial coin mint
    await stateDB.put(FIRST_MINT_ADDR, { balance: FIRST_MINT_AMOUNT, nonce: 0 });
} else {
    counter = parseInt(fs.readFileSync(LOG_FILE));
}


// Test transaction

const txObj = {
    to: "d1bd44aea0b53f74075be0ad4b7240448d61a34157ec782cc1b8aee3ec675127",
    value: 1000000000n,
    gasPrice: 1000000n,
    nonce: 0
}

signTransaction(txObj, bitrollKeyPair);

console.log(txObj);

const batch = encodeBatch([ txObj ]);

await transitState(decodeBatch(batch), stateDB, "d1bd44aea0b53f74075be0ad4b7240448d61a34157ec782cc1b8aee3ec675127");

console.log(
    await stateDB.get(FIRST_MINT_ADDR),
    await stateDB.get("d1bd44aea0b53f74075be0ad4b7240448d61a34157ec782cc1b8aee3ec675127")
);
