import { Blockchain, SandboxContract, TreasuryContract, printTransactionFees } from '@ton/sandbox';
import { Cell, Dictionary, beginCell, toNano } from '@ton/core';
import { Airdrop, AirdropEntry } from '../wrappers/Airdrop';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { JettonMinter } from '../wrappers/JettonMinter';
import { JettonWallet } from '../wrappers/JettonWallet';

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

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        users = await blockchain.createWallets(1000);

        dictionary = Dictionary.empty(Dictionary.Keys.BigUint(256), {
            serialize: (src, buidler) => {
                buidler.storeAddress(src.address).storeCoins(src.amount);
            },
            parse: (src) => {
                return {
                    address: src.loadAddress(),
                    amount: src.loadCoins(),
                };
            },
        });

        for (let i = 0n; i < 1000; i++) {
            dictionary.set(i, {
                address: users[parseInt(i.toString())].address,
                amount: BigInt(Math.floor(Math.random() * 1e9)),
            });
        }

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
        const result = await airdrop.sendClaim(users[1].getSender(), toNano('0.15'), 1n, merkleProof);
        expect(result.transactions).toHaveTransaction({
            on: airdrop.address,
            success: true,
        });
        expect(
            await blockchain
                .openContract(JettonWallet.createFromAddress(await jettonMinter.getWalletAddressOf(users[1].address)))
                .getJettonBalance()
        ).toEqual(dictionary.get(1n)?.amount);
    });

    it('should claim many times', async () => {
        for (let i = 0; i < 1000; i += Math.floor(Math.random() * 50)) {
            const merkleProof = dictionary.generateMerkleProof(BigInt(i));
            const result = await airdrop.sendClaim(users[i].getSender(), toNano('0.15'), BigInt(i), merkleProof);
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
        }
    });

    it('should not claim if already did', async () => {
        const merkleProof = dictionary.generateMerkleProof(1n);

        {
            const result = await airdrop.sendClaim(users[1].getSender(), toNano('0.15'), 1n, merkleProof);
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
        }

        {
            const result = await airdrop.sendClaim(users[1].getSender(), toNano('0.15'), 1n, merkleProof);
            expect(result.transactions).toHaveTransaction({
                on: airdrop.address,
                success: true,
            });
            expect(result.transactions).toHaveTransaction({
                exitCode: 702,
            });
            expect(
                await blockchain
                    .openContract(
                        JettonWallet.createFromAddress(await jettonMinter.getWalletAddressOf(users[1].address))
                    )
                    .getJettonBalance()
            ).toEqual(dictionary.get(1n)?.amount);
        }

        {
            const result = await airdrop.sendClaim(users[1].getSender(), toNano('0.15'), 1n, merkleProof);
            expect(result.transactions).toHaveTransaction({
                on: airdrop.address,
                success: true,
            });
            expect(result.transactions).toHaveTransaction({
                exitCode: 702,
            });
            expect(
                await blockchain
                    .openContract(
                        JettonWallet.createFromAddress(await jettonMinter.getWalletAddressOf(users[1].address))
                    )
                    .getJettonBalance()
            ).toEqual(dictionary.get(1n)?.amount);
        }
    });
});
