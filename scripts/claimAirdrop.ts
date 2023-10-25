import { Address, Cell, Dictionary, toNano } from '@ton/core';
import { Airdrop, airdropEntryValue } from '../wrappers/Airdrop';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    // suppose that you have the cell in base64 form stored somewhere
    const dictCell = Cell.fromBase64(
        'te6cckEBBQEAhgACA8/oAgEATUgA8OYDSxw0XZi4OdCD0hNOBW2Fd/rkR/Wmvmc3OwLdEYiLLQXgEAIBIAQDAE0gAkQn3LTRp9vn/K0TXJrWPCeEmrX7VdoMP2KoakM4TmSaO5rKAEAATSACVAuEaWe9itDZsX37JEAijrTCMPqXgvii2bYEKL67Q5odzWUAQC6Eo5U='
    );
    const dict = dictCell.beginParse().loadDictDirect(Dictionary.Keys.BigUint(256), airdropEntryValue);

    const airdrop = provider.open(
        Airdrop.createFromAddress(Address.parse('EQDbmFBVdzH06IsSIz7jriXHUWnce3ssCNNdcdYwR1u-_FzL'))
    );

    await airdrop.sendClaim(provider.sender(), toNano('0.15'), 1n, dict.generateMerkleProof(1n));
}
