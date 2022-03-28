import { APIOrganizationCommand, logManager } from '@smartthings/cli-lib'

import { EdgeClient } from './edge-client'


export abstract class EdgeCommand extends APIOrganizationCommand {

	static flags = APIOrganizationCommand.flags

	private _edgeClient?: EdgeClient

	get edgeClient(): EdgeClient {
		if (this._edgeClient) {
			return this._edgeClient
		}
		throw new Error('EdgeCommand not initialized properly')
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async setup(args: { [name: string]: any }, argv: string[], flags: { [name: string]: any }): Promise<void> {
		await super.setup(args, argv, flags)

		const logger = logManager.getLogger('rest-client')
		this._edgeClient = new EdgeClient(this.authenticator,
			{ urlProvider: this.clientIdProvider, logger, headers: this.headers })
	}
}
