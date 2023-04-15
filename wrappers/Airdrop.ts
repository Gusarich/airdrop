import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from 'ton-core';

export type AirdropConfig = {};

export function airdropConfigToCell(config: AirdropConfig): Cell {
    return beginCell().endCell();
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
}
