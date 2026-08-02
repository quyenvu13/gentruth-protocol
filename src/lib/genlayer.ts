import { createClient } from "genlayer-js";

// The deployed GenTruth Oracle Smart Contract Address
export const CONTRACT_ADDRESS = "0x84ec259564713b766F1B093905Cded802Abfb8F3";

// Configure GenLayer SDK Client (Studionet environment)
export const client = createClient({
    endpoint: "https://studio.genlayer.com:7182"
});
