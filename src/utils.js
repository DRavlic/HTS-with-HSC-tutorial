const { AccountBalanceQuery, TokenInfoQuery } = require("@hashgraph/sdk");

async function executeInConsole(tx, msg, client) {
  console.log(msg);

  const timeBeforeTx = performance.now();
  const receipt = await (await tx.execute(client)).getReceipt(client);
  const timeAfterTx = performance.now();

  console.log(
    `...${receipt.status}! in ${Math.round(timeAfterTx - timeBeforeTx)} ms\n`
  );

  return receipt;
}

async function printTokenSupply(tokenId, client) {
  let tokenSupply = (
    await new TokenInfoQuery().setTokenId(tokenId).execute(client)
  ).totalSupply.low;

  console.log("Token supply: " + tokenSupply + "\n");
}

async function getAccountBalance(accountId, tokenId, client) {
  let balanceCheckTx = await new AccountBalanceQuery()
    .setAccountId(accountId)
    .execute(client);

  return balanceCheckTx.tokens._map.get(tokenId.toString()).low;
}

module.exports = { executeInConsole, printTokenSupply, getAccountBalance };
