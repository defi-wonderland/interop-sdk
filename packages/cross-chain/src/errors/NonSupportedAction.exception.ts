export class NonSupportedAction extends Error {
    constructor(action: string) {
        super(`Non-supported action: ${action}`);
    }
}
