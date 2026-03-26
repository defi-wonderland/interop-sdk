export class ProviderNotFound extends Error {
    constructor(providerName: string) {
        super(`Provider ${providerName} not found`);
    }
}
