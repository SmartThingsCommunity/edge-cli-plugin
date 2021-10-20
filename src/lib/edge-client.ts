import { Authenticator, RESTClient, RESTClientConfig } from '@smartthings/core-sdk'

import { ChannelsEndpoint } from './endpoints/channels'
import { DriversEndpoint } from './endpoints/drivers'
import { HubsEndpoint } from './endpoints/hubs'
import { InvitesEndpoint } from './endpoints/invites'
import { HttpClientHeaders } from '@smartthings/core-sdk'


export class EdgeClient extends RESTClient {
	public readonly drivers: DriversEndpoint
	public readonly hubs: HubsEndpoint
	public readonly channels: ChannelsEndpoint
	public readonly invites: InvitesEndpoint

	constructor(authenticator: Authenticator, config?: RESTClientConfig) {
		super(authenticator, config)

		this.drivers = new DriversEndpoint(this.config)
		this.hubs = new HubsEndpoint(this.config)
		this.channels = new ChannelsEndpoint(this.config)
		this.invites = new InvitesEndpoint(this.config)
	}

	public cloneEdge(headers?: HttpClientHeaders): EdgeClient {
		return new EdgeClient(this.config.authenticator, {...this.config, headers})
	}
}
