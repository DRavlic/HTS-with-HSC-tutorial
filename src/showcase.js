require("dotenv").config();
const fs = require("fs");
const {
  AccountId,
  Client,
  ContractCreateFlow,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  PrivateKey,
  TokenCreateTransaction,
  TokenUpdateTransaction,
  TokenAssociateTransaction,
  AccountAllowanceApproveTransaction,
} = require("@hashgraph/sdk");
const { exit } = require("process");
const utils = require("./utils");

const INITIAL_SUPPLY = 1000;
const MAX_GAS = 3000000;

// Grab your Hedera testnet account ID and private key from .env file
const accountId = AccountId.fromString(process.env.ACCOUNT_ID);
const privateKey = PrivateKey.fromString(process.env.PRIVATE_KEY);

// Get Treasury account ID and private key
const treasuryId = AccountId.fromString(process.env.TREASURY_ACCOUNT_ID);
const treasuryPrivateKey = PrivateKey.fromString(
  process.env.TREASURY_PRIVATE_KEY
);

// Get another account ID and it's private key
const aliceId = AccountId.fromString(process.env.ALICE_ACCOUNT_ID);
const alicePrivateKey = PrivateKey.fromString(process.env.ALICE_PRIVATE_KEY);

// Set the client with your account ID and private key
const client = Client.forTestnet().setOperator(accountId, privateKey);

async function main() {
  /////////////////////////////////
  // Create fungible token with HTS
  const tokenCreateTx = await new TokenCreateTransaction()
    .setTokenName("Fungible")
    .setTokenSymbol("FNG")
    .setDecimals(0)
    .setInitialSupply(INITIAL_SUPPLY)
    .setTreasuryAccountId(treasuryId)
    .setAdminKey(treasuryPrivateKey)
    .setSupplyKey(treasuryPrivateKey)
    .freezeWith(client)
    .sign(treasuryPrivateKey);

  const tokenCreateRx = await utils.executeInConsole(
    tokenCreateTx,
    "Creating a new fungible token using HTS...",
    client
  );
  const tokenId = tokenCreateRx.tokenId;
  const tokenAddressSol = tokenId.toSolidityAddress();
  console.log(`Token ID: ${tokenId}`);
  console.log(`Token ID in Solidity format: ${tokenAddressSol}`);
  await utils.printTokenSupply(tokenId, client);

  ///////////////////////////////////////////////////
  // Deploy Solidity smart contract on Hedera network
  const contractBytecode = fs.readFileSync("./contracts/HtsFungible.bin");

  const contractDeployTx = new ContractCreateFlow()
    .setBytecode(contractBytecode)
    .setGas(MAX_GAS)
    .setConstructorParameters(
      new ContractFunctionParameters().addAddress(tokenAddressSol)
    );
  const contractDeployRx = await utils.executeInConsole(
    contractDeployTx,
    "Deploying Solidity smart contract on Hedera network...",
    client
  );

  const contractId = contractDeployRx.contractId;
  const contractAddress = contractId.toSolidityAddress();
  console.log("Smart contract ID is: " + contractId);
  console.log(
    "Smart contract ID in Solidity format is " + contractAddress + "\n"
  );

  /////////////////////////////////////////////////////////////////////
  // Update the fungible token so the smart contract manages the supply
  const tokenUpdateTx = await new TokenUpdateTransaction()
    .setTokenId(tokenId)
    .setSupplyKey(contractId)
    .freezeWith(client)
    .sign(treasuryPrivateKey);
  await utils.executeInConsole(
    tokenUpdateTx,
    "Transfering rights for changing token's supply to smart contract...",
    client
  );

  /////////////////////////////////////
  // Mint new tokens via smart contract
  const mintTx = new ContractExecuteTransaction()
    .setContractId(contractId)
    .setGas(MAX_GAS)
    .setFunction(
      "mintToken",
      new ContractFunctionParameters().addInt64(INITIAL_SUPPLY)
    );
  await utils.executeInConsole(
    mintTx,
    "Minting new fungible tokens via smart contract...",
    client
  );
  await utils.printTokenSupply(tokenId, client);

  /////////////////////////////////////
  // Burn new tokens via smart contract
  const burnTx = new ContractExecuteTransaction()
    .setContractId(contractId)
    .setGas(MAX_GAS)
    .setFunction(
      "burnToken",
      new ContractFunctionParameters().addInt64(INITIAL_SUPPLY / 2)
    );
  await utils.executeInConsole(
    burnTx,
    "Burning fungible tokens via smart contract...",
    client
  );
  await utils.printTokenSupply(tokenId, client);

  ///////////////////////////////////////////////////////
  // Associate Alice's account with a newly created token
  const associateTx = await new TokenAssociateTransaction()
    .setAccountId(aliceId)
    .setTokenIds([tokenId])
    .freezeWith(client)
    .sign(alicePrivateKey);
  await utils.executeInConsole(
    associateTx,
    "Associating Alice's account with newly created fungible token...",
    client
  );

  ///////////////////////////////////////////////////////////
  // Give allowance from Treasury's account to smart contract
  const amountToTransfer = INITIAL_SUPPLY / 2;
  const allowanceTx = await new AccountAllowanceApproveTransaction()
    .approveTokenAllowance(
      tokenId,
      treasuryId,
      contractId.toString(),
      amountToTransfer
    )
    .freezeWith(client)
    .sign(treasuryPrivateKey);

  await utils.executeInConsole(
    allowanceTx,
    "Approving allowance for smart contract in order to succesfully transfer tokens from Treasury's account...",
    client
  );

  //////////////////////////////////////////////////////////////////////
  // Transfer fungible tokens from Treasury's account to Alice's account
  const transferTx = await new ContractExecuteTransaction()
    .setContractId(contractId)
    .setGas(MAX_GAS)
    .setFunction(
      "transferToken",
      new ContractFunctionParameters()
        .addAddress(treasuryId.toSolidityAddress())
        .addAddress(aliceId.toSolidityAddress())
        .addInt64(amountToTransfer)
    )
    .freezeWith(client)
    .sign(treasuryPrivateKey);
  await utils.executeInConsole(
    transferTx,
    `Transfering ${amountToTransfer} fungible tokens from Treasury's account to Alice's account...`,
    client
  );

  console.log(
    "Treasury's balance: " +
      (await utils.getAccountBalance(treasuryId, tokenId, client))
  );
  console.log(
    "Alice's balance: " +
      (await utils.getAccountBalance(aliceId, tokenId, client))
  );

  exit();
}

main();
