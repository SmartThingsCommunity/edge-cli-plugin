import fs from 'fs'

import { Errors } from '@oclif/core'
import JSZip from 'jszip'
import picomatch from 'picomatch'

import * as fileUtil from '../../../../../src/lib/file-util'
import { buildTestFileMatchers, processConfigFile, processFingerprintsFile, processProfiles,
	processSrcDir, resolveProjectDirName } from '../../../../../src/lib/commands/drivers/package-util'


jest.mock('fs')
jest.mock('js-yaml')
jest.mock('picomatch')

describe('package-utils', () => {
	const readdirSyncMock = fs.readdirSync as unknown as jest.Mock<string[], [fs.PathLike]>
	const readStreamMock: fs.ReadStream = {} as fs.ReadStream
	const createReadStreamMock = jest.mocked(fs.createReadStream)

	const isFileSpy = jest.spyOn(fileUtil, 'isFile')
	const isDirSpy = jest.spyOn(fileUtil, 'isDir')
	const findYAMLFilenameSpy = jest.spyOn(fileUtil, 'findYAMLFilename')
	const requireDirSpy = jest.spyOn(fileUtil, 'requireDir')
	const readYAMLFileSpy = jest.spyOn(fileUtil, 'readYAMLFile')

	const zipFileMock = jest.fn()
	const zipMock = {
		file: zipFileMock,
	} as unknown as JSZip

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('resolveProjectDirName', () => {
		it('returns directory from arg if it exists', () => {
			isDirSpy.mockReturnValue(true)

			expect(resolveProjectDirName('my-project-dir')).toBe('my-project-dir')

			expect(isDirSpy).toHaveBeenCalledTimes(1)
			expect(isDirSpy).toHaveBeenCalledWith('my-project-dir')
		})

		it('strips trailing slash', () => {
			isDirSpy.mockReturnValue(true)

			expect(resolveProjectDirName('my-project-dir/')).toBe('my-project-dir')

			expect(isDirSpy).toHaveBeenCalledTimes(1)
			expect(isDirSpy).toHaveBeenCalledWith('my-project-dir')
		})

		it('throws exception if directory does not exist', () => {
			isDirSpy.mockReturnValue(false)

			expect(() => resolveProjectDirName('my-bad-directory')).toThrow(Errors.CLIError)
		})
	})

	describe('processConfigFile', () => {
		it('returns parsed config yaml file data', () => {
			findYAMLFilenameSpy.mockReturnValueOnce('config.yaml filename')
			readYAMLFileSpy.mockReturnValueOnce({ yaml: 'file contents' })
			createReadStreamMock.mockReturnValueOnce(readStreamMock)

			expect(processConfigFile('my-project-dir', zipMock))
				.toEqual({ yaml: 'file contents' })

			expect(findYAMLFilenameSpy).toHaveBeenCalledTimes(1)
			expect(findYAMLFilenameSpy).toHaveBeenCalledWith('my-project-dir/config')
			expect(readYAMLFileSpy).toHaveBeenCalledTimes(1)
			expect(readYAMLFileSpy).toHaveBeenCalledWith('config.yaml filename')
			expect(createReadStreamMock).toHaveBeenCalledTimes(1)
			expect(createReadStreamMock).toHaveBeenCalledWith('config.yaml filename')
			expect(zipFileMock).toHaveBeenCalledTimes(1)
			expect(zipFileMock).toHaveBeenCalledWith('config.yml', readStreamMock)
		})

		it('throws error when config file is missing', () => {
			findYAMLFilenameSpy.mockReturnValueOnce(false)

			expect(() => processConfigFile('my-project-dir', zipMock))
				.toThrow(new Errors.CLIError('missing main config.yaml (or config.yml) file'))

			expect(findYAMLFilenameSpy).toHaveBeenCalledTimes(1)
			expect(findYAMLFilenameSpy).toHaveBeenCalledWith('my-project-dir/config')
			expect(readYAMLFileSpy).toHaveBeenCalledTimes(0)
			expect(zipFileMock).toHaveBeenCalledTimes(0)
		})
	})

	describe('processFingerprintsFile', () => {
		it('includes fingerprint file if found', () => {
			findYAMLFilenameSpy.mockReturnValueOnce('fingerprints filename')
			readYAMLFileSpy.mockReturnValueOnce({ yaml: 'file contents' })
			createReadStreamMock.mockReturnValueOnce(readStreamMock)

			processFingerprintsFile('project dir', zipMock)

			expect(findYAMLFilenameSpy).toHaveBeenCalledTimes(1)
			expect(findYAMLFilenameSpy).toHaveBeenCalledWith('project dir/fingerprints')
			expect(readYAMLFileSpy).toHaveBeenCalledTimes(1)
			expect(readYAMLFileSpy).toHaveBeenCalledWith('fingerprints filename')
			expect(createReadStreamMock).toHaveBeenCalledTimes(1)
			expect(createReadStreamMock).toHaveBeenCalledWith('fingerprints filename')
			expect(zipFileMock).toHaveBeenCalledTimes(1)
			expect(zipFileMock).toHaveBeenCalledWith('fingerprints.yml', readStreamMock)
		})

		it('skips fingerprint file if none', () => {
			findYAMLFilenameSpy.mockReturnValueOnce(false)

			processFingerprintsFile('project dir', zipMock)

			expect(findYAMLFilenameSpy).toHaveBeenCalledTimes(1)
			expect(findYAMLFilenameSpy).toHaveBeenCalledWith('project dir/fingerprints')
			expect(readYAMLFileSpy).toHaveBeenCalledTimes(0)
			expect(zipFileMock).toHaveBeenCalledTimes(0)
		})
	})

	describe('buildTestFileMatchers', () => {
		const picomatchMock = jest.mocked(picomatch)
		const matcher1 = (): boolean => true
		const matcher2 = (): boolean => false

		it('returns single match if config is a string', () => {
			picomatchMock.mockReturnValueOnce(matcher1)

			expect(buildTestFileMatchers('match string')).toEqual([matcher1])

			expect(picomatchMock).toHaveBeenCalledTimes(1)
			expect(picomatchMock).toHaveBeenCalledWith('match string')
		})

		it('returns array if config is an array', () => {
			picomatchMock.mockReturnValueOnce(matcher1)
			picomatchMock.mockReturnValueOnce(matcher2)

			expect(buildTestFileMatchers(['1', '2'])).toEqual([matcher1, matcher2])

			expect(picomatchMock).toHaveBeenCalledTimes(2)
			expect(picomatchMock).toHaveBeenCalledWith('1')
			expect(picomatchMock).toHaveBeenCalledWith('2')
		})

		it('returns preset value when no config specified', () => {
			picomatchMock.mockReturnValueOnce(matcher1)
			picomatchMock.mockReturnValueOnce(matcher2)

			expect(buildTestFileMatchers(undefined)).toEqual([matcher1, matcher2])

			expect(picomatchMock).toHaveBeenCalledTimes(2)
			expect(picomatchMock).toHaveBeenCalledWith('test/**')
			expect(picomatchMock).toHaveBeenCalledWith('tests/**')
		})
	})

	describe('processSrcDir', () => {
		createReadStreamMock.mockReturnValue(readStreamMock)

		it('throws error when there is no init.lua file', () => {
			requireDirSpy.mockReturnValueOnce('src dir')
			isFileSpy.mockReturnValueOnce(false)

			expect(() => processSrcDir('project dir', zipMock, [])).toThrow(Errors.CLIError)

			expect(requireDirSpy).toHaveBeenCalledTimes(1)
			expect(requireDirSpy).toHaveBeenCalledWith('project dir/src')
			expect(isFileSpy).toHaveBeenCalledTimes(1)
			expect(isFileSpy).toHaveBeenCalledWith('src dir/init.lua')
		})

		it('includes files at top level', () => {
			requireDirSpy.mockReturnValueOnce('src dir')
			isFileSpy.mockReturnValueOnce(true) // init.lua exists
			readdirSyncMock.mockReturnValueOnce(['init.lua'])
			isDirSpy.mockReturnValueOnce(false) // init.lua is not a directory

			expect(() => processSrcDir('project dir', zipMock, [])).not.toThrow()

			expect(requireDirSpy).toHaveBeenCalledTimes(1)
			expect(requireDirSpy).toHaveBeenCalledWith('project dir/src')
			expect(isFileSpy).toHaveBeenCalledTimes(1)
			expect(isFileSpy).toHaveBeenCalledWith('src dir/init.lua')
			expect(readdirSyncMock).toHaveBeenCalledTimes(1)
			expect(readdirSyncMock).toHaveBeenCalledWith('src dir')
			expect(isDirSpy).toHaveBeenCalledTimes(1)
			expect(isDirSpy).toHaveBeenCalledWith('src dir/init.lua')
			expect(zipFileMock).toHaveBeenCalledTimes(1)
			expect(zipFileMock).toHaveBeenCalledWith('src/init.lua', readStreamMock)
		})

		it('includes nested files', () => {
			requireDirSpy.mockReturnValueOnce('src dir')
			isFileSpy.mockReturnValueOnce(true) // init.lua exists
			readdirSyncMock.mockReturnValueOnce(['init.lua', 'subdirectory'])
			isDirSpy.mockReturnValueOnce(false) // init.lua is not a directory
			isDirSpy.mockReturnValueOnce(true) // subdirectory is a directory
			readdirSyncMock.mockReturnValueOnce(['lib.lua'])
			isDirSpy.mockReturnValueOnce(false) // lib.lua is not directory

			expect(() => processSrcDir('project dir', zipMock, [])).not.toThrow()

			expect(requireDirSpy).toHaveBeenCalledTimes(1)
			expect(requireDirSpy).toHaveBeenCalledWith('project dir/src')
			expect(isFileSpy).toHaveBeenCalledTimes(1)
			expect(isFileSpy).toHaveBeenCalledWith('src dir/init.lua')
			expect(readdirSyncMock).toHaveBeenCalledTimes(2)
			expect(readdirSyncMock).toHaveBeenCalledWith('src dir')
			expect(readdirSyncMock).toHaveBeenCalledWith('src dir/subdirectory')
			expect(isDirSpy).toHaveBeenCalledTimes(3)
			expect(isDirSpy).toHaveBeenCalledWith('src dir/init.lua')
			expect(isDirSpy).toHaveBeenCalledWith('src dir/subdirectory')
			expect(isDirSpy).toHaveBeenCalledWith('src dir/subdirectory/lib.lua')
			expect(zipFileMock).toHaveBeenCalledTimes(2)
			expect(zipFileMock).toHaveBeenCalledWith('src/init.lua', readStreamMock)
			expect(zipFileMock).toHaveBeenCalledWith('src/subdirectory/lib.lua', readStreamMock)
		})

		it('skips files that match test dir pattern', () => {
			requireDirSpy.mockReturnValueOnce('src dir')
			isFileSpy.mockReturnValueOnce(true) // init.lua exists
			readdirSyncMock.mockReturnValueOnce(['init.lua', 'test.lua'])
			isDirSpy.mockReturnValueOnce(false) // init.lua is not a directory
			isDirSpy.mockReturnValueOnce(false) // test.lua is not a directory
			const matcher = jest.fn()
				.mockReturnValueOnce(false) // init.lua is not a test file
				.mockReturnValueOnce(true) // test.lua is a test file

			expect(() => processSrcDir('project dir', zipMock, [matcher])).not.toThrow()

			expect(requireDirSpy).toHaveBeenCalledTimes(1)
			expect(requireDirSpy).toHaveBeenCalledWith('project dir/src')
			expect(isFileSpy).toHaveBeenCalledTimes(1)
			expect(isFileSpy).toHaveBeenCalledWith('src dir/init.lua')
			expect(readdirSyncMock).toHaveBeenCalledTimes(1)
			expect(readdirSyncMock).toHaveBeenCalledWith('src dir')
			expect(isDirSpy).toHaveBeenCalledTimes(2)
			expect(isDirSpy).toHaveBeenCalledWith('src dir/init.lua')
			expect(isDirSpy).toHaveBeenCalledWith('src dir/test.lua')
			expect(zipFileMock).toHaveBeenCalledTimes(1) // NOT 2! :-)
			expect(zipFileMock).toHaveBeenCalledWith('src/init.lua', readStreamMock)
		})

		it('throws error if nesting is too deep', () => {
			requireDirSpy.mockReturnValueOnce('src dir')
			isFileSpy.mockReturnValueOnce(true) // init.lua exists
			readdirSyncMock.mockReturnValueOnce(['init.lua', 'subdirectory'])
			isDirSpy.mockReturnValueOnce(false) // init.lua is not a directory
			// The services limit nesting to 10 but count both the main directory and the source
			// directory, so we only need to add a total of 9 directories to get one too many.
			isDirSpy.mockReturnValueOnce(true) // subdirectory is a directory
			for (let count = 1; count <= 8; count++) {
				readdirSyncMock.mockReturnValueOnce(['subdirectory'])
				isDirSpy.mockReturnValueOnce(true)
			}

			expect(() => processSrcDir('project dir', zipMock, []))
				.toThrow(new Errors.CLIError(`drivers directory nested too deeply (at src dir${'/subdirectory'.repeat(9)}); max depth is 10`))

			expect(requireDirSpy).toHaveBeenCalledTimes(1)
			expect(requireDirSpy).toHaveBeenCalledWith('project dir/src')
			expect(isFileSpy).toHaveBeenCalledTimes(1)
			expect(isFileSpy).toHaveBeenCalledWith('src dir/init.lua')
			expect(readdirSyncMock).toHaveBeenCalledTimes(9)
			expect(isDirSpy).toHaveBeenCalledTimes(10)
			expect(isDirSpy).toHaveBeenCalledWith('src dir/init.lua')
			for (let count = 0; count <= 8; count++) {
				expect(readdirSyncMock).toHaveBeenCalledWith(`src dir${'/subdirectory'.repeat(count)}`)
				expect(isDirSpy).toHaveBeenCalledWith(`src dir${'/subdirectory'.repeat(count + 1)}`)
			}
			expect(zipFileMock).toHaveBeenCalledTimes(1)
			expect(zipFileMock).toHaveBeenCalledWith('src/init.lua', readStreamMock)
		})
	})

	describe('processProfiles', () => {
		readYAMLFileSpy.mockReturnValue({})

		it('adds nothing with no profiles', () => {
			requireDirSpy.mockReturnValueOnce('profiles dir')
			readdirSyncMock.mockReturnValueOnce([])

			expect(() => processProfiles('project dir', zipMock)).not.toThrow()

			expect(requireDirSpy).toHaveBeenCalledTimes(1)
			expect(requireDirSpy).toHaveBeenCalledWith('project dir/profiles')
			expect(readdirSyncMock).toHaveBeenCalledTimes(1)
			expect(readdirSyncMock).toHaveBeenCalledWith('profiles dir')
			expect(readYAMLFileSpy).toHaveBeenCalledTimes(0)
			expect(createReadStreamMock).toHaveBeenCalledTimes(0)
			expect(zipFileMock).toHaveBeenCalledTimes(0)
		})

		it('adds yaml files with .yml extension', () => {
			requireDirSpy.mockReturnValueOnce('profiles dir')
			readdirSyncMock.mockReturnValueOnce(['profile1.yml', 'profile2.yml'])
			createReadStreamMock.mockReturnValueOnce(readStreamMock)

			expect(() => processProfiles('project dir', zipMock)).not.toThrow()

			expect(requireDirSpy).toHaveBeenCalledTimes(1)
			expect(requireDirSpy).toHaveBeenCalledWith('project dir/profiles')
			expect(readdirSyncMock).toHaveBeenCalledTimes(1)
			expect(readdirSyncMock).toHaveBeenCalledWith('profiles dir')
			expect(readYAMLFileSpy).toHaveBeenCalledTimes(2)
			expect(readYAMLFileSpy).toHaveBeenCalledWith('profiles dir/profile1.yml')
			expect(readYAMLFileSpy).toHaveBeenCalledWith('profiles dir/profile2.yml')
			expect(createReadStreamMock).toHaveBeenCalledTimes(2)
			expect(createReadStreamMock).toHaveBeenCalledWith('profiles dir/profile1.yml')
			expect(createReadStreamMock).toHaveBeenCalledWith('profiles dir/profile2.yml')
			expect(zipFileMock).toHaveBeenCalledTimes(2)
			expect(zipFileMock).toHaveBeenCalledWith('profiles/profile1.yml', readStreamMock)
			expect(zipFileMock).toHaveBeenCalledWith('profiles/profile2.yml', readStreamMock)
		})

		it('adds yaml files with .yaml extension as .yml', () => {
			requireDirSpy.mockReturnValueOnce('profiles dir')
			readdirSyncMock.mockReturnValueOnce(['profile.yaml'])
			createReadStreamMock.mockReturnValueOnce(readStreamMock)

			expect(() => processProfiles('project dir', zipMock)).not.toThrow()

			expect(requireDirSpy).toHaveBeenCalledTimes(1)
			expect(requireDirSpy).toHaveBeenCalledWith('project dir/profiles')
			expect(readdirSyncMock).toHaveBeenCalledTimes(1)
			expect(readdirSyncMock).toHaveBeenCalledWith('profiles dir')
			expect(readYAMLFileSpy).toHaveBeenCalledTimes(1)
			expect(readYAMLFileSpy).toHaveBeenCalledWith('profiles dir/profile.yaml')
			expect(createReadStreamMock).toHaveBeenCalledTimes(1)
			expect(createReadStreamMock).toHaveBeenCalledWith('profiles dir/profile.yaml')
			expect(zipFileMock).toHaveBeenCalledTimes(1)
			expect(zipFileMock).toHaveBeenCalledWith('profiles/profile.yml', readStreamMock)
		})

		it('throws exception for non-yaml files in profiles directory', () => {
			requireDirSpy.mockReturnValueOnce('profiles dir')
			readdirSyncMock.mockReturnValueOnce(['profile.exe'])

			expect(() => processProfiles('project dir', zipMock))
				.toThrow(new Errors.CLIError('invalid profile file "profiles dir/profile.exe" (must have .yaml or .yml extension)'))

			expect(requireDirSpy).toHaveBeenCalledTimes(1)
			expect(requireDirSpy).toHaveBeenCalledWith('project dir/profiles')
			expect(readdirSyncMock).toHaveBeenCalledTimes(1)
			expect(readdirSyncMock).toHaveBeenCalledWith('profiles dir')
			expect(readYAMLFileSpy).toHaveBeenCalledTimes(0)
			expect(createReadStreamMock).toHaveBeenCalledTimes(0)
			expect(zipFileMock).toHaveBeenCalledTimes(0)
		})
	})
})
