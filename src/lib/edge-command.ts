import { BearerTokenAuthenticator } from '@smartthings/core-sdk'

import { APIOrganizationCommand, LoginAuthenticator, logManager } from '@smartthings/cli-lib'

import { EdgeClient } from './edge-client'


const ORGANIZATION_HEADER = 'X-ST-Organization'

export abstract class EdgeCommand extends APIOrganizationCommand {

	static flags = APIOrganizationCommand.flags

	private _edgeClient?: EdgeClient

	get edgeClient(): EdgeClient {
		if (this._edgeClient) {
			return this._edgeClient
		}
		throw new Error('EdgeCommand not initialized properly')
	}

	defaultChannelId?: string
	defaultHubId?: string

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async setup(args: { [name: string]: any }, argv: string[], flags: { [name: string]: any }): Promise<void> {
		await super.setup(args, argv, flags)

		const authenticator = this.token
			? new BearerTokenAuthenticator(this.token)
			: new LoginAuthenticator(this.profileName, this.clientIdProvider)

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const headers: { [name: string]: any } = {}

		if (flags.organization) {
			headers[ORGANIZATION_HEADER] = flags.organization
		} else if ('organization' in this.profileConfig) {
			headers[ORGANIZATION_HEADER] = this.profileConfig.organization
		}

		const logger = logManager.getLogger('rest-client')
		this._edgeClient = new EdgeClient(authenticator,
			{ urlProvider: this.clientIdProvider, logger, headers })

		this.defaultChannelId = this.stringConfigValue('defaultChannel')
		this.defaultHubId = this.stringConfigValue('defaultHub')
	}
}
