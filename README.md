# Scalable Airdrop System

This repository contains an implementation of a Scalable Airdrop System for the TON blockchain. It can be used to distribute Jettons on-chain to any number of wallets.

## Table of contents

-   [Technical description](#technical-description)
    -   [Motivation](#motivation)
    -   [Solution](#solution)
    -   [Possible improvements](#possible-improvements)
-   [Documentation](#documentation)
    -   [Preparing the list of entries](#preparing-the-list-of-entries)
    -   [Deploying the Airdrop](#deploying-the-airdrop)
    -   [Claiming the Airdrop](#claiming-the-airdrop)

## Technical description

### Motivation

We can classify old on-chain Airdrop systems into three groups based on their mechanism:

-   Distribution of all tokens at once: The distributor pays all the fees. This is simple and fast, making it a good approach for small Airdrops (<1000 recipients). However, it requires you to pay the fees for distributing all the tokens. For large Airdrops, you will end up spending thousands of dollars just for fees.
-   Storing all recipients in contract storage and distributing tokens individually to each user: Users pay fees for claiming tokens. This approach requires users to send a claiming message to receive their tokens. You do not spend a lot of money on fees with this approach, but the smart contract stores tens of thousands of entries in an on-chain dictionary, which is also very costly and inefficient.
-   Storing Airdrop entries in a Merkle tree: The smart contract stores the root hash of the tree and a list of addresses that have already claimed the Airdrop. This approach eliminates the need to pay high fees during deployment but can still be costly for users on a large scale.

The system described in this repository is scalable, inexpensive, and maintains a consistent claiming process for users.

### Solution

We will store the list of Airdrop entries in a Merkle tree, which allows us to quickly and cheaply check whether any record belongs to the original list, similar to the third group of Airdrops described earlier. This tree can be stored off-chain, while the smart contract only needs to store the root hash of the tree.

Each record can look like this:

```
_ address:MsgAddressInt amount:Coins = AirdropEntry;
```

To claim the Airdrop, the user only needs to provide the Merkle proof of their entry.

Since we do not want to dynamically change the tree during the contract process and do not want to add unpredictable and large fees for users, we need another way to protect against repeated claims. Distributed architecture of TON allows us to easily add another contract to the system - `AirdropHelper`. Its only job is to act as a boolean variable that shows whether the user has already claimed tokens or not. This contract will store the recipient and main `Airdrop` contract addresses in its data so that each user has a separate contract with deterministic address that can be calculated within the main contract.

Upon deployment, the `AirdropHelper` contract checks if the deployer is the main `Airdrop` contract and sends a message indicating success back. For all future calls, this contract will throw an error because it has been deployed previously. Such a contract does not require a lot of coins on its balance to stay alive for a long time. **0.05 TON** would be enough for many years, which is more than sufficient.

The main advantage of using separate contracts here is that the claiming fees are the same for all users, regardless of the number of users who have already claimed tokens.

### Possible improvements

With the simple and generic logic of this system, we can easily modify it to work not only with Jetton Airdrops but also with arbitrary messages. The smart contract can be used to send arbitrary messages on its behalf upon requests from external sources while ensuring that each message will be sent only once.

For example, this system could be adapted not only for Airdrops of Jettons that follow the TEP-74 standard but also for NFTs or any other possible future standards and modifications of tokens.

## Documentation

### Important Consideration

Currently, most wallet applications have a limitation: they do not support the sending of exotic cells. Due to this, the present implementation relies on external messages for transmitting a Merkle proofs. As a result, the process to claim an airdrop involves a two-step procedure:

1. Send an internal deployment message, excluding the Merkle proof cell.
2. Send an external message containing the Merkle proof.

This method may seem less streamlined and may pose challenges for both developers and users. However, given the current constraints, it is the most viable approach to operate this smart contract system.

> :warning: As soon as wallet applications support the sending of exotic cells, all smart contracts will undergo a rework to enhance their efficiency and usability.

### Preparing the list of entries

The first thing you have to do is to prepare a list of Airdrop entries. Each item of that list contains an address of the receiver and the amount of Jettons they can receive.

Example:

```
EQBKgXCNLPexWhs2L79kiARR1phGH1LwXxRbNsCFF9doc2lN: 100
EQDxC1erzS2fub_CNmkdH1A3hRs6xMDrWBmOD2yQOZjRuruv: 200
EQB4cwGljhouzFwc6EHpCacCtsK7_XIj-tNfM5udgW6IxO9R: 150
```

Smart contract works with this list in a form of a Dictionary (`Hashmap` TL-B structure). Here is how you can generate it from such a list.

```ts
const entries: AirdropEntry[] = [
    {
        address: Address.parse('EQBKgXCNLPexWhs2L79kiARR1phGH1LwXxRbNsCFF9doc2lN'),
        amount: toNano('100'),
    },
    {
        address: Address.parse('EQDxC1erzS2fub_CNmkdH1A3hRs6xMDrWBmOD2yQOZjRuruv'),
        amount: toNano('200'),
    },
    {
        address: Address.parse('EQB4cwGljhouzFwc6EHpCacCtsK7_XIj-tNfM5udgW6IxO9R'),
        amount: toNano('150'),
    },
];

const dict = generateEntriesDictionary(entries);
const dictCell = beginCell().storeDictDirect(dict).endCell();
const merkleRoot = BigInt('0x' + dictCell.hash().toString('hex'));
```

You will need the `dict` and the `merkleRoot` values to deploy and use the Airdrop smart contract.

### Deploying the Airdrop

You can use ready script from [scripts/](/scripts/deployAirdrop.ts) directory of this repository.
Here is an example.

```ts
const airdrop = provider.open(
    Airdrop.createFromConfig(
        {
            merkleRoot,
            helperCode: await compile('AirdropHelper'),
        },
        await compile('Airdrop')
    )
);

await airdrop.sendDeploy(provider.sender(), toNano('0.05'), await jettonMinter.getWalletAddressOf(airdrop.address));
```

After the transaction is succesfully sent and confirmed on-chain, your Airdrop will become available to use.

Please remember, that in order to let the Airdrop contract send Jettons to their receivers, you need to transfer the required amount of them to it.
Simply transfer the required amount (sum of all entries) to the `airdrop.address` and it will work as intended.

### Claiming the Airdrop

In order to claim an Airdrop, you need to call `sendClaim` method of `airdropHelper` smart contract which you should deploy.

These calls can easily be integrated into front-end of your website or into some Telegram bot.

```ts
// suppose that you have the cell in base64 form stored somewhere
const dictCell = Cell.fromBase64(
    'te6cckEBBQEAhgACA8/oAgEATUgA8OYDSxw0XZi4OdCD0hNOBW2Fd/rkR/Wmvmc3OwLdEYiLLQXgEAIBIAQDAE0gAkQn3LTRp9vn/K0TXJrWPCeEmrX7VdoMP2KoakM4TmSaO5rKAEAATSACVAuEaWe9itDZsX37JEAijrTCMPqXgvii2bYEKL67Q5odzWUAQC6Eo5U='
);
const dict = dictCell.beginParse().loadDictDirect(Dictionary.Keys.BigUint(256), airdropEntryValue);

const entryIndex = 123n;

const proof = dict.generateMerkleProof(entryIndex);

const helper = provider.open(
    AirdropHelper.createFromConfig(
        {
            airdrop: Address.parse('EQAGUXoAPHIHYleSbSE05egNAlK8YAaYqUQsMho709gMBXU2'),
            index: entryIndex,
            proofHash: proof.hash(),
        },
        await compile('AirdropHelper')
    )
);

if (!(await provider.isContractDeployed(helper.address))) {
    await helper.sendDeploy(provider.sender());
    await provider.waitForDeploy(helper.address);
}

await helper.sendClaim(0n, proof);
```

The cell containing dictionary must be stored in some reliable place. It can be your own server, some cloud storage or even TON Storage.
Make sure to not lose both original list and the cell dictionary at the same time because you will not be able to recover them.
