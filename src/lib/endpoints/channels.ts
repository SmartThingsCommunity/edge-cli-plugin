import { Endpoint, EndpointClient, EndpointClientConfig, HttpClientParams } from '@smartthings/core-sdk'


export interface ChannelBase {
	name: string
	description: string
	termsOfServiceUrl: string
}

export interface ChannelCreate extends ChannelBase {
	type?: 'DRIVER'
}

export interface Channel extends ChannelCreate {
	channelId: string
	createdDate: string
	lastModifiedDate: string
}

export type ChannelUpdate = ChannelCreate

export interface ListOptions {
	type?: 'HUB'
	subscriberId?: string
}

export interface DriverChannelDetails {
	channelId: string
	driverId: string
	version: string
	createdDate: string
	lastModifiedDate: string
}

export interface DriverChannelMetaInfo {
	driverId: string
	name: string
	version: string
}

export class ChannelsEndpoint extends Endpoint {
	constructor(config: EndpointClientConfig) {
		super(new EndpointClient('distchannels', {
			...config,
			headers: { ...config.headers, Accept: 'application/vnd.smartthings+json;v=20200810' },
		}))
	}

	public async create(data: ChannelCreate): Promise<Channel> {
		return this.client.post('', data)
	}

	public async delete(id: string): Promise<void> {
		return this.client.delete(id)
	}

	public async update(id: string, data: ChannelUpdate): Promise<Channel> {
		return this.client.put(id, data)
	}

	public async get(id: string): Promise<Channel> {
		return this.client.get(id, undefined)
	}

	public async getDriverChannelMetaInfo(channelId: string, driverId: string): Promise<DriverChannelMetaInfo> {
		return this.client.get(`${channelId}/drivers/${driverId}/meta`)
	}

	public async list(options: ListOptions = {}): Promise<Channel[]> {
		const params: HttpClientParams = {}
		if (options.type) {
			params.type = options.type
		}
		if (options.subscriberId) {
			params.subscriberId = options.subscriberId
		}
		return this.client.getPagedItems('', params)
	}

	public async listAssignedDrivers(channelId: string): Promise<DriverChannelDetails[]> {
		return this.client.getPagedItems(`${channelId}/drivers`)
	}

	/**
	 * Assign or publish a driver to a channel.
	 *
	 * NOTE: This method works as an update as well.
	 */
	public async assignDriver(channelId: string, driverId: string, version: string): Promise<DriverChannelDetails> {
		return this.client.post(`${channelId}/drivers`, { driverId, version })
	}

	public async unassignDriver(channelId: string, driverId: string): Promise<void> {
		await this.client.delete(`${channelId}/drivers/${driverId}`)
	}

	public async enrollHub(channelId: string, hubId: string): Promise<void> {
		await this.client.post(`${channelId}/hubs/${hubId}`)
	}

	public async unenrollHub(channelId: string, hubId: string): Promise<void> {
		await this.client.delete(`${channelId}/hubs/${hubId}`)
	}
}
