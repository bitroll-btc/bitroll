import * as crypto from "crypto";
import { getPubKey, lightTxVerify } from "./txn.js";

const SHA256 = message => crypto.createHash("sha256").update(message).digest("hex");

export async function transitState(batch, stateDB, sequencerAddress) {
    const existedAddresses = await stateDB.keys().all();
    
    // Transit state, ignores all faulty transactions

    // State cache
    let states = {};

    // Cache sequencer state
    if (!existedAddresses.includes(sequencerAddress)) { // If not already existed in state
        states[sequencerAddress] = { balance: "0", nonce: 0 };
    } else { // If already existed
        states[sequencerAddress] = await stateDB.get(sequencerAddress);
    }

    console.log(sequencerAddress);

    for (const txn of batch) {
        // Check if signature is correct
        if (!(await lightTxVerify(txn, stateDB))) continue;

        // Check if sender exists and nonce is correct
        const txSenderAddress = SHA256(getPubKey(txn));

        if (states[txSenderAddress]) { // Address exists and is cached
            if (states[txSenderAddress].nonce !== txn.nonce) continue;
        } else if (existedAddresses.includes(txSenderAddress)) { // Address exists in DB but not cached
            const senderState = await stateDB.get(txSenderAddress);

            if (senderState.nonce !== txn.nonce) continue;
        } else { // Address does not exist at all, skip
            continue;
        }

        // Start execution

        // Cache if not done already
        if (!states[txSenderAddress]) {
            const senderState = await stateDB.get(txSenderAddress);

            states[txSenderAddress] = senderState;
        }

        // Update balance
        const amountToPay = txn.value + txn.gasPrice;

        if (states[txSenderAddress].balance > amountToPay) {
            // Update state if transaction is valid
            
            states[txSenderAddress].balance = (BigInt(states[txSenderAddress].balance) - amountToPay).toString(); // Update balance

            states[txSenderAddress].nonce += 1; // Update nonce

            states[sequencerAddress].balance = (BigInt(states[sequencerAddress].balance) + txn.gasPrice).toString(); // Reward for sequencer

            // Cache receiver state
            if (!states[txn.to] && existedAddresses.includes(txn.to)) { // If receiver existed in state DB but not in cache
                states[txn.to] = await stateDB.get(txn.to);
            } else if (!existedAddresses.includes(txn.to)) { // If receiver does not exist at all
                states[txn.to] = { balance: "0", nonce: 0 };
            }

            // Update receiver's balance
            states[txn.to].balance = (BigInt(states[txn.to].balance) + txn.value).toString();
        }
    }

    for (const account in states) {
        await stateDB.put(account, states[account]);
    }
}
