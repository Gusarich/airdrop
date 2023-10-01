import { Address, Cell, toNano } from '@ton/core';
import { Airdrop, airdropEntryValue } from '../wrappers/Airdrop';
import { NetworkProvider } from '@ton/blueprint';
import { Dictionary } from '@ton/core/src';

export async function run(provider: NetworkProvider) {
    // suppose that you have the cell in base64 form stored somewhere
    const dictCell = Cell.fromBase64('te6ccgEBAQEABgAACCiAmgEBAQEABgAAgKIBAQEBAQAGAAAIogEBAQ');
    const dict = dictCell.beginParse().loadDictDirect(Dictionary.Keys.BigUint(256), airdropEntryValue);

    const airdrop = provider.open(
        Airdrop.createFromAddress(Address.parse('EQB4cwGljhouzFwc6EHpCacCtsK7_XIj-tNfM5udgW6IxO9R'))
    );

    await airdrop.sendClaim(provider.sender(), toNano('0.15'), 123n, dict.generateMerkleProof(123n));
}
