import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, Dictionary, beginCell, toNano } from '@ton/core';
import { Airdrop, AirdropEntry, generateEntriesDictionary } from '../wrappers/Airdrop';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { JettonMinter } from '../wrappers/JettonMinter';
import { JettonWallet } from '../wrappers/JettonWallet';
import { AirdropHelper } from '../wrappers/AirdropHelper';

describe('Airdrop', () => {
    let code: Cell;
    let codeHelper: Cell;
    let codeJettonMinter: Cell;
    let codeJettonWallet: Cell;

    beforeAll(async () => {
        code = await compile('Airdrop');
        codeHelper = await compile('AirdropHelper');
        codeJettonMinter = await compile('JettonMinter');
        codeJettonWallet = await compile('JettonWallet');
    });

    let blockchain: Blockchain;
    let airdrop: SandboxContract<Airdrop>;
    let dictionary: Dictionary<bigint, AirdropEntry>;
    let dictCell: Cell;
    let users: SandboxContract<TreasuryContract>[];
    let jettonMinter: SandboxContract<JettonMinter>;
    let entries: AirdropEntry[];

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        users = await blockchain.createWallets(1000);

        entries = [];
        for (let i = 0; i < 1000; i++) {
            entries.push({
                address: users[parseInt(i.toString())].address,
                amount: BigInt(Math.floor(Math.random() * 1e9)),
            });
        }
        dictionary = generateEntriesDictionary(entries);

        dictCell = beginCell().storeDictDirect(dictionary).endCell();

        jettonMinter = blockchain.openContract(
            JettonMinter.createFromConfig(
                {
                    walletCode: codeJettonWallet,
                    admin: users[0].address,
                    content: Cell.EMPTY,
                },
                codeJettonMinter
            )
        );

        await jettonMinter.sendDeploy(users[0].getSender(), toNano('0.05'));

        airdrop = blockchain.openContract(
            Airdrop.createFromConfig(
                {
                    helperCode: codeHelper,
                    jettonMinter: jettonMinter.address,
                    jettonWalletCode: codeJettonWallet,
                    merkleRoot: BigInt('0x' + dictCell.hash().toString('hex')),
                },
                code
            )
        );

        const deployResult = await airdrop.sendDeploy(users[0].getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: users[0].address,
            to: airdrop.address,
            deploy: true,
            success: true,
        });

        await jettonMinter.sendMint(
            users[0].getSender(),
            toNano('0.05'),
            toNano('0.01'),
            airdrop.address,
            toNano('1000000')
        );
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and airdrop are ready to use
    });

    it('should claim one time', async () => {
        const merkleProof = dictionary.generateMerkleProof(1n);
        const helper = blockchain.openContract(
            AirdropHelper.createFromConfig(
                {
                    airdrop: airdrop.address,
                    index: 1n,
                    proofHash: merkleProof.hash(),
                    entry: entries[1],
                },
                codeHelper
            )
        );
        await helper.sendDeploy(users[1].getSender());
        const result = await helper.sendClaim(123n, merkleProof);
        expect(result.transactions).toHaveTransaction({
            on: airdrop.address,
            success: true,
        });
        expect(
            await blockchain
                .openContract(JettonWallet.createFromAddress(await jettonMinter.getWalletAddressOf(users[1].address)))
                .getJettonBalance()
        ).toEqual(dictionary.get(1n)?.amount);
        expect(await helper.getClaimed()).toBeTruthy();
    });

    it('should claim many times', async () => {
        for (let i = 0; i < 1000; i += 1 + Math.floor(Math.random() * 25)) {
            const merkleProof = dictionary.generateMerkleProof(BigInt(i));
            const helper = blockchain.openContract(
                AirdropHelper.createFromConfig(
                    {
                        airdrop: airdrop.address,
                        index: BigInt(i),
                        proofHash: merkleProof.hash(),
                        entry: entries[i],
                    },
                    codeHelper
                )
            );
            await helper.sendDeploy(users[i].getSender());
            const result = await helper.sendClaim(123n, merkleProof);
            expect(result.transactions).toHaveTransaction({
                on: airdrop.address,
                success: true,
            });
            expect(
                await blockchain
                    .openContract(
                        JettonWallet.createFromAddress(await jettonMinter.getWalletAddressOf(users[i].address))
                    )
                    .getJettonBalance()
            ).toEqual(dictionary.get(BigInt(i))?.amount);
            expect(await helper.getClaimed()).toBeTruthy();
        }
    });

    it('should not claim if already did', async () => {
        const merkleProof = dictionary.generateMerkleProof(1n);

        const helper = blockchain.openContract(
            AirdropHelper.createFromConfig(
                {
                    airdrop: airdrop.address,
                    index: 1n,
                    proofHash: merkleProof.hash(),
                    entry: entries[1],
                },
                codeHelper
            )
        );
        await helper.sendDeploy(users[1].getSender());

        {
            const result = await helper.sendClaim(123n, merkleProof);
            expect(result.transactions).toHaveTransaction({
                on: airdrop.address,
                success: true,
            });
            expect(
                await blockchain
                    .openContract(
                        JettonWallet.createFromAddress(await jettonMinter.getWalletAddressOf(users[1].address))
                    )
                    .getJettonBalance()
            ).toEqual(dictionary.get(1n)?.amount);
            expect(await helper.getClaimed()).toBeTruthy();
        }

        {
            await expect(helper.sendClaim(123n, merkleProof)).rejects.toThrow();
            expect(
                await blockchain
                    .openContract(
                        JettonWallet.createFromAddress(await jettonMinter.getWalletAddressOf(users[1].address))
                    )
                    .getJettonBalance()
            ).toEqual(dictionary.get(1n)?.amount);
            expect(await helper.getClaimed()).toBeTruthy();
        }

        {
            await expect(helper.sendClaim(123n, merkleProof)).rejects.toThrow();
            expect(
                await blockchain
                    .openContract(
                        JettonWallet.createFromAddress(await jettonMinter.getWalletAddressOf(users[1].address))
                    )
                    .getJettonBalance()
            ).toEqual(dictionary.get(1n)?.amount);
            expect(await helper.getClaimed()).toBeTruthy();
        }
    });

    it('should not claim with wrong index', async () => {
        {
            const merkleProof = dictionary.generateMerkleProof(2n);
            const helper = blockchain.openContract(
                AirdropHelper.createFromConfig(
                    {
                        airdrop: airdrop.address,
                        index: 1n,
                        proofHash: merkleProof.hash(),
                        entry: entries[1],
                    },
                    codeHelper
                )
            );
            await helper.sendDeploy(users[1].getSender());
            const result = await helper.sendClaim(123n, merkleProof);
            expect(result.transactions).toHaveTransaction({
                from: helper.address,
                to: airdrop.address,
                success: false,
            });
            expect(
                await blockchain
                    .openContract(
                        JettonWallet.createFromAddress(await jettonMinter.getWalletAddressOf(users[1].address))
                    )
                    .getJettonBalance()
            ).toEqual(0n);
        }

        {
            const merkleProof = dictionary.generateMerkleProof(1n);
            const helper = blockchain.openContract(
                AirdropHelper.createFromConfig(
                    {
                        airdrop: airdrop.address,
                        index: 1n,
                        proofHash: merkleProof.hash(),
                        entry: entries[1],
                    },
                    codeHelper
                )
            );
            await helper.sendDeploy(users[1].getSender());
            const result = await helper.sendClaim(123n, merkleProof);
            expect(result.transactions).toHaveTransaction({
                from: helper.address,
                to: airdrop.address,
                success: true,
            });
            expect(
                await blockchain
                    .openContract(
                        JettonWallet.createFromAddress(await jettonMinter.getWalletAddressOf(users[1].address))
                    )
                    .getJettonBalance()
            ).toEqual(dictionary.get(1n)?.amount);
            expect(await helper.getClaimed()).toBeTruthy();
        }
    });
});
