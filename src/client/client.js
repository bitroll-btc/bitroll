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
    FIRST_MINT_AMOUNT,
    SEQUENCER_MODE
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


// Init client

const Client = require('bitcoin-core');
const client = new Client({
    network: 'regtest',
    port: 18443 
});


// Sync

setTimeout(async function sync() {
    try {

        client.getBlockHash(counter)
            .then(hash => client.getBlockByHash(hash))
            .then(block => {
                const transactionPromises = block.tx.map(txid => client.getRawTransaction(txid, true));

                return Promise.all(transactionPromises);
            })
            .then(transactions => {
                transactions.forEach(async transaction => {
                    let recipient, sequencerAddress, batch;

                    transaction.vout.forEach(vout => {
                        if (vout.scriptPubKey.type !== 'nulldata') {
                            recipient = vout.scriptPubKey.addresses[0];
                        }

                        if (vout.scriptPubKey.asm.startsWith('OP_RETURN')) {
                            const parts = vout.scriptPubKey.asm.split(' ');
                            const dataHex = parts[1];
                            let data = Buffer.from(dataHex, 'hex').toString('utf8');

                            sequencerAddress = data.slice(0, 64);
                            data = data.slice(64);

                            batch = decodeBatch(data);
                        }
                    });

                    await transitState(batch, stateDB, sequencerAddress);
                })
            })
    } catch(e) {
        setTimeout(async () => await sync(), 120000);
    }

    counter++;

    setTimeout(async () => await sync());
}, 5000);


// Sequencer

if (SEQUENCER_MODE) {
    
}

