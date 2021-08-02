import { Endpoint, EndpointClient, EndpointClientConfig } from '@smartthings/core-sdk'


export interface EnrolledChannel {
	channelId: string
	name: string
	description?: string
	createdDate?: string
	lastModifiedDate?: string
	subscriptionUrl?: string
}

export interface InstalledDriver {
	driverId: string
	name: string
	description?: string
	version: string
	channelId: string
	developer: string
	vendorSupportInformation: string
	// TODO: research if we can be more specific with this type
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	permissions: { [name: string]: any }
}

export class HubsEndpoint extends Endpoint {
	constructor(config: EndpointClientConfig) {
		super(new EndpointClient('hubdevices', config))
	}

	/**
	 * Install the specified drivers into the specified hub in the specified location.
	 */
	public async installDriver(driverId: string, hubId: string, channelId: string): Promise<void> {
		return this.client.put(`${hubId}/drivers/${driverId}`, { channelId })
	}

	public async uninstallDriver(driverId: string, hubId: string): Promise<void> {
		return this.client.delete(`${hubId}/drivers/${driverId}`)
	}

	public async listInstalled(hubId: string): Promise<InstalledDriver[]> {
		return this.client.get(`${hubId}/drivers`)
	}

	public async getInstalled(hubId: string, driverId: string): Promise<InstalledDriver> {
		const opts = { headerOverrides: { Accept: 'application/vnd.smartthings;v=20190819' } }
		return this.client.get(`${hubId}}/drivers/${driverId}`, undefined, opts)
	}

	public async enrolledChannels(hubId: string): Promise<EnrolledChannel[]> {
		return this.client.get(`${hubId}/channels`, { channelType: 'DRIVERS' })
	}
}
