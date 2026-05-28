export class DuplicateProvider extends Error {
    constructor(providerId: string) {
        super(
            `Duplicate provider id "${providerId}" — each provider must have a unique providerId`,
        );
    }
}
