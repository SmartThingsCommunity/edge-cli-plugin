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

	/**
	 * Change the driver for a device to the one specified by driverId.
	 */
	public async switchDriver(driverId: string, hubId: string, deviceId: string): Promise<void> {
		return this.client.patch(`${hubId}/childdevice/${deviceId}`, { driverId })
	}

	public async uninstallDriver(driverId: string, hubId: string): Promise<void> {
		return this.client.delete(`${hubId}/drivers/${driverId}`)
	}

	/**
	 * List drivers installed on the hub.
	 *
	 * @param deviceId When included, limit the drivers to those marked as matching the specified device.
	 */
	public async listInstalled(hubId: string, deviceId?: string): Promise<InstalledDriver[]> {
		const params = deviceId ? { deviceId } : undefined
		return this.client.get(`${hubId}/drivers`, params)
	}

	public async getInstalled(hubId: string, driverId: string): Promise<InstalledDriver> {
		return this.client.get(`${hubId}/drivers/${driverId}`)
	}

	public async enrolledChannels(hubId: string): Promise<EnrolledChannel[]> {
		return this.client.get(`${hubId}/channels`, { channelType: 'DRIVERS' })
	}
}
