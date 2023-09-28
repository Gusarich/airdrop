import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type AirdropConfig = {
    jettonMinter: Address;
    jettonWalletCode: Cell;
    merkleRoot: bigint;
    helperCode: Cell;
};

export function airdropConfigToCell(config: AirdropConfig): Cell {
    return beginCell()
        .storeAddress(config.jettonMinter)
        .storeRef(config.jettonWalletCode)
        .storeUint(config.merkleRoot, 256)
        .storeRef(config.helperCode)
        .endCell();
}

export type AirdropEntry = {
    address: Address;
    amount: bigint;
};

export class Airdrop implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Airdrop(address);
    }

    static createFromConfig(config: AirdropConfig, code: Cell, workchain = 0) {
        const data = airdropConfigToCell(config);
        const init = { code, data };
        return new Airdrop(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendClaim(provider: ContractProvider, via: Sender, value: bigint, index: bigint, merkleProof: Cell) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x578230d4, 32)
                .storeUint(0, 64)
                .storeUint(index, 256)
                .storeRef(merkleProof)
                .endCell(),
        });
    }
}
