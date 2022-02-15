import { Flags } from '@oclif/core'

import { selectFromList } from '@smartthings/cli-lib'
import { chooseDriverFromChannel, chooseHub } from '../../../lib/commands/drivers-util'

import { EdgeCommand } from '../../../lib/edge-command'
import { EnrolledChannel } from '../../../lib/endpoints/hubs'


export default class DriversInstallCommand extends EdgeCommand {
	static description = 'install an edge driver onto a hub'

	static examples = [
		'smartthings edge:drivers:install                                         # use Q&A format to enter required values',
		'smartthings edge:drivers:install -H <hub-id>                             # specify the hub on the command line, other fields will be asked for',
		'smartthings edge:drivers:install -H <hub-id> -C <channel-id> <driver-id> # install a driver from a channel on an enrolled hub',
	]

	static flags = {
		...EdgeCommand.flags,
		hub: Flags.string({
			char: 'H',
			description: 'hub id',
		}),
		channel: Flags.string({
			char: 'C',
			description: 'channel id',
		}),
	}

	static args = [{
		name: 'driverId',
		description: 'id of driver to install',
	}]

	async chooseChannelFromEnrollments(hubId: string): Promise<string> {
		const config = {
			itemName: 'hub-enrolled channel',
			primaryKeyName: 'channelId',
			sortKeyName: 'name',
		}
		const listChannels = (): Promise<EnrolledChannel[]> =>
			this.edgeClient.hubs.enrolledChannels(hubId)
		return selectFromList(this, config, this.defaultChannelId, listChannels,
			'Select a channel to install the driver from.')
	}

	async run(): Promise<void> {
		const { args, argv, flags } = await this.parse(DriversInstallCommand)
		await super.setup(args, argv, flags)

		const hubId = await chooseHub(this, 'Select a hub to install to.', flags.hub,
			this.defaultHubId)
		const channelId = flags.channel ?? await this.chooseChannelFromEnrollments(hubId)
		const driverId = await chooseDriverFromChannel(this, channelId, args.driverId)
		await this.edgeClient.hubs.installDriver(driverId, hubId, channelId)
		this.log(`driver ${driverId} installed to hub ${hubId}`)
	}
}
