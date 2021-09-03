import fs from 'fs'

import PackageCommand, { findYAMLFilename, isDir, isFile, requireDir } from '../../../../../src/commands/edge/drivers/package'


jest.mock('fs', () => {
	return {
		existsSync: jest.fn(),
		lstatSync: jest.fn(),
		readFileSync: jest.fn(),
		readdirSync: jest.fn(),
		createReadStream: jest.fn(),
		createWriteStream: jest.fn(),
	}
})
jest.mock('yaml', () => {
	return {
		safeLoad: jest.fn(),
	}
})

describe('package', () => {
	const existsSyncMock = fs.existsSync as unknown as jest.Mock<boolean, [fs.PathLike]>
	const lstatSyncMock = fs.lstatSync as unknown as jest.Mock<fs.Stats, [fs.PathLike]>
	const readFileSyncMock = fs.readFileSync as unknown as jest.Mock<string, [fs.PathLike]>
	const readdirSyncMock = fs.readdirSync as unknown as jest.Mock<string[], [fs.PathLike]>
	const createReadStreamMock = fs.createReadStream as unknown as jest.Mock<fs.ReadStream, [fs.PathLike]>

	afterEach(() => {
		jest.clearAllMocks()
	})

	const mockExistsAndIsFile = (): void => {
		existsSyncMock.mockReturnValueOnce(true)
		const statsIsFileMock = jest.fn().mockReturnValueOnce(true)
		lstatSyncMock.mockReturnValueOnce({ isFile: statsIsFileMock } as unknown as fs.Stats)
	}

	const mockExistsAndIsDirectory = (): void => {
		existsSyncMock.mockReturnValueOnce(true)
		const statsIsDirectoryMock = jest.fn().mockReturnValueOnce(true)
		lstatSyncMock.mockReturnValueOnce({ isDirectory: statsIsDirectoryMock } as unknown as fs.Stats)
	}

	describe('isFile', () => {
		it('returns false if does not exist', () => {
			existsSyncMock.mockReturnValue(false)

			expect(isFile('non-existent.stl')).toBe(false)

			expect(existsSyncMock).toHaveBeenCalledTimes(1)
			expect(existsSyncMock).toHaveBeenCalledWith('non-existent.stl')
			expect(lstatSyncMock).toHaveBeenCalledTimes(0)
		})

		it('returns false if exists but is not a file', () => {
			existsSyncMock.mockReturnValue(true)
			const statsIsFileMock = jest.fn().mockReturnValue(false)
			lstatSyncMock.mockReturnValue({ isFile: statsIsFileMock } as unknown as fs.Stats)

			expect(isFile('directory')).toBe(false)

			expect(existsSyncMock).toHaveBeenCalledTimes(1)
			expect(existsSyncMock).toHaveBeenCalledWith('directory')
			expect(lstatSyncMock).toHaveBeenCalledTimes(1)
			expect(lstatSyncMock).toHaveBeenCalledWith('directory')
		})

		it('returns true if exists and is a file', () => {
			mockExistsAndIsFile()

			expect(isFile('file')).toBe(true)

			expect(existsSyncMock).toHaveBeenCalledTimes(1)
			expect(existsSyncMock).toHaveBeenCalledWith('file')
			expect(lstatSyncMock).toHaveBeenCalledTimes(1)
			expect(lstatSyncMock).toHaveBeenCalledWith('file')
		})
	})

	describe('isDir', () => {
		const existsSyncMock = fs.existsSync as unknown as jest.Mock<boolean, [fs.PathLike]>
		const lstatSyncMock = fs.lstatSync as unknown as jest.Mock<fs.Stats, [fs.PathLike]>

		it('returns false if does not exist', () => {
			existsSyncMock.mockReturnValue(false)

			expect(isDir('non-existent')).toBe(false)

			expect(existsSyncMock).toHaveBeenCalledTimes(1)
			expect(existsSyncMock).toHaveBeenCalledWith('non-existent')
			expect(lstatSyncMock).toHaveBeenCalledTimes(0)
		})

		it('returns false if exists but is not a directory', () => {
			existsSyncMock.mockReturnValue(true)
			const statsIsDirectoryMock = jest.fn().mockReturnValue(false)
			lstatSyncMock.mockReturnValue({ isDirectory: statsIsDirectoryMock } as unknown as fs.Stats)

			expect(isDir('file')).toBe(false)

			expect(existsSyncMock).toHaveBeenCalledTimes(1)
			expect(existsSyncMock).toHaveBeenCalledWith('file')
			expect(lstatSyncMock).toHaveBeenCalledTimes(1)
			expect(lstatSyncMock).toHaveBeenCalledWith('file')
		})

		it('returns true if exists and is a directory', () => {
			mockExistsAndIsDirectory()

			expect(isDir('directory')).toBe(true)

			expect(existsSyncMock).toHaveBeenCalledTimes(1)
			expect(existsSyncMock).toHaveBeenCalledWith('directory')
			expect(lstatSyncMock).toHaveBeenCalledTimes(1)
			expect(lstatSyncMock).toHaveBeenCalledWith('directory')
		})
	})

	describe('findYAMLFilename', () => {
		it('returns filename with yaml extension if that is found', () => {
			mockExistsAndIsFile()

			expect(findYAMLFilename('filename')).toBe('filename.yaml')
		})

		it('returns filename with yml extension if that is found', () => {
			existsSyncMock.mockReturnValueOnce(false)
			mockExistsAndIsFile()

			expect(findYAMLFilename('filename')).toBe('filename.yml')
		})

		it('returns false when no matching file found', () => {
			existsSyncMock.mockReturnValue(false)

			expect(findYAMLFilename('filename')).toBe(false)
		})
	})

	describe('requireDir', () => {
		it('returns directory when it exists and is a directory', () => {
			mockExistsAndIsDirectory()

			expect(requireDir('my-dir')).toBe('my-dir')
		})

		it('throws exception when directory does not exist', () => {
			existsSyncMock.mockReturnValue(false)
			expect(() => requireDir('not-a-dir')).toThrow()
		})
	})

	// project directory with and without slash
	// project directory default
	describe.skip('PackageCommand', () => {
		const readStreamMock: fs.ReadStream = {} as fs.ReadStream
		it('generates zip file with --build-only', async () => {
			// getProjectDirectory
			mockExistsAndIsDirectory()

			// processConfigFile
			mockExistsAndIsFile()
			readFileSyncMock.mockReturnValue('key:\n  value')
			createReadStreamMock.mockReturnValue(readStreamMock)
			// zipFileMock.mockReturnValue()

			// processSrcDir
			mockExistsAndIsDirectory() // src
			mockExistsAndIsFile() // init.lua
			readdirSyncMock.mockReturnValueOnce([])

			await expect(PackageCommand.run(['--build-only', 'driver.zip'])).resolves.not.toThrow()

			expect(existsSyncMock).toHaveBeenCalledTimes(1)
			expect(existsSyncMock).toHaveBeenCalledWith('.')
		})
	})
})
