import { decodeTransaction, encodeTransaction } from "./txn.js";

export function decodeBatch(batch) {
    batch = JSON.parse(`[${batch}]`);

    const newBatch = [];

    for (const txn of batch) {
        newBatch.push(decodeTransaction("0x" + txn));
    }

    return newBatch;
}

export function encodeBatch(batch) {
    let txList = [];

    for (const tx of batch) {
        txList.push(encodeTransaction(tx).slice(2));
    }

    return JSON.stringify(txList).slice(1, -1); // Remove "[" and "]";
}
