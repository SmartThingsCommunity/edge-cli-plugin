import { Authenticator, RESTClient, RESTClientConfig } from '@smartthings/core-sdk'

import { HubsEndpoint } from './endpoints/hubs'
import { InvitesEndpoint } from './endpoints/invites'
import { HttpClientHeaders } from '@smartthings/core-sdk'


export class EdgeClient extends RESTClient {
	public readonly hubs: HubsEndpoint
	public readonly invites: InvitesEndpoint

	constructor(authenticator: Authenticator, config?: RESTClientConfig) {
		super(authenticator, config)

		this.hubs = new HubsEndpoint(this.config)
		this.invites = new InvitesEndpoint(this.config)
	}

	public cloneEdge(headers?: HttpClientHeaders): EdgeClient {
		return new EdgeClient(this.config.authenticator, {...this.config, headers})
	}
}
