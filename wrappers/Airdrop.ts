import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type AirdropConfig = {
    jettonWallet: Address;
    merkleRoot: bigint;
    helperCode: Cell;
};

export function airdropConfigToCell(config: AirdropConfig): Cell {
    return beginCell()
        .storeAddress(config.jettonWallet)
        .storeUint(config.merkleRoot, 256)
        .storeRef(config.helperCode)
        .endCell();
}

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

    async sendClaim(provider: ContractProvider, via: Sender, value: bigint, merkleProof: Cell) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(0x65d88d5f, 32).storeUint(0, 64).storeRef(merkleProof).endCell(),
        });
    }
}
