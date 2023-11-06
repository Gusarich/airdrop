import {
    Dictionary,
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
    Builder,
    Slice,
} from '@ton/core';

export type AirdropConfig = {
    merkleRoot: bigint;
    helperCode: Cell;
};

export function airdropConfigToCell(config: AirdropConfig): Cell {
    return beginCell()
        .storeUint(0, 2)
        .storeUint(config.merkleRoot, 256)
        .storeRef(config.helperCode)
        .storeUint(Math.floor(Math.random() * 1e9), 64)
        .endCell();
}

export type AirdropEntry = {
    address: Address;
    amount: bigint;
};

export const airdropEntryValue = {
    serialize: (src: AirdropEntry, buidler: Builder) => {
        buidler.storeAddress(src.address).storeCoins(src.amount);
    },
    parse: (src: Slice) => {
        return {
            address: src.loadAddress(),
            amount: src.loadCoins(),
        };
    },
};

export function generateEntriesDictionary(entries: AirdropEntry[]): Dictionary<bigint, AirdropEntry> {
    let dict: Dictionary<bigint, AirdropEntry> = Dictionary.empty(Dictionary.Keys.BigUint(256), airdropEntryValue);

    for (let i = 0; i < entries.length; i++) {
        dict.set(BigInt(i), entries[i]);
    }

    return dict;
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

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint, jettonWallet: Address) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(0x610ca46c, 32).storeUint(0, 64).storeAddress(jettonWallet).endCell(),
        });
    }
}
