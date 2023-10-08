import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider } from '@ton/core';
import { AirdropEntry } from './Airdrop';

export type AirdropHelperConfig = {
    airdrop: Address;
    entry: AirdropEntry;
};

export function airdropHelperConfigToCell(config: AirdropHelperConfig): Cell {
    return beginCell()
        .storeBit(false)
        .storeAddress(config.airdrop)
        .storeAddress(config.entry.address)
        .storeCoins(config.entry.amount)
        .endCell();
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

    async getClaimed(provider: ContractProvider): Promise<boolean> {
        const stack = (await provider.get('get_claimed', [])).stack;
        return stack.readBoolean();
    }
}
