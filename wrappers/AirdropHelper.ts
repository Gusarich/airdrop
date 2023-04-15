import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from 'ton-core';

export type AirdropHelperConfig = {};

export function airdropHelperConfigToCell(config: AirdropHelperConfig): Cell {
    return beginCell().endCell();
}

export class AirdropHelper implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new AirdropHelper(address);
    }

    static createFromConfig(config: AirdropHelperConfig, code: Cell, workchain = 0) {
        const data = airdropHelperConfigToCell(config);
        const init = { code, data };
        return new AirdropHelper(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
