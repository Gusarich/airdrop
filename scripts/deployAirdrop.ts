import { Address, beginCell, toNano } from '@ton/core';
import { Airdrop, AirdropEntry, generateEntriesDictionary } from '../wrappers/Airdrop';
import { compile, NetworkProvider } from '@ton/blueprint';
import { JettonMinter } from '../wrappers/JettonMinter';

export async function run(provider: NetworkProvider) {
    const entries: AirdropEntry[] = [
        {
            address: Address.parse('EQBKgXCNLPexWhs2L79kiARR1phGH1LwXxRbNsCFF9doc2lN'),
            amount: toNano('1'),
        },
        {
            address: Address.parse('EQBIhPuWmjT7fP-VomuTWseE8JNWv2q7QYfsVQ1IZwnMk8wL'),
            amount: toNano('2'),
        },
        {
            address: Address.parse('EQB4cwGljhouzFwc6EHpCacCtsK7_XIj-tNfM5udgW6IxO9R'),
            amount: toNano('1.5'),
        },
    ];

    const dict = generateEntriesDictionary(entries);
    const dictCell = beginCell().storeDictDirect(dict).endCell();
    console.log(`Dictionary cell (store it somewhere on your backend: ${dictCell.toBoc().toString('base64')}`);
    const merkleRoot = BigInt('0x' + dictCell.hash().toString('hex'));

    const jettonMinterAddress = Address.parse('EQD0vdSA_NedR9uvbgN9EikRX-suesDxGeFg69XQMavfLqIw');
    const jettonMinter = provider.open(JettonMinter.createFromAddress(jettonMinterAddress));

    const airdrop = provider.open(
        Airdrop.createFromConfig(
            {
                merkleRoot,
                helperCode: await compile('AirdropHelper'),
            },
            await compile('Airdrop')
        )
    );

    await airdrop.sendDeploy(provider.sender(), toNano('0.05'), await jettonMinter.getWalletAddressOf(airdrop.address));

    await provider.waitForDeploy(airdrop.address);

    // run methods on `airdrop`
}
