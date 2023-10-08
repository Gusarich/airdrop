import { Address, beginCell, toNano } from '@ton/core';
import { Airdrop, AirdropEntry, generateEntriesDictionary } from '../wrappers/Airdrop';
import { compile, NetworkProvider } from '@ton/blueprint';
import { JettonMinter } from '../wrappers/JettonMinter';

export async function run(provider: NetworkProvider) {
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

    const jettonMinterAddress = Address.parse('EQAqPr4f-D4ke-BEJ-WxQ1Yn9FP6h9n0Hft3AbUcLofNn7j2');
    const jettonMinter = provider.open(JettonMinter.createFromAddress(jettonMinterAddress));

    const airdrop = provider.open(
        Airdrop.createFromConfig(
            {
                jettonMinter: jettonMinterAddress,
                jettonWalletCode: await jettonMinter.getWalletCode(),
                merkleRoot,
                helperCode: await compile('AirdropHelper'),
            },
            await compile('Airdrop')
        )
    );

    await airdrop.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(airdrop.address);

    // run methods on `airdrop`
}
