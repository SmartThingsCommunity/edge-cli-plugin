import { Endpoint, EndpointClient, EndpointClientConfig } from '@smartthings/core-sdk'


export interface EdgeDeviceIntegrationProfile {
	id: string
	majorVersion: string
}

interface EdgeZigbeeManufacturerFingerprint {
	/**
	 * Reported manufacturer of the device
	 */
	manufacturer?: string // 0-32 characters

	/**
	 * Reported model of the device
	 */
	model?: string // 0-32 characters
}

interface EdgeZWaveManufacturerFingerprint {
	/**
	 * 16-bit manufacturer identifier assigned by the Z-Wave Specification
	 */
	manufacturerId?: number // integer 0 - 65535

	/**
	 * 16-bit manufacturer defined product identifier
	 */
	productId?: number // integer 0 - 65535

	/**
	 * 16-bit manufacturer defined product type
	 */
	productType: number // integer 0 - 65535
}

export interface EdgeDriverFingerprint {
	id: string // string <^[a-zA-Z0-9 _/\\\-()\\[\\]{}\.]{1,36}$> (FingerprintId)
	type: 'ZIGBEE_MANUFACTURER' | 'DTH' | 'ZWAVE_MANUFACTURER'

	/**
	 * Label assigned to device at join time. If this is not set the driver name is used.
	 */
	deviceLabel?: string // string <^[a-zA-Z0-9 _\/\\-()\[\]{}\.]{1,50}$>

	zigbeeManufacturer?: EdgeZigbeeManufacturerFingerprint
	zwaveManufacturer?: EdgeZWaveManufacturerFingerprint
}

export interface EdgeDriverSummary {
	driverId: string // <^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$> (DriverId)

	name: string // <^[a-zA-Z0-9 _\/\-()\[\]{}.]{1,50}$> (LuaDriverName)

	/**
	 * A user-scoped package key used to look up the respective driver record.
	 */
	packageKey: string // <^[a-zA-Z0-9 _/\\-()\\[\\]{}.]{1,36}$> (PackageKey)

	version: string
}
export interface EdgeDriver extends EdgeDriverSummary {
	fingerprints?: EdgeDriverFingerprint[]
}

const requestOpts = { headerOverrides: { Accept: 'application/vnd.smartthings;v=20200810' } }
export class DriversEndpoint extends Endpoint {
	constructor(config: EndpointClientConfig) {
		super(new EndpointClient('drivers', config))
	}

	public async get(id: string): Promise<EdgeDriver> {
		return this.client.request('get', id, undefined, undefined, requestOpts)
	}

	public async getRevision(id: string, version: string): Promise<EdgeDriver> {
		return this.client.request('get', `${id}/versions/${version}`, undefined, undefined, requestOpts)
	}

	public async delete(id: string): Promise<void> {
		return this.client.delete(id)
	}

	public async list(): Promise<EdgeDriverSummary[]> {
		return this.client.getPagedItems('', undefined, requestOpts)
	}

	/**
	 * Uploads the zipped package represented by archiveData.
	 */
	public async upload(archiveData: Uint8Array): Promise<EdgeDriver> {
		return this.client.request('post', 'package', archiveData, undefined,
			{ headerOverrides: { 'Content-Type': 'application/zip', ...requestOpts.headerOverrides } })
	}
}
