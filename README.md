# Scalable Airdrop System

> :warning: **Work in progress**

This repository contains an implementation of a Scalable Airdrop System for the TON blockchain. It can be used to distribute Jettons to any number of wallets. Check the `scripts/` directory for examples of usage.

## Motivation

We can classify old airdrop systems into three groups based on their mechanism:

-   Distribution of all tokens at once: The distributor pays all the fees. This is simple and fast, making it a good approach for small airdrops (<1000 recipients). However, it requires you to pay the fees for distributing all the tokens. For large airdrops, you'll end up spending thousands of dollars just for fees.
-   Storing all recipients in contract storage and distributing tokens individually to each user: Users pay fees for claiming tokens. This approach requires users to send a claiming message to receive their tokens. This method was used for distributing $Uniswap tokens, for example. You don't spend a lot of money on fees with this approach, but the smart contract stores tens of thousands of entries in an on-chain dictionary, which is also very costly and inefficient.
-   Storing airdrop entries in a Merkle tree: The smart contract stores the root hash of the tree and a list of addresses that have already claimed the airdrop. This approach eliminates the need to pay high fees during deployment but can still be costly for users on a large scale.
    This approach removes the need of paying a lot of fees on the deployment, but can still be costy for users on a large scale.

The system described in this repository is scalable, inexpensive, and maintains a consistent claiming process for users.

## Description

We will store the list of airdrop entries in a Merkle tree, which allows us to quickly and cheaply check whether any record belongs to the original list, similar to the third group of airdrops described earlier. This tree can be stored off-chain, while the smart contract only needs to store the root hash of the tree.

Each record can look like this:

```
#_ address:MsgAddressInt amount:Coins = AirdropEntry;
```

To claim the airdrop, the user only needs to provide the Merkle proof of their entry.

Since we don't want to dynamically change the tree during the contract process and don't want to add unpredictable and large fees for users, we need another way to protect against repeated claims. Let's add another contract to the system - `AirdropHelper`. Its only job is to act as a boolean variable that shows whether the user has already claimed tokens or not. This contract will store the recipient and main `Airdrop` contract addresses in its data so that each user has a separate contract with deterministic address that can be calculated within the main contract.

Upon deployment, the `AirdropHelper` contract checks if the deployer is the main `Airdrop` contract and sends a message indicating success back. For all future calls, this contract will throw an error because it has been deployed previously. Such a contract doesn't require a lot of coins on its balance to stay alive for a long time. **0.05 TON** would be enough for many years, which is more than sufficient.

The main advantage of using separate contracts here is that the claiming fees are the same for all users, regardless of the number of users who have already claimed tokens.

## Possible improvements

With the simple and generic logic of this system, we can easily modify it to work not only with Jetton airdrops but also with arbitrary messages. The smart contract can be used to send arbitrary messages on its behalf upon requests from external sources while ensuring that each message will be sent only once.

For example, this system could be adapted not only for airdrops of Jettons that follow the TEP-74 standard but also for NFTs or any other possible future standards and modifications of tokens.
