require("dotenv").config();
const {
  AccountBalanceQuery,
  AccountCreateTransaction,
  AccountId,
  Client,
  Hbar,
  PrivateKey,
} = require("@hashgraph/sdk");
const { exit } = require("process");
const utils = require("./utils");

// Grab your Hedera testnet account ID and private key from .env file
const accountId = AccountId.fromString(process.env.ACCOUNT_ID);
const privateKey = PrivateKey.fromString(process.env.PRIVATE_KEY);

// Set the client with your account ID and private key
const client = Client.forTestnet().setOperator(accountId, privateKey);

async function main() {
  // Create new keys
  const newAccountPrivateKey = PrivateKey.generateED25519();
  const newAccountPublicKey = newAccountPrivateKey.publicKey;

  // Create a new account with 1 hbar starting balance
  const newAccountTx = await new AccountCreateTransaction()
    .setKey(newAccountPublicKey)
    .setInitialBalance(Hbar.from(1));
  const newAccountRx = await utils.executeInConsole(
    newAccountTx,
    "Creating new Hedera account with initial balance of 1 HBAR...",
    client
  );

  const newAccountId = newAccountRx.accountId;
  console.log("The new account ID is: " + newAccountId);
  console.log("The new account public key is: " + newAccountPublicKey);
  console.log("The new account private key is: " + newAccountPrivateKey);

  // Verify and print account balance
  const accountBalance = await new AccountBalanceQuery()
    .setAccountId(newAccountId)
    .execute(client);

  console.log("\nNew account balance is: " + accountBalance.hbars.toString());

  console.log("\nCopy the new account data into .env!");
  exit();
}

main();
