import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, toNano } from '@ton/core';
import { AirdropEntry } from './Airdrop';

export type AirdropHelperConfig = {
    airdrop: Address;
    index: bigint;
    proof: Cell;
    entry: AirdropEntry;
};

export function airdropHelperConfigToCell(config: AirdropHelperConfig): Cell {
    return beginCell()
        .storeBit(false)
        .storeAddress(config.airdrop)
        .storeUint(config.index, 256)
        .storeRef(config.proof)
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

    async sendDeploy(provider: ContractProvider, via: Sender) {
        await provider.internal(via, {
            value: toNano('0.15'),
        });
    }

    async sendClaim(provider: ContractProvider, queryId: bigint) {
        await provider.external(beginCell().storeUint(queryId, 64).endCell());
    }

    async getClaimed(provider: ContractProvider): Promise<boolean> {
        if ((await provider.getState()).state.type == 'uninit') {
            return false;
        }
        const stack = (await provider.get('get_claimed', [])).stack;
        return stack.readBoolean();
    }
}
