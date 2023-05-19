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
    console.log("wtf");

    counter = START_SYNC;

    // Initial coin mint
    await stateDB.put(FIRST_MINT_ADDR, { balance: FIRST_MINT_AMOUNT, nonce: 0 });

    fs.writeFileSync(LOG_FILE, counter.toString());
} else {
    counter = parseInt(fs.readFileSync(LOG_FILE));
}

